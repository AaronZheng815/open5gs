import { bootApp, get, nfYaml, type Booted } from './utils';

describe('topology e2e (AC-9)', () => {
  let ctx: Booted;

  beforeAll(async () => {
    ctx = await bootApp({
      dbTag: 'topology',
      configFiles: {
        'nrf.yaml': nfYaml('nrf', '127.0.0.10'),
        'amf.yaml': nfYaml('amf', '127.0.0.5'),
        'smf.yaml': nfYaml('smf', '127.0.0.4'),
      },
    });
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  it('AC-9：拓扑图含节点（id/nfType/label）且边两端均在节点集中', async () => {
    const res = await get(ctx.instance, '/api/topology', ctx.authHeaders);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload) as {
      nodes: { id: string; nfType: string; label: string }[];
      edges: { source: string; target: string; label?: string }[];
    };
    expect(body.nodes.length).toBe(3);
    const ids = new Set(body.nodes.map((n) => n.id));
    expect(ids.has('amf')).toBe(true);
    expect(ids.has('smf')).toBe(true);
    expect(ids.has('nrf')).toBe(true);
    for (const n of body.nodes) {
      expect(typeof n.nfType).toBe('string');
      expect(typeof n.label).toBe('string');
      expect(n.label.length).toBeGreaterThan(0);
    }
    for (const e of body.edges) {
      expect(ids.has(e.source)).toBe(true);
      expect(ids.has(e.target)).toBe(true);
    }
  });

  it('空配置目录 → 空拓扑（不 500）', async () => {
    const empty = await bootApp({ dbTag: 'topology-empty', configFiles: {} });
    try {
      const res = await get(empty.instance, '/api/topology', empty.authHeaders);
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload) as { nodes: unknown[]; edges: unknown[] };
      expect(body.nodes).toEqual([]);
      expect(body.edges).toEqual([]);
    } finally {
      await empty.cleanup();
    }
  });
});
