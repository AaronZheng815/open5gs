import type { DiffLine } from '@open5gs/shared';

function toPath(parts: (string | number)[]): string {
  return parts.reduce<string>((acc, p) => {
    if (typeof p === 'number') return `${acc}[${p}]`;
    return acc === '' ? String(p) : `${acc}.${String(p)}`;
  }, '');
}

function isObj(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

function walk(before: unknown, after: unknown, path: (string | number)[], out: DiffLine[]): void {
  if (path.length > 0) {
    if (after === undefined && before !== undefined) {
      out.push({ type: 'remove', path: toPath(path), before });
      return;
    }
    if (before === undefined && after !== undefined) {
      out.push({ type: 'add', path: toPath(path), after });
      return;
    }
  }

  if (isObj(before) && isObj(after)) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const k of keys) walk(before[k], after[k], [...path, k], out);
    return;
  }
  if (Array.isArray(before) && Array.isArray(after)) {
    const len = Math.max(before.length, after.length);
    for (let i = 0; i < len; i++) walk(before[i], after[i], [...path, i], out);
    return;
  }
  if (!deepEqual(before, after)) {
    out.push({ type: 'change', path: toPath(path), before, after });
  }
}

/** 有序深差异：change / add / remove，路径为点分键 + 数组下标。 */
export function diffConfig(before: unknown, after: unknown): DiffLine[] {
  const out: DiffLine[] = [];
  walk(before, after, [], out);
  return out;
}
