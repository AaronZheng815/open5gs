import type { NfAsset } from '@open5gs/shared';

const PLACEHOLDER_ASSET: NfAsset = { id: 'x', nfType: 'NMS', addr: 'a', status: 'unknown' };

export function App() {
  return <div>NMS Console scaffolding {PLACEHOLDER_ASSET.nfType}</div>;
}
