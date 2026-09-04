/** 结构化配置表单字段工具：把 yaml 解析出的嵌套 content 展平为叶子字段，编辑后按路径回填。 */

export interface FlatField {
  path: string;
  value: unknown;
}

/** 递归展平：嵌套对象→点分路径；数组元素→[i] 下标路径；叶子→{path,value}。 */
export function flattenConfig(content: Record<string, unknown>, base = ''): FlatField[] {
  const out: FlatField[] = [];
  for (const [key, val] of Object.entries(content)) {
    const path = base ? `${base}.${key}` : key;
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      out.push(...flattenConfig(val as Record<string, unknown>, path));
    } else if (Array.isArray(val)) {
      val.forEach((item, i) => {
        if (item !== null && typeof item === 'object') {
          out.push(...flattenConfig(item as Record<string, unknown>, `${path}[${i}]`));
        } else {
          out.push({ path: `${path}[${i}]`, value: item });
        }
      });
    } else {
      out.push({ path, value: val });
    }
  }
  return out;
}

/** 解析点分+下标路径为 token 序列，如 "amf.sbi.server[0].address" → ['amf','sbi','server',0,'address']。 */
export function parsePath(path: string): (string | number)[] {
  const tokens: (string | number)[] = [];
  const re = /([^.[\]]+)|\[(\d+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(path))) {
    tokens.push(m[2] !== undefined ? Number(m[2]) : m[1]);
  }
  return tokens;
}

function isIndexToken(t: string | number): t is number {
  return typeof t === 'number';
}

function setByPath<T>(target: T, tokens: (string | number)[], value: unknown): void {
  let cur = target as Record<string | number, unknown>;
  for (let i = 0; i < tokens.length - 1; i++) {
    const t = tokens[i];
    const next = tokens[i + 1];
    if (cur[t] === undefined || cur[t] === null) {
      cur[t] = isIndexToken(next) ? [] : {};
    }
    cur = cur[t] as Record<string | number, unknown>;
  }
  cur[tokens[tokens.length - 1]] = value;
}

/** 深拷贝后按 {path: value} 回填：只覆盖编辑过的叶子，未编辑分支保持原值。 */
export function rebuildContent(
  base: Record<string, unknown>,
  values: Record<string, unknown>,
): Record<string, unknown> {
  const out = JSON.parse(JSON.stringify(base)) as Record<string, unknown>;
  for (const [path, val] of Object.entries(values)) {
    setByPath(out, parsePath(path), val);
  }
  return out;
}
