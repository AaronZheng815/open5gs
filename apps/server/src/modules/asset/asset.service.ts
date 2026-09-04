import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { NfAsset, NfAssetList } from '@open5gs/shared';
import { loadInventory, resolveConfigDir } from './inventory.loader';
import { discoverNfs, getNrfUrl, type DiscoveredNf, type NrfTransport } from './discovery.client';

const CACHE_TTL_MS = 30_000;
const NRF_ERROR_PREFIX = 'NRF 不可达';

@Injectable()
export class AssetService {
  private cache: { at: number; nrfUrl: string; value: DiscoveredNf[] } | null = null;

  /**
   * AC-8：纯本地配置清单资产模型，不依赖 NRF。
   * 资产主表 = 本地清单（决策 2.3），status 先置 unknown，留给 NRF 叠加。
   */
  listInventory(configDir?: string): NfAssetList {
    const items = loadInventory(configDir ?? resolveConfigDir());
    return { items, total: items.length };
  }

  /**
   * AC-1/AC-7：本地清单为根 + NRF 在线叠加。
   * NRF 可达 → 已注册网元 online、预期但缺网元 expected:true；
   * NRF 不可达 → 抛 ServiceUnavailableException（503，body 含原因）。
   */
  async listNfs(opts: { configDir?: string; nrfUrl?: string; transport?: NrfTransport; nfTypes?: string[] } = {}): Promise<NfAssetList> {
    const nrfUrl = opts.nrfUrl ?? getNrfUrl();
    const discovered = await this.discover(nrfUrl, opts.transport, opts.nfTypes);
    const inventory = loadInventory(opts.configDir ?? resolveConfigDir());

    const byType = new Map<string, DiscoveredNf>();
    for (const nf of discovered) if (!byType.has(nf.nfType)) byType.set(nf.nfType, nf);

    const items: NfAsset[] = inventory.map((base) => {
      const found = byType.get(base.nfType);
      if (found) {
        return {
          ...base,
          status: 'online',
          instanceId: found.instanceId ?? base.instanceId,
          sbi: found.fqdn ?? base.sbi,
        };
      }
      return { ...base, status: 'offline', expected: true };
    });

    // 并集兜底（决策 2.3 回退路径 C）：NRF 注册但不在本地清单的网元补进来。
    for (const nf of byType.values()) {
      if (!inventory.some((i) => i.nfType === nf.nfType)) {
        items.push({
          id: nf.nfType,
          nfType: nf.nfType,
          addr: nf.addresses[0] ?? '',
          instanceId: nf.instanceId,
          sbi: nf.fqdn,
          status: 'online',
        });
      }
    }

    return { items, total: items.length };
  }

  /** 30s 内缓存 NRF 发现结果，降低逐次直连 NRF 的往返（§10 P99 < 2s）。 */
  private async discover(nrfUrl: string, transport?: NrfTransport, nfTypes?: string[]): Promise<DiscoveredNf[]> {
    if (this.cache && this.cache.nrfUrl === nrfUrl && Date.now() - this.cache.at < CACHE_TTL_MS) {
      return this.cache.value;
    }
    try {
      const value = await discoverNfs({ nrfUrl, transport, nfTypes });
      this.cache = { at: Date.now(), nrfUrl, value };
      return value;
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new ServiceUnavailableException(`${NRF_ERROR_PREFIX}：${reason}`);
    }
  }
}
