import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { INITIAL_GAME_STATE, gameReducer } from '@/lib/game-engine';
import SelectScreen from '@/pages/select-screen';
import BattleArena from '@/pages/battle-arena';
import OpenWorld from '@/pages/open-world';
import SplashScreen from '@/pages/splash-screen';

const queryClient = new QueryClient();

export const GameContext = React.createContext<{
  state: ReturnType<typeof gameReducer>;
  dispatch: React.Dispatch<any>;
} | null>(null);

function AppContent() {
  const [state, dispatch] = React.useReducer(gameReducer, INITIAL_GAME_STATE);
  const [showSplash, setShowSplash] = React.useState(true);

  if (showSplash) {
    return <SplashScreen onEnter={() => setShowSplash(false)} />;
  }

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      <main className="min-h-screen bg-background text-foreground font-sans w-full max-w-4xl mx-auto border-x border-border shadow-2xl overflow-hidden relative flex flex-col">
        {state.phase === 'select' && <SelectScreen />}
        {state.phase === 'explore' && <OpenWorld />}
        {(state.phase === 'battle' || state.phase === 'victory') && <BattleArena />}
      </main>
    </GameContext.Provider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
