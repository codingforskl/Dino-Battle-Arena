import { useContext, useState } from 'react';
import { GameContext } from '@/App';
import { DINOSAURS, DinoId } from '@/lib/dino-data';
import { Button } from '@/components/ui/button';
import { DinoSvg } from '@/components/dino-svg';

export default function SelectScreen() {
  const ctx = useContext(GameContext);
  const [selectedPlayer, setSelectedPlayer] = useState<DinoId>('velociraptor');
  const [selectedOpponent, setSelectedOpponent] = useState<DinoId>('giganotosaurus');

  if (!ctx) return null;

  const handleStart = () => {
    ctx.dispatch({ type: 'START_BATTLE', playerDino: selectedPlayer, opponentDino: selectedOpponent });
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 forest-bg text-center">
      <h1 className="text-4xl md:text-6xl font-bold text-primary mb-8 tracking-tighter uppercase drop-shadow-md">
        Primal Clash
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full max-w-3xl mb-12">
        <div className="flex flex-col items-center gap-4 bg-card/80 p-6 rounded-xl border border-primary/20 backdrop-blur-sm">
          <h2 className="text-2xl font-bold text-white">Select Your Fighter</h2>
          <div className="flex gap-2">
            {(Object.keys(DINOSAURS) as DinoId[]).map(id => (
              <Button
                key={`p-${id}`}
                variant={selectedPlayer === id ? 'default' : 'outline'}
                className="capitalize"
                onClick={() => setSelectedPlayer(id)}
              >
                {DINOSAURS[id].name}
              </Button>
            ))}
          </div>
          <div className="w-32 h-32 mt-4 text-primary">
            <DinoSvg dinoId={selectedPlayer} />
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 bg-card/80 p-6 rounded-xl border border-destructive/20 backdrop-blur-sm">
          <h2 className="text-2xl font-bold text-white">Select Opponent</h2>
          <div className="flex gap-2">
            {(Object.keys(DINOSAURS) as DinoId[]).map(id => (
              <Button
                key={`o-${id}`}
                variant={selectedOpponent === id ? 'destructive' : 'outline'}
                className="capitalize"
                onClick={() => setSelectedOpponent(id)}
              >
                {DINOSAURS[id].name}
              </Button>
            ))}
          </div>
          <div className="w-32 h-32 mt-4 text-destructive">
            <DinoSvg dinoId={selectedOpponent} />
          </div>
        </div>
      </div>

      <Button size="lg" className="text-xl px-12 py-8 bg-primary text-primary-foreground hover:bg-primary/90 transition-all font-bold tracking-widest" onClick={handleStart}>
        BEGIN BATTLE
      </Button>
    </div>
  );
}
