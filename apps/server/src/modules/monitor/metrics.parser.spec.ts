import { parseMetrics } from './metrics.parser';

const AMF_SAMPLE = `# HELP gnb gNodeBs
# TYPE gnb gauge
gnb 0

# HELP fivegs_amffunction_rm_reginitreq Number of initial registration requests received by the AMF
# TYPE fivegs_amffunction_rm_reginitreq counter
fivegs_amffunction_rm_reginitreq 6

fivegs_amffunction_mm_paging5greq{instance="127.0.0.5"} 0 1712345678
`;

describe('metrics.parser', () => {
  it('解析 gauge 行（无 label）：name + value', () => {
    const out = parseMetrics('gnb 0');
    expect(out).toEqual([{ name: 'gnb', value: 0 }]);
  });

  it('解析 counter 行（带 label）并保留 labels', () => {
    const out = parseMetrics('fivegs_amffunction_rm_reginitreq{instance="127.0.0.5"} 6');
    expect(out).toEqual([{ name: 'fivegs_amffunction_rm_reginitreq', value: 6, labels: { instance: '127.0.0.5' } }]);
  });

  it('忽略 # HELP / # TYPE 注释与空行，支持可选 timestamp', () => {
    const out = parseMetrics(AMF_SAMPLE);
    // 3 条有效 sample：gnb、rm_reginitreq、paging5greq
    expect(out).toHaveLength(3);
    expect(out.map((s) => s.name)).toEqual(['gnb', 'fivegs_amffunction_rm_reginitreq', 'fivegs_amffunction_mm_paging5greq']);
    expect(out[0].value).toBe(0);
    expect(out[2].value).toBe(0);
    expect(out[2].labels).toEqual({ instance: '127.0.0.5' });
  });

  it('畸形/非数值行被跳过', () => {
    const out = parseMetrics('not_a_metric\nbad  nan\n# comment\n\n  leading 3');
    expect(out).toEqual([{ name: 'leading', value: 3 }]);
  });
});
