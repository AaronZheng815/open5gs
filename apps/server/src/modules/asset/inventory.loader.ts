import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import * as yaml from 'js-yaml';
import type { NfAsset } from '@open5gs/shared';

/** 基线 §3：16 网元（11 个 5G SBA + 5 个 4G EPC）→ 3GPP 角色标签。 */
export const ROLE_LABELS: Record<string, string> = {
  nrf: '网元注册与发现 (Discovery & Registration)',
  scp: '服务通信代理 (间接通信)',
  amf: '接入与移动性管理',
  smf: '会话管理 (PDU Session)',
  upf: '用户面功能 (User Plane)',
  ausf: '鉴权服务器功能',
  udm: '统一数据管理',
  udr: '统一数据仓库',
  pcf: '策略控制功能',
  nssf: '网络切片选择',
  bsf: '绑定支持功能 (BD/Binding)',
  mme: '移动性管理实体',
  hss: '归属用户服务器',
  sgwc: '服务网关(控制面)',
  sgwu: '服务网关(用户面)',
  pcrf: '策略与计费规则功能',
};

/** 资产主表：已知 16 网元 = ROLE_LABELS 的键集。 */
export const KNOWN_NF_TYPES: string[] = Object.keys(ROLE_LABELS);

/** 基线 §4.1 地址映射表：配置缺失时兜底的管理/内部地址。 */
export const DEFAULT_ADDR: Record<string, string> = {
  nrf: '127.0.0.10',
  scp: '127.0.0.200',
  amf: '127.0.0.5',
  smf: '127.0.0.4',
  upf: '127.0.0.7',
  ausf: '127.0.0.11',
  udm: '127.0.0.12',
  udr: '127.0.0.20',
  pcf: '127.0.0.13',
  nssf: '127.0.0.14',
  bsf: '127.0.0.15',
  mme: '127.0.0.2',
  hss: '127.0.0.8',
  sgwc: '127.0.0.3',
  sgwu: '127.0.0.6',
  pcrf: '127.0.0.9',
};

/**
 * 配置目录解析（决策 2.3：资产主表 = 本地配置清单）：
 * 1. 环境变量 OGS_CONFIG_DIR；
 * 2. 运行时安装目录 /usr/local/etc/open5gs（真实部署）；
 * 3. 仓库模板 configs/open5gs（仅有 .yaml.in 的形态）。
 */
export function resolveConfigDir(): string {
  if (process.env.OGS_CONFIG_DIR) return process.env.OGS_CONFIG_DIR;
  if (existsSync('/usr/local/etc/open5gs')) return '/usr/local/etc/open5gs';
  return resolve(process.cwd(), 'configs/open5gs');
}

/** 从 filename 提取 nfType：`amf.yaml` / `amf.yaml.in` → `amf`。 */
function nfTypeOf(file: string): string {
  return file.replace(/\.yaml(\.in)?$/, '');
}

/**
 * 递归采集节点内所有 `address` 字符串。
 * 用于无 sbi 的网元（MME/SGW-C/SGW-U/UPF/HSS/PCRF 等）兜底地址。
 */
function collectAddresses(node: unknown, out: string[]): void {
  if (node == null || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) collectAddresses(item, out);
    return;
  }
  const obj = node as Record<string, unknown>;
  if ('address' in obj && typeof obj.address === 'string') out.push(obj.address);
  for (const value of Object.values(obj)) collectAddresses(value, out);
}

/** 取 sbi.server 下第一个 address（5G SBA 走这里）。 */
function findSbiAddress(node: unknown): string | undefined {
  if (node == null || typeof node !== 'object') return undefined;
  if (Array.isArray(node)) {
    for (const item of node) {
      const hit = findSbiAddress(item);
      if (hit) return hit;
    }
    return undefined;
  }
  const obj = node as Record<string, unknown>;
  if ('address' in obj && typeof obj.address === 'string') return obj.address;
  for (const value of Object.values(obj)) {
    const hit = findSbiAddress(value);
    if (hit) return hit;
  }
  return undefined;
}

/** 从 [nfType] 顶层 block 提取管理地址：优先 sbi，其次第一个 loopback，最后任意 address。 */
function extractAddress(nfBlock: unknown): string | undefined {
  if (nfBlock == null || typeof nfBlock !== 'object') return undefined;
  const block = nfBlock as Record<string, unknown>;
  const sbi = findSbiAddress(block.sbi);
  if (sbi) return sbi;
  const all: string[] = [];
  collectAddresses(nfBlock, all);
  const loopback = all.find((a) => /^127\./.test(a));
  return loopback ?? all[0];
}

/**
 * 从本地配置清单解析资产模型（AC-8：不依赖 NRF）。
 * 返回 KNOWN 网元 + 解析出的 nfType/addr/role；status 默认 unknown（等 NRF 叠加）。
 */
export function loadInventory(configDir: string = resolveConfigDir()): NfAsset[] {
  if (!existsSync(configDir)) return [];
  const files = readdirSync(configDir).filter((f) => /\.yaml(\.in)?$/.test(f));
  const assets: NfAsset[] = [];

  for (const file of files) {
    const nfType = nfTypeOf(file);
    if (!KNOWN_NF_TYPES.includes(nfType)) continue; // 过滤 sepp、hnet 等非资产
    let addr: string | undefined;
    try {
      const doc = yaml.load(readFileSync(join(configDir, file), 'utf8')) as Record<string, unknown>;
      addr = extractAddress(doc?.[nfType]);
    } catch {
      addr = undefined; // 单个文件解析失败不拖垮整份清单
    }
    assets.push({
      id: nfType,
      nfType,
      role: ROLE_LABELS[nfType],
      addr: addr ?? DEFAULT_ADDR[nfType],
      status: 'unknown',
    });
  }

  return assets;
}
