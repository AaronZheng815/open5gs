import type { MetricSample } from '@open5gs/shared';

/**
 * Prometheus text 格式解析（EV-004）：把 `:9090/metrics` 文本解析为 MetricSample 列表。
 * 跳过 `# HELP` / `# TYPE` 注释与空行；容忍可选 timestamp。
 */
export function parseMetrics(text: string): MetricSample[] {
  const samples: MetricSample[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const sample = parseMetricLine(line);
    if (sample) samples.push(sample);
  }
  return samples;
}

/** 解析单行：`name{label=..} value [timestamp]`。 */
export function parseMetricLine(line: string): MetricSample | null {
  const m = /^([a-zA-Z_:][a-zA-Z0-9_:]*)(\{[^}]*\})?\s+(\S+)(?:\s+\S+)?$/.exec(line);
  if (!m) return null;
  const name = m[1];
  const labels = m[2] ? parseLabels(m[2].slice(1, -1)) : undefined;
  const value = parseFloat(m[3]);
  if (Number.isNaN(value)) return null;
  return labels ? { name, value, labels } : { name, value };
}

function parseLabels(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of s.split(',')) {
    const eq = pair.indexOf('=');
    if (eq === -1) continue;
    const key = pair.slice(0, eq).trim();
    const val = pair.slice(eq + 1).trim().replace(/^"|"$/g, '');
    if (key) out[key] = val;
  }
  return out;
}
