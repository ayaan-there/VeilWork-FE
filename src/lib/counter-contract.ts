import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import * as CounterModule from '@counter';

export type CounterPrivateState = { secretKey: Uint8Array };

const witnesses = {
  secretKey: ({ privateState }: any): [CounterPrivateState, Uint8Array] => {
    return [privateState, privateState.secretKey];
  },
};

export const compiledCounterContract = CompiledContract.make(
  'counter',
  CounterModule.Contract,
).pipe(CompiledContract.withWitnesses(witnesses));

export const COUNTER_PRIVATE_STATE_ID = 'counterPrivateState';

export { CounterModule };
