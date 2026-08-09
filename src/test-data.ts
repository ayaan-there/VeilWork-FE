import { ContractState as CompactContractState } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  return bytes;
}

const testHex = '6d69646e696768743a636f6e74726163742d73746174655b76365d3aac00906001fe0235b52b9510df49cba4e3de1a41a0e925143bc1c9a0dc601ff8bd4c280c472001040004010008400804080401040c080104000801080414040104180801040004004020101c2020202020202020202020202008020808042408040c04280403042c';

try {
  const cs = CompactContractState.deserialize(hexToBytes(testHex));
  console.log('deserialized:', typeof cs);
  console.log('keys:', Object.keys(cs));
  console.log('data:', cs.data);
  console.log('data type:', typeof cs.data);
  console.log('data constructor:', (cs.data as any)?.constructor?.name);
  console.log('data instanceof checks...');
  console.log('has .state?', 'state' in (cs.data || {}));
  console.log('data.value?', (cs.data as any)?.value);
} catch (e: any) {
  console.error('deserialize error:', e);
}
