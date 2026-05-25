import { DINOSAURS, DinoId, Ability } from './dino-data';

export interface CombatantState {
  dinoId: DinoId;
  hp: number;
  stamina: number;
  statusEffects: { type: string; duration: number }[];
  biteProgress: number; 
  isPlayer: boolean;
}

export interface GameState {
  player: CombatantState | null;
  opponent: CombatantState | null;
  turnNumber: number;
  log: string[];
  winner: 'player' | 'opponent' | null;
  phase: 'select' | 'battle' | 'victory';
}

export type GameAction = 
  | { type: 'START_BATTLE'; playerDino: DinoId; opponentDino: DinoId }
  | { type: 'USE_ABILITY'; abilityId: string; attacker: 'player' | 'opponent' }
  | { type: 'REST'; attacker: 'player' | 'opponent' }
  | { type: 'RESET' };

export function initializeCombatant(dinoId: DinoId, isPlayer: boolean): CombatantState {
  const base = DINOSAURS[dinoId];
  return {
    dinoId,
    hp: base.maxHp,
    stamina: base.maxStamina,
    statusEffects: [],
    biteProgress: 0,
    isPlayer
  };
}

export function getRequiredBites(attacker: DinoId, defender: DinoId): number {
  const attackerBiteForce = DINOSAURS[attacker].biteForce;
  const defenderToughness = DINOSAURS[defender].hideToughness;

  if (defenderToughness === 'low') return 1;
  if (defenderToughness === 'medium') {
    if (attackerBiteForce >= 8000) return 1;
    return 3;
  }
  if (defenderToughness === 'high') {
    if (attackerBiteForce >= 35000) return 1;
    if (attackerBiteForce >= 8000) return 2;
    return 3;
  }
  return 1;
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_BATTLE':
      return {
        ...state,
        player: initializeCombatant(action.playerDino, true),
        opponent: initializeCombatant(action.opponentDino, false),
        turnNumber: 1,
        log: [`Battle started! ${DINOSAURS[action.playerDino].name} vs ${DINOSAURS[action.opponentDino].name}`],
        phase: 'battle',
        winner: null,
      };
      
    case 'USE_ABILITY': {
      if (!state.player || !state.opponent || state.winner) return state;
      
      const isPlayerAttacking = action.attacker === 'player';
      const attackerState = isPlayerAttacking ? { ...state.player } : { ...state.opponent };
      const defenderState = isPlayerAttacking ? { ...state.opponent } : { ...state.player };
      
      const attackerBase = DINOSAURS[attackerState.dinoId];
      const defenderBase = DINOSAURS[defenderState.dinoId];
      const ability = attackerBase.abilities.find(a => a.id === action.abilityId);
      
      if (!ability || attackerState.stamina < ability.staminaCost) return state;

      let damage = ability.damage || 0;
      let newLog = [...state.log, `${attackerBase.name} used ${ability.name}!`];

      // Penetration Logic for Bites
      if (ability.name.toLowerCase().includes('bite')) {
        const requiredBites = getRequiredBites(attackerState.dinoId, defenderState.dinoId);
        if (attackerState.biteProgress < requiredBites - 1) {
          attackerState.biteProgress += 1;
          damage = Math.floor(damage / 3); // Reduced damage
          newLog.push(`Thick hide! Bite penetration: ${attackerState.biteProgress}/${requiredBites}`);
        } else {
          attackerState.biteProgress = requiredBites; // Maxed out
          newLog.push(`Hide penetrated! Full damage dealt!`);
        }
      }

      // Handle specific ability effects (Simplified)
      if (ability.id === 'pack_feint') {
         attackerState.statusEffects.push({ type: 'evade', duration: 1 });
         newLog.push(`${attackerBase.name} is preparing to evade!`);
      }
      
      if (ability.id === 'body_slam') {
         defenderState.statusEffects.push({ type: 'stunned', duration: 1 });
         newLog.push(`${defenderBase.name} was stunned!`);
      }
      
      if (ability.id === 'roar') {
         defenderState.statusEffects.push({ type: 'intimidated', duration: 2 });
         newLog.push(`${defenderBase.name} was intimidated (Attack reduced)!`);
      }

      // Evade check
      const hasEvade = defenderState.statusEffects.find(e => e.type === 'evade');
      if (hasEvade && ability.type === 'attack') {
        const evadeSuccess = Math.random() > 0.5;
        if (evadeSuccess) {
          damage = 0;
          newLog.push(`${defenderBase.name} successfully evaded the attack!`);
        } else {
          newLog.push(`${defenderBase.name} tried to evade but failed!`);
        }
        // remove evade
        defenderState.statusEffects = defenderState.statusEffects.filter(e => e.type !== 'evade');
      }

      if (damage > 0) {
        newLog.push(`Dealt ${damage} damage.`);
      }

      const newDefenderHp = Math.max(0, defenderState.hp - damage);
      const newAttackerStamina = Math.max(0, attackerState.stamina - ability.staminaCost + 5); // +5 natural regen
      
      // Update statuses duration
      if (!isPlayerAttacking) {
        attackerState.statusEffects = attackerState.statusEffects.map(e => ({ ...e, duration: e.duration - 1 })).filter(e => e.duration > 0);
      }

      let winner = state.winner;
      if (newDefenderHp === 0) {
        winner = isPlayerAttacking ? 'player' : 'opponent';
        newLog.push(`${defenderBase.name} was defeated!`);
      }

      defenderState.hp = newDefenderHp;
      attackerState.stamina = newAttackerStamina;

      return {
        ...state,
        player: isPlayerAttacking ? attackerState : defenderState,
        opponent: isPlayerAttacking ? defenderState : attackerState,
        log: newLog,
        turnNumber: state.turnNumber + (isPlayerAttacking ? 0 : 1),
        winner,
        phase: winner ? 'victory' : state.phase
      };
    }
    
    case 'REST': {
       if (!state.player || !state.opponent || state.winner) return state;
       
       const isPlayerAttacking = action.attacker === 'player';
       const attackerState = isPlayerAttacking ? { ...state.player } : { ...state.opponent };
       const attackerBase = DINOSAURS[attackerState.dinoId];
       
       attackerState.stamina = Math.min(attackerBase.maxStamina, attackerState.stamina + 25);
       const newLog = [...state.log, `${attackerBase.name} rested and recovered stamina.`];
       
       return {
         ...state,
         player: isPlayerAttacking ? attackerState : state.player,
         opponent: !isPlayerAttacking ? attackerState : state.opponent,
         log: newLog,
         turnNumber: state.turnNumber + (isPlayerAttacking ? 0 : 1)
       };
    }

    case 'RESET': {
      return {
        player: null,
        opponent: null,
        turnNumber: 0,
        log: [],
        winner: null,
        phase: 'select'
      }
    }
      
    default:
      return state;
  }
}
