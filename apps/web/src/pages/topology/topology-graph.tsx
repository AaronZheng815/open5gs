import { useEffect, useRef } from 'react';
import { Graph } from '@antv/g6';
import type { TopologyGraph as TopologyGraphData } from '@open5gs/shared';

/** AntV G6 拓扑画布（决策 2.8）：force 布局 + 节点标签。API 端点为只读渲染，异常不冒泡。 */
export function TopologyGraph({ data }: { data: TopologyGraphData }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const graph = new Graph({
      container: ref.current,
      autoFit: 'view',
      data: {
        nodes: data.nodes.map((n) => ({ id: n.id, style: { labelText: n.label } })),
        edges: data.edges.map((e) => ({ source: e.source, target: e.target })),
      },
      layout: { type: 'force' },
      node: { style: { size: 28, fill: '#1677ff', labelFill: '#333' } },
    });
    graph.render();
    return () => {
      graph.destroy();
    };
  }, [data]);

  return <div ref={ref} data-testid="topology-graph" style={{ width: '100%', height: 480 }} />;
}
