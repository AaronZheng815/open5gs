import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import type { MetricSample, MetricSnapshot } from '@open5gs/shared';
import { KNOWN_NF_TYPES, loadInventory } from '../asset/inventory.loader';
import { parseMetrics } from './metrics.parser';
import { fetchInfoPages, httpGetText } from './info-api.client';

/** 网元 :9090 端口（EV-004 metrics / EV-003 Info API）。 */
export const METRICS_PORT = 9090;

/** 支持 Info API 的网元与其读取路径（AMF/SMF/MME，无参端点；pdu-info 需 IMSI 故降级跳过）。 */
const INFO_PATHS: Record<string, string[]> = {
  amf: ['gnb-info', 'ue-info'],
  smf: ['ue-info'],
  mme: ['enb-info', 'ue-info'],
};

@Injectable()
export class MonitorService {
  constructor(
    @Optional() private readonly getText: (h: string, p: number, path: string) => Promise<string> = httpGetText,
  ) {}

  /** AC-11：抓取 :9090/metrics 关键指标快照；Info API 网元叠加 info；不可用降级返回 available=false（不 500）。 */
  async snapshot(nfId: string, configDir?: string): Promise<MetricSnapshot> {
    if (!KNOWN_NF_TYPES.includes(nfId)) throw new NotFoundException(`未知网元：${nfId}`);
    const asset = loadInventory(configDir).find((a) => a.id === nfId);
    const addr = asset?.addr;

    const metrics: MetricSample[] = [];
    if (addr) {
      try {
        const text = await this.getText(addr, METRICS_PORT, '/metrics');
        metrics.push(...parseMetrics(text));
      } catch {
        // :9090 未开启 → 降级，metrics=[] 不抛错（AC-11 判定②）
      }
    }

    const info = await this.buildInfo(nfId, addr);
    const available = metrics.length > 0 || Object.keys(info ?? {}).length > 0;
    return { nfId, available, metrics, ...(info ? { info } : {}) };
  }

  /** Info 分支：逐页读取各信息端点，失败降级跳过，返回 { 端点: items }。 */
  private async buildInfo(nfId: string, addr?: string): Promise<Record<string, unknown> | undefined> {
    const paths = INFO_PATHS[nfId];
    if (!addr || !paths) return undefined;
    const info: Record<string, unknown> = {};
    for (const path of paths) {
      try {
        const items = await fetchInfoPages(addr, METRICS_PORT, `/${path}`, this.getText);
        info[path] = items;
      } catch {
        // 单个信息端点不可用（如 pdu-info 需 IMSI）→ 跳过
      }
    }
    return Object.keys(info).length > 0 ? info : undefined;
  }
}
