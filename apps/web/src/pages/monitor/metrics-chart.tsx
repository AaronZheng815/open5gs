import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { MetricSample } from '@open5gs/shared';

/** ECharts 指标快照柱状图（决策 2.8）。容器为空或小于 1 时降级为空 div，不抛错。 */
export function MetricsChart({ metrics }: { metrics: MetricSample[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    chartRef.current = chart;
    chart.setOption({
      grid: { top: 24, left: 96, right: 24, bottom: 32 },
      tooltip: {},
      xAxis: { type: 'value' },
      yAxis: { type: 'category', data: metrics.map((m) => m.name) },
      series: [{ type: 'bar', data: metrics.map((m) => m.value) }],
    });
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chart.dispose();
    };
  }, [metrics]);

  return (
    <div
      ref={ref}
      data-testid="metrics-chart"
      style={{ width: '100%', minHeight: Math.max(200, metrics.length * 24) }}
    />
  );
}
