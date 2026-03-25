import { ReactFlowProvider } from '@xyflow/react';
import { Canvas } from './components/Canvas';
import { Sidebar } from './components/Sidebar';
import { ConfigPanel } from './components/ConfigPanel';
import { Toolbar } from './components/Toolbar';
import { StatusBar } from './components/StatusBar';

export default function App() {
  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-screen bg-slate-950 text-white overflow-hidden">
        <Toolbar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <Canvas />
          <ConfigPanel />
        </div>
        <StatusBar />
      </div>
    </ReactFlowProvider>
  );
}
