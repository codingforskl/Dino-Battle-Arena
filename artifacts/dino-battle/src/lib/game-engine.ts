import { DINOSAURS, DinoId } from './dino-data';

export interface CombatantState {
  dinoId: DinoId;
  hp: number;
  stamina: number;
  statusEffects: { type: string; duration: number }[];
  biteProgress: number;
  isPlayer: boolean;
  ultimateUsed: boolean;
}

export interface GameState {
  player: CombatantState | null;
  opponent: CombatantState | null;
  turnNumber: number;
  log: string[];
  winner: 'player' | 'opponent' | null;
  phase: 'select' | 'battle' | 'victory';
  lastAttackerWasPlayer: boolean;
  gameMode: '1v1' | 'team';
  playerTeam: CombatantState[];
  opponentTeam: CombatantState[];
  awaitingSwitch: 'player' | 'opponent' | null;
}

export type GameAction =
  | { type: 'START_BATTLE'; playerDino: DinoId; opponentDino: DinoId }
  | { type: 'START_TEAM_BATTLE'; playerTeam: DinoId[]; opponentTeam: DinoId[] }
  | { type: 'SWITCH_TEAM_MEMBER'; attacker: 'player' | 'opponent'; nextDinoId: DinoId }
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
    isPlayer,
    ultimateUsed: false,
  };
}

