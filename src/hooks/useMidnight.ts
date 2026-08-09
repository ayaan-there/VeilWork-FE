import { useCallback, useEffect, useRef, useState } from 'react';
import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import type { UnboundTransaction } from '@midnight-ntwrk/midnight-js-types';
import { toHex, fromHex } from '@midnight-ntwrk/midnight-js-utils';
import { Binding, Proof, SignatureEnabled, Transaction, type FinalizedTransaction, type TransactionId } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { InitialAPI, ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import semver from 'semver';
import { firstValueFrom, interval, map, filter, take, timeout, concatMap, catchError, throwError } from 'rxjs';
import { pipe } from 'fp-ts/function';
import pino from 'pino';
import { ContractState as CompactContractState } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { inMemoryPrivateStateProvider } from '../lib/in-memory-private-state-provider';
import {
  compiledCounterContract,
  COUNTER_PRIVATE_STATE_ID,
  CounterModule,
  type CounterPrivateState,
} from '../lib/counter-contract';

const INDEXER_GRAPHQL_URL =
  (import.meta.env.VITE_INDEXER_URL as string | undefined) ||
  'https://indexer.preprod.midnight.network/api/v4/graphql';

const CONTRACT_STATE_QUERY = `
  query ContractState($address: HexEncoded!) {
    contractAction(address: $address) {
      state
    }
  }
`;

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

const fetchCountFromIndexer = async (contractAddress: string): Promise<bigint | null> => {
    try {
      const res = await fetch(INDEXER_GRAPHQL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: CONTRACT_STATE_QUERY,
          variables: { address: contractAddress },
        }),
      });
      const gql = await res.json();
      if (gql.errors) throw new Error(gql.errors[0]?.message ?? 'Indexer query failed');
      const stateHex = gql?.data?.contractAction?.state;
      if (!stateHex) {
        console.warn('[useMidnight] No state in indexer response');
        return null;
      }
      const contractState = CompactContractState.deserialize(hexToBytes(stateHex));
      // contractState.data is the ChargedState; ledger() expects a StateValue or ChargedState
      const ledgerState = CounterModule.ledger(contractState.data);
      return BigInt(ledgerState.count);
    } catch (e: any) {
      console.warn('[useMidnight] Indexer read failed:', e?.message ?? e);
      return null;
    }
  };

const COMPATIBLE_CONNECTOR_API_VERSION = '4.x';
const WALLET_DETECT_INTERVAL_MS = 100;
const WALLET_DETECT_TIMEOUT_MS = 5_000;
const WALLET_CONNECT_TIMEOUT_MS = 60_000;

type WalletState = 'detecting' | 'no-wallet' | 'ready' | 'connecting' | 'connected';

type Providers = {
  privateStateProvider: ReturnType<typeof inMemoryPrivateStateProvider>;
  zkConfigProvider: FetchZkConfigProvider<string>;
  proofProvider: ReturnType<typeof httpClientProofProvider>;
  publicDataProvider: ReturnType<typeof indexerPublicDataProvider>;
  walletProvider: {
    getCoinPublicKey: () => string;
    getEncryptionPublicKey: () => string;
    balanceTx: (tx: UnboundTransaction) => Promise<FinalizedTransaction>;
  };
  midnightProvider: {
    submitTx: (tx: FinalizedTransaction) => Promise<TransactionId>;
  };
};

const logger = pino({ level: 'info', name: 'veilwork-dapp' });

const getNetworkId = (): string => {
  const v = import.meta.env.VITE_NETWORK_ID as string | undefined;
  return (v && v.trim()) || 'preview';
};

const getDefaultContractAddress = (): string | null => {
  const v = import.meta.env.VITE_DEFAULT_CONTRACT as string | undefined;
  if (!v || !v.trim() || /^PLACEHOLDER/i.test(v)) return null;
  return v.trim();
};

const getFirstCompatibleWallet = (): InitialAPI | undefined => {
  const g = globalThis as any;
  if (!g.window?.midnight && !(globalThis as any).midnight) return undefined;
  const midnight = ((globalThis as any).window?.midnight) ?? ((globalThis as any).midnight);
  if (!midnight) return undefined;
  return Object.values(midnight).find(
    (wallet): wallet is InitialAPI =>
      !!wallet &&
      typeof wallet === 'object' &&
      'apiVersion' in wallet &&
      semver.satisfies((wallet as any).apiVersion, COMPATIBLE_CONNECTOR_API_VERSION),
  ) as InitialAPI | undefined;
};

