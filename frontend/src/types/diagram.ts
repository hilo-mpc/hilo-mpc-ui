import type { Node, Edge, Viewport } from '@xyflow/react';
import type { BlockData, BlockType } from './blocks';

export type DiagramNode = Node<BlockData, BlockType>;
export type DiagramEdge = Edge;

export interface DiagramSchema {
  version: '1.0';
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  viewport?: Viewport;
}
