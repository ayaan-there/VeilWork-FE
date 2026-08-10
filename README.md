# VeilWork — Midnight Builder Challenge L2 (Waxing Crescent)

> Privacy-first bounty platform on Midnight. Powered by the counter circuit on preprod.
> L2 submission for the **New Moon to Full** bootcamp.

**Live site:** https://veil-work-fe.vercel.app

## What this delivers

End-to-end wire-up of the Level 1 counter contract into a browser DApp:

1. **Lace wallet** (Midnight DApp Connector API 4.0.1) via `window.midnight`.
2. **Counter state from indexer** — `contractState.data` (`ChargedState`) is fed to `CounterModule.ledger(...)` to deserialize on-chain count without spending tNIGHT.
3. **Circuit calls on-chain** — `increment`, `decrement`, `reset` each:
   - Serializes a `UnboundTransaction` from `compiledCounterContract`,
   - Generates a ZK proof from a local Docker proof-server (`http://127.0.0.1:6300`),
   - Balances with the connected Lace wallet and submits to preprod (`wss://rpc.preprod.midnight.network`).
4. **Proof-server override** — Lace returns a remote proof-server URL; we override it with `http://127.0.0.1:6300` so proofs stay on the developer machine.

## Environment

| Variable | Value |
| --- | --- |
| `VITE_NETWORK_ID` | `preprod` |
| `VITE_DEFAULT_CONTRACT` | `aa061ea362bd953e42e95a05d10c44cfe6206b6e7c44fb7bf1cb7dd8095c77b8` |
| `VITE_INDEXER_URL` | `https://indexer.preprod.midnight.network/api/v4/graphql` |

Local proof-server: `docker compose up` of Midnight's `ghcr.io/midnight-ntwrk/proof-server` on `:6300`.

## Manual demo trail (≤ 3 minutes)

1. Open https://veil-work-fe.vercel.app.
2. Click **Connect Wallet** → choose **Lace** → approve in extension (preprod network).
3. UI shows shielded coin + encryption public keys in the console. Counter state is read from the indexer on first poll (every 15 seconds).
4. Click **Increment**. Lace prompts for signature. Wait ~15 s for inclusion.
5. Counter display refreshes on the next indexer poll with the new value.
6. Optional: **Decrement** and **Reset** follow the same path.

## Files of interest

- `src/hooks/useMidnight.ts` — Lace connect, indexer read, balanceTx, submit. Owner secret persisted to `localStorage["veilwork:counterSecretKey"]` from the Level 1 deploy secret.
- `src/lib/counter-contract.ts` — `CounterModule` witness providers; `withWitnesses` pipes secret from localStorage into circuit proofs.
- `src/App.tsx` — UI shell; wallet button + circuit call panel.
- `src/components/` — `WalletConnect`, `CircuitCall`.
- `src/contracts/counter/index.js` — Level 1 Compact-compiled contract (committed for read-side type alignment).
- `public/keys/`, `public/zkir/` — circuit keys served alongside the SPA so the browser can fetch them at runtime.
- `vercel.json` — SPA fallback + headers.

## Verifying on-chain

After you Increment, copy the txId Lace prints to the console and search it on:

- https://preprod.midnightexplorer.com/

Or query the indexer directly:

```graphql
query ContractState($address: HexEncoded!) {
  contractAction(address: $address) { state }
}
```

with `address = aa061ea362bd953e42e95a05d10c44cfe6206b6e7c44fb7bf1cb7dd8095c77b8`.

## About the product vision

VeilWork is shaping into an anonymous HackerOne-style bounty platform. Today it
exposes the Level 1 counter circuit so a maintainer can prove ownership of a
bounty contract without revealing their identity on-chain. Each circuit call
produces a fresh ZK proof that the caller holds the deployer secret, while the
chain only sees the count change.

## Level 1 reference

Smart contract source and Compact build live in a separate repo:
https://github.com/ayaan-there/mn-demo