const connectToWallet = (netId: string): Promise<ConnectedAPI> =>
  firstValueFrom(
    pipe(
      interval(WALLET_DETECT_INTERVAL_MS),
      map(() => getFirstCompatibleWallet()),
      filter((api): api is InitialAPI => !!api),
      take(1),
      timeout({
        first: WALLET_DETECT_TIMEOUT_MS,
        with: () => throwError(() => new Error('No compatible Midnight wallet detected. Install Lace wallet.')),
      }),
      concatMap(async (initialAPI) => {
        console.log('[useMidnight] Calling initialAPI.connect() with networkId:', netId);
        console.log('[useMidnight] Wallet apiVersion:', (initialAPI as any).apiVersion);
        console.log('[useMidnight] Wallet name:', (initialAPI as any).name);
        const connected = await initialAPI!.connect(netId);
        console.log('[useMidnight] connect() succeeded');
        try {
          const status = await (connected as any).getConnectionStatus?.();
          console.log('[useMidnight] getConnectionStatus() returned:', JSON.stringify(status));
        } catch (e) {
          console.log('[useMidnight] getConnectionStatus() threw:', e);
        }
        return connected as ConnectedAPI;
      }),
      timeout({
        first: WALLET_CONNECT_TIMEOUT_MS,
        with: () => throwError(() => new Error('Lace wallet did not respond to connect request.')),
      }),
      catchError((error) =>
        throwError(() =>
          error instanceof Error ? error : new Error(String(error ?? 'Wallet not authorized')),
        ),
      ),
    ),
  );

const initializeProviders = async (
  connectedAPI: ConnectedAPI,
): Promise<Providers> => {
  const networkId = getNetworkId();
  setNetworkId(networkId);
  const config = await connectedAPI.getConfiguration();
  console.log('[useMidnight] Lace config:', JSON.stringify({ 
    indexerUri: config.indexerUri, 
    indexerWsUri: config.indexerWsUri, 
    proverServerUri: config.proverServerUri, 
    substrateNodeUri: (config as any).substrateNodeUri,
    networkId: (config as any).networkId 
  }));
  let proofServerUri = config.proverServerUri;
  const LOCAL_PROVER = 'http://127.0.0.1:6300';
  if (proofServerUri && proofServerUri.includes('proof-server.preprod.midnight.network')) {
    console.warn('[useMidnight] Lace returned remote proof server:', proofServerUri);
    console.warn('[useMidnight] Overriding to local Docker proof server:', LOCAL_PROVER);
    proofServerUri = LOCAL_PROVER;
  }
  if (!proofServerUri) {
    console.warn('[useMidnight] No proverServerUri, using local fallback');
    proofServerUri = LOCAL_PROVER;
  }
  const shieldedAddresses = await connectedAPI.getShieldedAddresses();
  const zkConfigProvider = new FetchZkConfigProvider<string>(
    window.location.origin,
    fetch.bind(window),
  );

  const privateStateProvider = inMemoryPrivateStateProvider<string, CounterPrivateState>();

  const walletProvider = {
    getCoinPublicKey: () => shieldedAddresses.shieldedCoinPublicKey,
    getEncryptionPublicKey: () => shieldedAddresses.shieldedEncryptionPublicKey,
    balanceTx: async (tx: UnboundTransaction): Promise<FinalizedTransaction> => {
      try {
        const serializedTx = toHex(tx.serialize());
        const received = await connectedAPI.balanceUnsealedTransaction(serializedTx);
        return Transaction.deserialize<SignatureEnabled, Proof, Binding>(
          'signature',
          'proof',
          'binding',
          fromHex(received.tx),
        );
      } catch (e: any) {
        const msg = e?.message ?? String(e);
        const details = e?.data ? ` data=${JSON.stringify(e.data)}` : '';
        console.error('[useMidnight] balanceTx via Lace failed:', msg + details);
        if (e?.stack) console.error(e.stack);
        logger.error({ error: e }, 'balanceTx via wallet failed');
        throw e;
      }
    },
  };

  const midnightProvider = {
    submitTx: async (tx: FinalizedTransaction): Promise<TransactionId> => {
      await connectedAPI.submitTransaction(toHex(tx.serialize()));
      const ids = tx.identifiers();
      return ids[0];
    },
  };

  return {
    privateStateProvider,
    zkConfigProvider,
    proofProvider: httpClientProofProvider(proofServerUri, zkConfigProvider),
    publicDataProvider: indexerPublicDataProvider(config.indexerUri, config.indexerWsUri),
    walletProvider,
    midnightProvider,
  };
};

export interface UseMidnightReturn {
  walletState: WalletState;
  address: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  count: bigint | null;
  increment: () => Promise<void>;
  decrement: () => Promise<void>;
  reset: () => Promise<void>;
  refreshCount: () => Promise<void>;
  loading: boolean;
  result: string | null;
  error: string | null;
  clearError: () => void;
}

