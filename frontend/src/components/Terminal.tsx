import { useEffect, useRef, useState } from 'react';
import { useLogStore, type LogEntry } from '../store/logStore';

const LEVEL_STYLES: Record<string, { badge: string; text: string; prefix: string }> = {
  info:    { badge: 'text-sky-400',    text: 'text-stone-300',  prefix: '[INFO]   ' },
  warn:    { badge: 'text-amber-400',  text: 'text-amber-200',  prefix: '[WARN]   ' },
  error:   { badge: 'text-rose-400',   text: 'text-rose-200',   prefix: '[ERROR]  ' },
  success: { badge: 'text-green-400',  text: 'text-green-200',  prefix: '[OK]     ' },
};

function pad2(n: number) { return String(n).padStart(2, '0'); }

function formatTime(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function EntryLine({ entry }: { entry: LogEntry }) {
  const s = LEVEL_STYLES[entry.level] ?? LEVEL_STYLES.info;
  return (
    <div className="font-mono text-xs leading-relaxed select-text whitespace-pre-wrap break-all px-3 py-0.5 hover:bg-stone-800/50">
      <span className="text-stone-600">{formatTime(entry.timestamp)} </span>
      <span className={s.badge}>{s.prefix}</span>
      {entry.source && (
        <span className="text-stone-500">[{entry.source}] </span>
      )}
      <span className={s.text}>{entry.message}</span>
    </div>
  );
}

const MIN_HEIGHT = 80;
const MAX_HEIGHT = 600;
const DEFAULT_HEIGHT = 180;

export function Terminal() {
  const { entries, isOpen, clear, toggle } = useLogStore();
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const bodyRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartH = useRef(0);

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (isOpen && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [entries.length, isOpen]);

  function onMouseDownHandle(e: React.MouseEvent) {
    e.preventDefault();
    dragging.current = true;
    dragStartY.current = e.clientY;
    dragStartH.current = height;

    function onMove(ev: MouseEvent) {
      if (!dragging.current) return;
      const delta = dragStartY.current - ev.clientY;
      setHeight(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, dragStartH.current + delta)));
    }
    function onUp() {
      dragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  const errorCount = entries.filter((e) => e.level === 'error').length;
  const warnCount  = entries.filter((e) => e.level === 'warn').length;

  return (
    <div className="shrink-0 border-t border-stone-800 bg-stone-950 flex flex-col select-none">
      {/* Drag handle */}
      {isOpen && (
        <div
          className="h-1 cursor-ns-resize bg-stone-800 hover:bg-stone-600 transition-colors"
          onMouseDown={onMouseDownHandle}
        />
      )}

      {/* Header bar */}
      <div
        className="h-7 flex items-center justify-between px-3 gap-3 cursor-pointer hover:bg-stone-900 transition-colors"
        onClick={toggle}
      >
        <div className="flex items-center gap-3 text-xs">
          <span className="text-stone-400 font-medium tracking-wide uppercase text-[10px]">Terminal</span>

          {errorCount > 0 && (
            <span className="flex items-center gap-1 text-rose-400">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              {errorCount} error{errorCount !== 1 ? 's' : ''}
            </span>
          )}
          {warnCount > 0 && (
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              {warnCount} warning{warnCount !== 1 ? 's' : ''}
            </span>
          )}
          {errorCount === 0 && warnCount === 0 && entries.length > 0 && (
            <span className="text-stone-600">{entries.length} entries</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {entries.length > 0 && (
            <button
              className="text-xs text-stone-500 hover:text-stone-300 px-1.5 py-0.5 rounded hover:bg-stone-800"
              onClick={(e) => { e.stopPropagation(); clear(); }}
            >
              Clear
            </button>
          )}
          <span className="text-stone-600 text-xs">{isOpen ? '▾' : '▸'}</span>
        </div>
      </div>

      {/* Log body */}
      {isOpen && (
        <div
          ref={bodyRef}
          className="overflow-y-auto overflow-x-hidden bg-stone-950 border-t border-stone-900"
          style={{ height }}
        >
          {entries.length === 0 ? (
            <div className="px-3 py-2 text-xs text-stone-600 font-mono italic">
              No output yet. Run a simulation to see logs here.
            </div>
          ) : (
            entries.map((entry) => <EntryLine key={entry.id} entry={entry} />)
          )}
        </div>
      )}
    </div>
  );
}
