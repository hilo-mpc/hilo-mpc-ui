import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useReactFlow,
  type EdgeProps,
} from '@xyflow/react';
import { useDiagramStore } from '../store/diagramStore';

export function CustomSmoothStepEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  style,
  markerEnd,
}: EdgeProps) {
  const updateEdgeData = useDiagramStore((s) => s.updateEdgeData);
  const { getViewport } = useReactFlow();

  const centerOffX: number = (data as Record<string, unknown>)?.centerOffX as number ?? 0;
  const centerOffY: number = (data as Record<string, unknown>)?.centerOffY as number ?? 0;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
    borderRadius: 12,
    centerX: (sourceX + targetX) / 2 + centerOffX,
    centerY: (sourceY + targetY) / 2 + centerOffY,
  });

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    e.preventDefault();

    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);

    const startX = e.clientX;
    const startY = e.clientY;
    const initX = centerOffX;
    const initY = centerOffY;

    const onMove = (ev: PointerEvent) => {
      const { zoom } = getViewport();
      updateEdgeData(id, {
        centerOffX: initX + (ev.clientX - startX) / zoom,
        centerOffY: initY + (ev.clientY - startY) / zoom,
      });
    };
    const onUp = () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
  }

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
      {selected && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
              cursor: 'grab',
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: '#a8a29e',
              border: '2px solid #292524',
            }}
            className="nodrag nopan"
            onPointerDown={onPointerDown}
          />
        </EdgeLabelRenderer>
      )}
    </>
  );
}
