import { useEffect, useRef, useState } from 'react';
import { useUIStore, type EdgeVariant } from '../store/uiStore';
import { useDiagramPersist } from '../hooks/useDiagramPersist';

// ── Primitive building blocks ─────────────────────────────────────────────────

interface MenuItemProps {
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
}

function MenuItem({ label, shortcut, onClick, disabled }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-stone-300 hover:bg-stone-700 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-left"
    >
      <span>{label}</span>
      {shortcut && <span className="text-stone-500 text-[10px] ml-6">{shortcut}</span>}
    </button>
  );
}

function Separator() {
  return <div className="h-px bg-stone-700 my-1 mx-1" />;
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="px-3 py-1 text-[10px] text-stone-500 uppercase tracking-wider font-medium">
      {label}
    </div>
  );
}

interface DropdownMenuProps {
  label: string;
  children: React.ReactNode;
  onClose: () => void;
  isOpen: boolean;
  onOpen: () => void;
}

function DropdownMenu({ label, children, onClose, isOpen, onOpen }: DropdownMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handler(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => (isOpen ? onClose() : onOpen())}
        className={`px-3 h-full text-xs transition-colors rounded-sm ${
          isOpen
            ? 'bg-stone-700 text-stone-100'
            : 'text-stone-400 hover:bg-stone-800 hover:text-stone-200'
        }`}
      >
        {label}
      </button>
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-0.5 min-w-44 bg-stone-800 border border-stone-700 rounded shadow-2xl z-50 py-1"
          onClick={onClose}
        >
          {children}
        </div>
      )}
    </div>
  );
}

// ── MenuBar ───────────────────────────────────────────────────────────────────

interface Props {
  onBack: () => void;
}

export function MenuBar({ onBack }: Props) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const edgeVariant = useUIStore((s) => s.edgeVariant);
  const setEdgeVariant = useUIStore((s) => s.setEdgeVariant);
  const { saveFile, saveFileAs, openDiagramFile, fitView, zoomIn, zoomOut } = useDiagramPersist();

  function open(menu: string) { setOpenMenu(menu); }
  function close() { setOpenMenu(null); }

  // Keyboard shortcut: Ctrl+S / Cmd+S
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (e.shiftKey) {
          saveFileAs();
        } else {
          saveFile();
        }
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [saveFile, saveFileAs]);

  const edgeVariants: { value: EdgeVariant; label: string; symbol: string }[] = [
    { value: 'bezier',   label: 'Curved',   symbol: '~' },
    { value: 'straight', label: 'Straight', symbol: '/' },
    { value: 'rounded',  label: 'Stepped',  symbol: '⌐' },
  ];

  return (
    <div className="h-7 bg-stone-900 border-b border-stone-800 flex items-center px-2 gap-0.5 shrink-0">
      {/* File */}
      <DropdownMenu label="File" isOpen={openMenu === 'file'} onOpen={() => open('file')} onClose={close}>
        <MenuItem label="Open..." onClick={openDiagramFile} />
        <Separator />
        <MenuItem label="Save" shortcut="Ctrl+S" onClick={saveFile} />
        <MenuItem label="Save As..." shortcut="Ctrl+Shift+S" onClick={saveFileAs} />
        <Separator />
        <MenuItem label="Close Project" onClick={onBack} />
      </DropdownMenu>

      {/* View */}
      <DropdownMenu label="View" isOpen={openMenu === 'view'} onOpen={() => open('view')} onClose={close}>
        <SectionLabel label="Connection style" />
        {edgeVariants.map(({ value, label, symbol }) => (
          <button
            key={value}
            onClick={() => setEdgeVariant(value)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs transition-colors hover:bg-stone-700 text-left"
          >
            <span
              className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[8px] shrink-0 ${
                edgeVariant === value
                  ? 'bg-sky-500 border-sky-500 text-white'
                  : 'border-stone-500 text-stone-500'
              }`}
            >
              {edgeVariant === value ? '✓' : ''}
            </span>
            <span className={edgeVariant === value ? 'text-sky-300' : 'text-stone-300'}>
              {symbol} {label}
            </span>
          </button>
        ))}
        <Separator />
        <MenuItem label="Fit View" shortcut="F" onClick={() => fitView({ duration: 300 })} />
        <MenuItem label="Zoom In"  shortcut="+" onClick={() => zoomIn({ duration: 200 })} />
        <MenuItem label="Zoom Out" shortcut="−" onClick={() => zoomOut({ duration: 200 })} />
      </DropdownMenu>

      {/* Help */}
      <DropdownMenu label="Help" isOpen={openMenu === 'help'} onOpen={() => open('help')} onClose={close}>
        <MenuItem
          label="hilo-mpc Documentation"
          onClick={() => window.open('https://hilo-mpc.readthedocs.io', '_blank')}
        />
        <Separator />
        <SectionLabel label="Keyboard shortcuts" />
        <div className="px-3 py-1 text-[10px] text-stone-500 space-y-0.5">
          <div className="flex justify-between gap-6"><span>Save</span><span className="text-stone-400">Ctrl+S</span></div>
          <div className="flex justify-between gap-6"><span>Save As</span><span className="text-stone-400">Ctrl+Shift+S</span></div>
          <div className="flex justify-between gap-6"><span>Fit View</span><span className="text-stone-400">F</span></div>
          <div className="flex justify-between gap-6"><span>Delete node</span><span className="text-stone-400">Backspace / Del</span></div>
        </div>
        <Separator />
        <div className="px-3 py-1.5 text-[10px] text-stone-600">
          hilo-mpc UI — visual simulation canvas
        </div>
      </DropdownMenu>
    </div>
  );
}
