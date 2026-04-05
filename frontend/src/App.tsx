import { ReactFlowProvider } from '@xyflow/react';
import { Canvas } from './components/Canvas';
import { Sidebar } from './components/Sidebar';
import { ConfigPanel } from './components/ConfigPanel';
import { Toolbar } from './components/Toolbar';
import { StatusBar } from './components/StatusBar';
import { Terminal } from './components/Terminal';
import { LandingPage } from './components/LandingPage';
import { useProjectStore } from './store/projectStore';
import { useDiagramStore } from './store/diagramStore';
import { useSimulationStore } from './store/simulationStore';

export default function App() {
  const { projects, currentProjectId, openProject, closeProject, saveDiagram } = useProjectStore();

  function handleOpenProject(id: string) {
    const project = projects[id];
    if (project) {
      useDiagramStore.getState().loadDiagram(project.nodes, project.edges);
    } else {
      useDiagramStore.getState().reset();
    }
    useSimulationStore.getState().reset();
    openProject(id);
  }

  function handleCloseProject() {
    if (currentProjectId) {
      const { nodes, edges } = useDiagramStore.getState();
      saveDiagram(currentProjectId, nodes, edges);
    }
    useSimulationStore.getState().reset();
    useDiagramStore.getState().reset();
    closeProject();
  }

  if (!currentProjectId) {
    return <LandingPage onOpen={handleOpenProject} />;
  }

  const projectName = projects[currentProjectId]?.name ?? 'Project';

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-screen bg-stone-950 text-white overflow-hidden">
        <Toolbar projectName={projectName} onBack={handleCloseProject} />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <Canvas />
          <ConfigPanel />
        </div>
        <Terminal />
        <StatusBar />
      </div>
    </ReactFlowProvider>
  );
}