export function getRequiredBites(_attacker: DinoId, defender: DinoId): number {
  const defenderToughness = DINOSAURS[defender].hideToughness;
  if (defenderToughness === 'low') return 1;
  if (defenderToughness === 'medium') return 2;
  return 3;
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
        lastAttackerWasPlayer: false,
        gameMode: '1v1',
        playerTeam: [],
        opponentTeam: [],
        awaitingSwitch: null,
      };

    case 'START_TEAM_BATTLE': {
      const [pFirst, ...pBench] = action.playerTeam.map(id => initializeCombatant(id, true));
      const [oFirst, ...oBench] = action.opponentTeam.map(id => initializeCombatant(id, false));
      return {
        ...state,
        player: pFirst,
        opponent: oFirst,
        playerTeam: pBench,
        opponentTeam: oBench,
        turnNumber: 1,
        log: [`Team Battle! ${DINOSAURS[pFirst.dinoId].name} vs ${DINOSAURS[oFirst.dinoId].name}`],
        phase: 'battle',
        winner: null,
        lastAttackerWasPlayer: false,
        gameMode: 'team',
        awaitingSwitch: null,
      };
    }

    case 'SWITCH_TEAM_MEMBER': {
      const isPlayer = action.attacker === 'player';
      const bench = isPlayer ? state.playerTeam : state.opponentTeam;
      const nextMember = bench.find(m => m.dinoId === action.nextDinoId);
      if (!nextMember) return state;
      const freshMember = initializeCombatant(action.nextDinoId, isPlayer);
      const newBench = bench.filter(m => m.dinoId !== action.nextDinoId);
      const base = DINOSAURS[action.nextDinoId];
      const log = [...state.log, `${base.name} enters the battle!`];
      return {
        ...state,
        player: isPlayer ? freshMember : state.player,
        opponent: !isPlayer ? freshMember : state.opponent,
        playerTeam: isPlayer ? newBench : state.playerTeam,
        opponentTeam: !isPlayer ? newBench : state.opponentTeam,
        awaitingSwitch: null,
        log,
      };
    }

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

      if (ability.isUltimate) attackerState.ultimateUsed = true;

      const isIntimidated = attackerState.statusEffects.some(e => e.type === 'intimidated');
      if (isIntimidated && damage > 0) {
        damage = Math.floor(damage * 0.65);
        newLog.push(`${attackerBase.name} is intimidated — attack weakened!`);
      }

      const isBite = ability.name.toLowerCase().includes('bite') || ability.id.includes('bite');
      if (isBite && !ability.isUltimate) {
        const requiredBites = getRequiredBites(attackerState.dinoId, defenderState.dinoId);
        if (requiredBites > 1) {
          if (attackerState.biteProgress < requiredBites - 1) {
            attackerState.biteProgress += 1;
            damage = Math.floor(damage / 3);
            newLog.push(`Thick hide! Bite is glancing. Penetration: ${attackerState.biteProgress}/${requiredBites}`);
          } else {
            attackerState.biteProgress = requiredBites;
            newLog.push(`Hide penetrated! Dealing full bite damage!`);
          }
        }
      }

      if (ability.id === 'death_roll') {
        const bonusDmg = Math.floor(defenderBase.maxHp * 0.12);
        damage += bonusDmg;
        newLog.push(`Death roll tears through armor! +${bonusDmg} bonus damage!`);
      }

      if (ability.id === 'pack_feint') {
        attackerState.statusEffects.push({ type: 'evade', duration: 1 });
        newLog.push(`${attackerBase.name} is braced to dodge the next attack!`);
      }
      if (ability.id === 'aerial_dodge') {
        attackerState.statusEffects.push({ type: 'evade', duration: 1 });
        newLog.push(`${attackerBase.name} takes to the air — 60% dodge chance!`);
      }
      if (ability.id === 'body_slam' || ability.id === 'apex_domination') {
        defenderState.statusEffects.push({ type: 'stunned', duration: 1 });
        newLog.push(`${defenderBase.name} was stunned and loses their next move!`);
      }
      if (ability.id === 'rex_roar') {
        defenderState.statusEffects.push({ type: 'stunned', duration: 1 });
        newLog.push(`${defenderBase.name} is paralysed with fear — loses next move!`);
      }
      if (ability.id === 'roar') {
        defenderState.statusEffects.push({ type: 'intimidated', duration: 2 });
        newLog.push(`${defenderBase.name} is intimidated — attack reduced for 2 turns!`);
      }
      if (ability.id === 'tail_sweep_giga' || ability.id === 'stomp') {
        defenderState.statusEffects.push({ type: 'slowed', duration: 2 });
        newLog.push(`${defenderBase.name} is slowed — speed halved for 2 turns!`);
      }
      if (ability.id === 'screech' || ability.id === 'screech_dive') {
        defenderState.statusEffects.push({ type: 'blinded', duration: 1 });
        newLog.push(`${defenderBase.name} is blinded — 40% miss chance next attack!`);
      }

      if (ability.id === 'ambush_strike' && !state.lastAttackerWasPlayer) {
        const bonus = 12;
        damage += bonus;
        newLog.push(`Ambush! Opponent was open after attacking — +${bonus} bonus damage!`);
      }

      const isBlinded = attackerState.statusEffects.some(e => e.type === 'blinded');
      if (isBlinded && ability.type === 'attack' && Math.random() < 0.4) {
        damage = 0;
        newLog.push(`${attackerBase.name} is blinded and missed the attack!`);
      }

      const hasEvade = defenderState.statusEffects.find(e => e.type === 'evade');
      if (hasEvade && ability.type === 'attack') {
        const evadeChance = defenderState.dinoId === 'pterodactylus' ? 0.6 : 0.5;
        if (Math.random() < evadeChance) {
          damage = 0;
          newLog.push(`${defenderBase.name} dodged the attack!`);
        } else {
          newLog.push(`${defenderBase.name} tried to dodge but failed!`);
        }
        defenderState.statusEffects = defenderState.statusEffects.filter(e => e.type !== 'evade');
      }

      if (damage > 0 && ability.type === 'attack') {
        newLog.push(`Dealt ${damage} damage.`);
      }

      const newDefenderHp = Math.max(0, defenderState.hp - damage);
      const newAttackerStamina = Math.max(0, attackerState.stamina - ability.staminaCost + 5);

      attackerState.statusEffects = attackerState.statusEffects
        .map(e => ({ ...e, duration: e.duration - 1 }))
        .filter(e => e.duration > 0);

      defenderState.hp = newDefenderHp;
      attackerState.stamina = newAttackerStamina;

      let winner: 'player' | 'opponent' | null = state.winner;
      let awaitingSwitch: 'player' | 'opponent' | null = state.awaitingSwitch;

      if (newDefenderHp === 0) {
        newLog.push(`${defenderBase.name} was defeated!`);
        if (state.gameMode === '1v1') {
          winner = isPlayerAttacking ? 'player' : 'opponent';
        } else {
          const remainingBench = isPlayerAttacking ? state.opponentTeam : state.playerTeam;
          if (remainingBench.length === 0) {
            winner = isPlayerAttacking ? 'player' : 'opponent';
            newLog.push(isPlayerAttacking ? 'All enemy dinosaurs defeated — VICTORY!' : 'Your entire team has fallen!');
          } else {
            awaitingSwitch = isPlayerAttacking ? 'opponent' : 'player';
            newLog.push(isPlayerAttacking
              ? `Opponent still has ${remainingBench.length} fighter(s)!`
              : `You still have ${remainingBench.length} fighter(s) — send in your next!`);
          }
        }
      }

      return {
        ...state,
        player: isPlayerAttacking ? attackerState : defenderState,
        opponent: isPlayerAttacking ? defenderState : attackerState,
        log: newLog,
        turnNumber: state.turnNumber + (isPlayerAttacking ? 0 : 1),
        winner,
        phase: winner ? 'victory' : state.phase,
        lastAttackerWasPlayer: isPlayerAttacking,
        awaitingSwitch,
      };
    }

    case 'REST': {
      if (!state.player || !state.opponent || state.winner) return state;

      const isPlayerAttacking = action.attacker === 'player';
      const attackerState = isPlayerAttacking ? { ...state.player } : { ...state.opponent };
      const attackerBase = DINOSAURS[attackerState.dinoId];

      attackerState.stamina = Math.min(attackerBase.maxStamina, attackerState.stamina + 25);
      attackerState.statusEffects = attackerState.statusEffects
        .map(e => ({ ...e, duration: e.duration - 1 }))
        .filter(e => e.duration > 0);

      const newLog = [...state.log, `${attackerBase.name} rested and recovered 25 stamina.`];

      return {
        ...state,
        player: isPlayerAttacking ? attackerState : state.player,
        opponent: !isPlayerAttacking ? attackerState : state.opponent,
        log: newLog,
        turnNumber: state.turnNumber + (isPlayerAttacking ? 0 : 1),
        lastAttackerWasPlayer: isPlayerAttacking,
      };
    }

    case 'RESET': {
      return {
        player: null,
        opponent: null,
        turnNumber: 0,
        log: [],
        winner: null,
        phase: 'select',
        lastAttackerWasPlayer: false,
        gameMode: '1v1',
        playerTeam: [],
        opponentTeam: [],
        awaitingSwitch: null,
      };
    }

    default:
      return state;
  }
}