export function useMidnight(): UseMidnightReturn {
  const [walletState, setWalletState] = useState<WalletState>('detecting');
  const [address, setAddress] = useState<string | null>(null);
  const [count, setCount] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connectedAPIRef = useRef<ConnectedAPI | null>(null);
  const providersRef = useRef<Providers | null>(null);
  const foundContractRef = useRef<any>(null);
  const walletStateRef = useRef<WalletState>('detecting');

  const fetchOwnerSecret = (): Uint8Array => {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('veilwork:counterSecretKey');
      if (stored) {
        try {
          const hex = stored.trim();
          if (/^[0-9a-fA-F]{64}$/.test(hex)) {
            return Uint8Array.from(Buffer.from(hex, 'hex'));
          }
        } catch { /* ignore */ }
      }
    }
    // Owner secret used at deployment time for the Preprod counter
    // (see mn-demo .midnight-state.json counterDeployment.ownerSecret).
    const defaultSecret = Uint8Array.from(
      Buffer.from('5aed9628dcc2e7fea44dbceb6a901a432ef8749e0dacc7e952924b806f75f625', 'hex'),
    );
    try {
      localStorage.setItem('veilwork:counterSecretKey', Buffer.from(defaultSecret).toString('hex'));
    } catch { /* ignore */ }
    return defaultSecret;
  };

  useEffect(() => {
    walletStateRef.current = walletState;
  }, [walletState]);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const detect = () => {
      if (cancelled) return;
      if (walletStateRef.current === 'connecting' || walletStateRef.current === 'connected') return;
      const wallet = getFirstCompatibleWallet();
      if (wallet) {
        if (cancelled) return;
        setWalletState('ready');
        return;
      }
      const elapsed = Date.now();
      if (!timeoutId) {
        timeoutId = setTimeout(() => {
          if (cancelled) return;
          const w = getFirstCompatibleWallet();
          if (w) {
            setWalletState('ready');
          } else {
            setWalletState('no-wallet');
          }
        }, WALLET_DETECT_TIMEOUT_MS);
      }
    };

    detect();
    const intervalId = setInterval(detect, 333);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const connect = useCallback(async () => {
    if (walletState === 'connecting' || walletState === 'connected') return;
    setError(null);
    setWalletState('connecting');
    try {
      const netId = getNetworkId();
      const connected = await connectToWallet(netId);
      connectedAPIRef.current = connected;
      const unshielded = await connected.getUnshieldedAddress();
      const addr = (unshielded as any)?.unshieldedAddress ?? '(unknown address)';
      setAddress(addr);
      setWalletState('connected');
      const providers = await initializeProviders(connected);
      providersRef.current = providers;

      const contractAddress = getDefaultContractAddress();
      if (!contractAddress) {
        setError('No contract address configured. Set VITE_DEFAULT_CONTRACT after deploying to Preprod.');
        return;
      }
      const secret = fetchOwnerSecret();
      const initialPrivateState: CounterPrivateState = { secretKey: secret };

      const found = await findDeployedContract(providers as any, {
        compiledContract: compiledCounterContract as any,
        contractAddress,
        privateStateId: COUNTER_PRIVATE_STATE_ID,
        initialPrivateState: initialPrivateState as any,
      });
      foundContractRef.current = found;

      try {
        const initialCount = await fetchCountFromIndexer(contractAddress);
        setCount(initialCount);
      } catch {
        setCount(null);
      }
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      setError(msg);
      setWalletState('ready');
      setAddress(null);
      connectedAPIRef.current = null;
      providersRef.current = null;
      foundContractRef.current = null;
    }
  }, [walletState]);

  const disconnect = useCallback(() => {
    connectedAPIRef.current = null;
    providersRef.current = null;
    foundContractRef.current = null;
    setAddress(null);
    setCount(null);
    setResult(null);
    setError(null);
    setWalletState('ready');
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const runCircuit = useCallback(async (name: 'increment' | 'decrement' | 'reset') => {
    const contract = foundContractRef.current;
    if (!contract) {
      setError('Contract not loaded. Connect wallet first.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const finalized = await contract.callTx[name]();
      const txId = finalized?.public?.txId;
      const block = finalized?.public?.blockHeight;
      setResult(`txId=${txId ?? ''}${block != null ? ` block=${block}` : ''}`);
      try {
        const addr = getDefaultContractAddress();
        if (addr) {
          const newCount = await fetchCountFromIndexer(addr);
          if (newCount != null) setCount(newCount);
        }
      } catch { /* ignore read failure after tx */ }
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      setError(`Circuit "${name}" failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const increment = useCallback(() => runCircuit('increment'), [runCircuit]);
  const decrement = useCallback(() => runCircuit('decrement'), [runCircuit]);
  const reset = useCallback(() => runCircuit('reset'), [runCircuit]);

  const refreshCount = useCallback(async () => {
    const contractAddress = getDefaultContractAddress();
    if (!contractAddress) {
      setError('No contract address configured.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const newCount = await fetchCountFromIndexer(contractAddress);
      if (newCount != null) {
        setCount(newCount);
        setError(null);
      } else {
        setError('Could not read count from indexer.');
      }
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      setError(`refresh failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    walletState,
    address,
    connect,
    disconnect,
    count,
    increment,
    decrement,
    reset,
    refreshCount,
    loading,
    result,
    error,
    clearError,
  };
}

export default useMidnight;
