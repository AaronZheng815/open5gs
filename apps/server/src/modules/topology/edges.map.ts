import type { TopologyEdge } from '@open5gs/shared';

/**
 * 3GPP 架构依赖边（基线 §2 + EV-005）：5G SBA（参考点）与 4G EPC 的关键管控依赖。
 * 每条边 `[source, target, label]`；两端都必须出现在资产清单中才输出到图。
 */
export const EDGES: Array<[string, string, string]> = [
  // 5G SBA 注册/发现（各管控面 → NRF）
  ['amf', 'nrf', '注册/发现'],
  ['smf', 'nrf', '注册/发现'],
  ['pcf', 'nrf', '注册/发现'],
  ['ausf', 'nrf', '注册/发现'],
  ['udm', 'nrf', '注册/发现'],
  ['udr', 'nrf', '注册/发现'],
  ['nssf', 'nrf', '注册/发现'],
  ['bsf', 'nrf', '注册/发现'],
  ['scp', 'nrf', '代理注册'],
  // 5G SBA 参考点依赖
  ['amf', 'udm', '订阅'],
  ['amf', 'ausf', '认证'],
  ['amf', 'smf', '会话治理'],
  ['smf', 'upf', '用户面会话'],
  ['smf', 'pcf', '策略'],
  ['smf', 'udm', '订阅'],
  ['ausf', 'udm', '认证'],
  ['udm', 'udr', '数据存储'],
  ['bsf', 'pcf', '绑定'],
  // 4G EPC
  ['mme', 'hss', 'S6a'],
  ['mme', 'sgwc', 'S11'],
  ['sgwc', 'sgwu', 'Sx'],
  ['sgwc', 'pcrf', 'Gx'],
];

/** 依赖边 → 外部输出的 TopologyEdge 形态。 */
export function edgeList(present: Set<string>): TopologyEdge[] {
  return EDGES.filter(([s, t]) => present.has(s) && present.has(t)).map(
    ([source, target, label]) => ({
      source,
      target,
      label,
    }),
  );
}
