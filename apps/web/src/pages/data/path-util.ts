/** 点路径读写工具（T-18 记录级 CRUD）——把安全/ambr 等嵌套字段以 "security.k" 形式扁平读写。 */

/** 取 obj 上 point 路径的值（段均为对象键，不含数组下标）。 */
export function getPath(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const seg of path.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

/** 在 obj 上写入 point 路径的值；中间对象不存在则自动创建（不覆盖已有兄弟键）。 */
export function setPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const segs = path.split('.');
  let cur = obj;
  for (let i = 0; i < segs.length - 1; i++) {
    const seg = segs[i];
    const next = cur[seg];
    if (typeof next !== 'object' || next === null) {
      cur[seg] = {};
    }
    cur = cur[seg] as Record<string, unknown>;
  }
  cur[segs[segs.length - 1]] = value;
}

export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
