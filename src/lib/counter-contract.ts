import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import {
  Contract,
  ledger,
  pureCircuits,
  contractReferenceLocations,
} from '../contracts/counter/index.js';

export type CounterPrivateState = { secretKey: Uint8Array };

export const CounterModule = {
  Contract,
  ledger,
  pureCircuits,
  contractReferenceLocations,
};

export const compiledCounterContract = CompiledContract.make('counter', Contract);

export const COUNTER_PRIVATE_STATE_ID = 'counterPrivateState';
