import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  type EdgeProps,
} from '@xyflow/react';
import { useDiagramStore } from '../store/diagramStore';

export function CustomBezierEdge({
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

  const bendX: number = (data as Record<string, unknown>)?.bendX as number ?? 0;
  const bendY: number = (data as Record<string, unknown>)?.bendY as number ?? 0;

  let edgePath: string;
  let labelX: number;
  let labelY: number;

  if (bendX === 0 && bendY === 0) {
    [edgePath, labelX, labelY] = getBezierPath({
      sourceX, sourceY, sourcePosition,
      targetX, targetY, targetPosition,
    });
  } else {
    const cx = (sourceX + targetX) / 2 + bendX;
    const cy = (sourceY + targetY) / 2 + bendY;
    edgePath = `M ${sourceX} ${sourceY} Q ${cx} ${cy} ${targetX} ${targetY}`;
    labelX = cx;
    labelY = cy;
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    e.preventDefault();

    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);

    const startX = e.clientX;
    const startY = e.clientY;
    const initX = bendX;
    const initY = bendY;

    const onMove = (ev: PointerEvent) => {
      const { zoom } = getViewport();
      updateEdgeData(id, {
        bendX: initX + (ev.clientX - startX) / zoom,
        bendY: initY + (ev.clientY - startY) / zoom,
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
