import { useSwarmStore } from './store/useSwarmStore';
import { useBackendSession } from './hooks/useBackendSession';
import Header from './components/Header';
import LeftRail from './components/LeftRail';
import AgentCanvas from './components/canvas/AgentCanvas';
import RightPanel from './components/panels/RightPanel';
import Footer from './components/Footer';
import AgentBuilder from './components/modals/AgentBuilder';
import CrewBuilder from './components/modals/CrewBuilder';

export default function App() {
  const agentBuilderOpen = useSwarmStore((s) => s.agentBuilderOpen);
  const crewBuilderOpen = useSwarmStore((s) => s.crewBuilderOpen);

  const session = useBackendSession(() => {
    // On backend exit — nothing special for now; the UI stays open so the
    // user can see the transcript.
  });

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-bg-base text-text-primary" style={{ fontFamily: 'var(--font-ui)' }}>
      <Header session={session} />

      <div className="flex flex-1 overflow-hidden">
        <LeftRail session={session} />

        <main className="flex-1 flex flex-col overflow-hidden border-x border-border">
          <AgentCanvas session={session} />
        </main>

        <RightPanel session={session} />
      </div>

      <Footer session={session} />

      {agentBuilderOpen && <AgentBuilder />}
      {crewBuilderOpen && <CrewBuilder />}
    </div>
  );
}
