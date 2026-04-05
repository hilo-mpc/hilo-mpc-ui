import { useDiagramStore } from '../store/diagramStore';

interface HandleTagProps {
  nodeId: string;
  handleId: string;
  label: string;
  /** Actual rendered side of this handle (already accounting for flipped) */
  side: 'left' | 'right';
  /** CSS top value, matching the handle's top offset. Defaults to '50%'. */
  top?: string;
}

const BG     = '#1c1917'; // stone-950
const BORDER = '#57534e'; // stone-600
const TEXT   = '#78716c'; // stone-500

export function HandleTag({ nodeId, handleId, label, side, top = '50%' }: HandleTagProps) {
  const connected = useDiagramStore((s) =>
    s.edges.some(
      (e) =>
        (e.target === nodeId && e.targetHandle === handleId) ||
        (e.source === nodeId && e.sourceHandle === handleId)
    )
  );

  if (connected) return null;

  const isLeft = side === 'left';
  const ARROW_H = 8; // half-height of the arrow triangle

  return (
    <div
      style={{
        position: 'absolute',
        top,
        transform: 'translateY(-50%)',
        [isLeft ? 'right' : 'left']: 'calc(100% + 4px)',
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        zIndex: 20,
      }}
    >
      {isLeft ? (
        // Handle on left → tag extends left → body on left, arrow tip points right
        <>
          <div style={{
            background: BG,
            border: `1px solid ${BORDER}`,
            borderRight: 'none',
            borderRadius: '3px 0 0 3px',
            padding: '2px 5px',
            fontSize: '9px',
            color: TEXT,
            whiteSpace: 'nowrap',
            lineHeight: '14px',
            letterSpacing: '0.02em',
          }}>
            {label}
          </div>
          <div style={{
            width: 0,
            height: 0,
            borderTop: `${ARROW_H}px solid transparent`,
            borderBottom: `${ARROW_H}px solid transparent`,
            borderLeft: `6px solid ${BORDER}`,
          }} />
        </>
      ) : (
        // Handle on right → tag extends right → arrow tip points left, body on right
        <>
          <div style={{
            width: 0,
            height: 0,
            borderTop: `${ARROW_H}px solid transparent`,
            borderBottom: `${ARROW_H}px solid transparent`,
            borderRight: `6px solid ${BORDER}`,
          }} />
          <div style={{
            background: BG,
            border: `1px solid ${BORDER}`,
            borderLeft: 'none',
            borderRadius: '0 3px 3px 0',
            padding: '2px 5px',
            fontSize: '9px',
            color: TEXT,
            whiteSpace: 'nowrap',
            lineHeight: '14px',
            letterSpacing: '0.02em',
          }}>
            {label}
          </div>
        </>
      )}
    </div>
  );
}
