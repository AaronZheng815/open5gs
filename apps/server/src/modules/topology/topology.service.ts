import { Injectable } from '@nestjs/common';
import type { NfAsset, TopologyGraph } from '@open5gs/shared';
import { loadInventory, ROLE_LABELS } from '../asset/inventory.loader';
import { edgeList } from './edges.map';

@Injectable()
export class TopologyService {
  /** AC-9：构建网元拓扑图。节点来自资产清单（id/nfType/label=ROLE_LABELS），边来自 EDGES 映射且两端都在清单中。 */
  buildTopology(configDir?: string): TopologyGraph {
    const assets: NfAsset[] = loadInventory(configDir);
    const nodes = assets.map((asset) => ({
      id: asset.id,
      nfType: asset.nfType,
      label: ROLE_LABELS[asset.nfType] ?? asset.nfType,
    }));
    const present = new Set(assets.map((a) => a.id));
    return { nodes, edges: edgeList(present) };
  }
}
