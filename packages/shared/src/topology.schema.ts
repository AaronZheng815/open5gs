import { z } from 'zod';

export const TopologyNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  nfType: z.string(),
});
export type TopologyNode = z.infer<typeof TopologyNodeSchema>;

export const TopologyEdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
  label: z.string().optional(),
});
export type TopologyEdge = z.infer<typeof TopologyEdgeSchema>;

export const TopologyGraphSchema = z.object({
  nodes: z.array(TopologyNodeSchema),
  edges: z.array(TopologyEdgeSchema),
});
export type TopologyGraph = z.infer<typeof TopologyGraphSchema>;
