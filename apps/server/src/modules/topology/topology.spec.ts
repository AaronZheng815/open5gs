import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TopologyService } from './topology.service';
import { TopologyController } from './topology.controller';
import { EDGES } from './edges.map';

/** scoped 配置目录：仅含关键边所需的 7 个网元。 */
function makeConfigDir(): { root: string; dir: string } {
  const root = mkdtempSync(join(tmpdir(), 'nms-topo-'));
  const dir = join(root, 'ogs');
  mkdirSync(dir, { recursive: true });
  const write = (nf: string, addr: string) =>
    writeFileSync(
      join(dir, `${nf}.yaml`),
      `${nf}:\n  sbi:\n    server:\n      - address: ${addr}\n        port: 7777\n`,
    );
  write('amf', '127.0.0.5');
  write('smf', '127.0.0.4');
  write('upf', '127.0.0.7');
  write('pcf', '127.0.0.13');
  write('nrf', '127.0.0.10');
  write('mme', '127.0.0.2');
  write('hss', '127.0.0.8');
  return { root, dir };
}

describe('T-11 topology (edges.map)', () => {
  it('含关键边 AMF→NRF / SMF→UPF / SMF→PCF / MME→HSS', () => {
    const pairs = EDGES.map(([s, t]) => `${s}->${t}`);
    expect(pairs).toContain('amf->nrf');
    expect(pairs).toContain('smf->upf');
    expect(pairs).toContain('smf->pcf');
    expect(pairs).toContain('mme->hss');
  });
});

describe('T-11 topology (service)', () => {
  let cfg: { root: string; dir: string };
  afterEach(() => rmSync(cfg.root, { recursive: true, force: true }));

  it('buildTopology 返回节点+边；节点 id 与资产 id 一致（AC-9 判定②）', () => {
    cfg = makeConfigDir();
    const svc = new TopologyService();
    const graph = svc.buildTopology(cfg.dir);
    const ids = graph.nodes.map((n) => n.id).sort();
    expect(ids).toEqual(['amf', 'hss', 'mme', 'nrf', 'pcf', 'smf', 'upf']);
    // 节点 id 与 inventory 资产 id 一致
    expect(graph.nodes.find((n) => n.id === 'amf')?.nfType).toBe('amf');
    // 仅含两端都在资产里的边
    expect(graph.edges).toEqual(
      expect.arrayContaining([
        { source: 'amf', target: 'nrf', label: expect.any(String) },
        { source: 'smf', target: 'upf', label: expect.any(String) },
        { source: 'smf', target: 'pcf', label: expect.any(String) },
        { source: 'mme', target: 'hss', label: expect.any(String) },
      ]),
    );
    // bsf 不在资产 → 不含 bsf 相关边
    expect(graph.edges.find((e) => e.source === 'bsf')).toBeUndefined();
  });

  it('无资产清单时返回空图（nodes/edges 空）', () => {
    const root = mkdtempSync(join(tmpdir(), 'nms-topo-empty-'));
    try {
      const svc = new TopologyService();
      const graph = svc.buildTopology(root);
      expect(graph.nodes).toEqual([]);
      expect(graph.edges).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('T-11 topology (controller)', () => {
  it('GET /api/topology 转发 service.buildTopology', () => {
    const buildTopology = jest
      .fn()
      .mockReturnValue({ nodes: [{ id: 'amf', nfType: 'amf', label: 'AMF' }], edges: [] });
    const fake = { buildTopology } as unknown as TopologyService;
    const ctrl = new TopologyController(fake);
    expect(ctrl.topology()).toEqual({
      nodes: [{ id: 'amf', nfType: 'amf', label: 'AMF' }],
      edges: [],
    });
    expect(buildTopology).toHaveBeenCalled();
  });
});
