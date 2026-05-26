import { DINOSAURS, DinoId, Ability } from './dino-data';

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
    isPlayer,
    ultimateUsed: false,
  };
}

export function getRequiredBites(_attacker: DinoId, defender: DinoId): number {
  const defenderToughness = DINOSAURS[defender].hideToughness;
  if (defenderToughness === 'low') return 1;
  if (defenderToughness === 'medium') return 2;
  return 3; // high
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

      // Mark ultimate as used
      if (ability.isUltimate) {
        attackerState.ultimateUsed = true;
      }

      // Apply intimidated debuff (35% damage reduction)
      const isIntimidated = attackerState.statusEffects.some(e => e.type === 'intimidated');
      if (isIntimidated && damage > 0) {
        damage = Math.floor(damage * 0.65);
        newLog.push(`${attackerBase.name} is intimidated — attack weakened!`);
      }

      // Bite penetration logic (applies to all bite moves and only affects damage, not ultimates)
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

      // Death Roll: deals % of target's max HP as bonus damage
      if (ability.id === 'death_roll') {
        const bonusDmg = Math.floor(defenderBase.maxHp * 0.12);
        damage += bonusDmg;
        newLog.push(`Death roll tears through armor! +${bonusDmg} bonus damage!`);
      }

      // Handle specific ability effects
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

      // Ambush strike bonus if opponent attacked last turn
      if (ability.id === 'ambush_strike' && !state.lastAttackerWasPlayer) {
        const bonus = 12;
        damage += bonus;
        newLog.push(`Ambush! Opponent was open after attacking — +${bonus} bonus damage!`);
      }

      // Blinded check on attacker
      const isBlinded = attackerState.statusEffects.some(e => e.type === 'blinded');
      if (isBlinded && ability.type === 'attack' && Math.random() < 0.4) {
        damage = 0;
        newLog.push(`${attackerBase.name} is blinded and missed the attack!`);
      }

      // Evade check on defender
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

      // Tick down status effect durations on end of attacker's turn
      attackerState.statusEffects = attackerState.statusEffects
        .map(e => ({ ...e, duration: e.duration - 1 }))
        .filter(e => e.duration > 0);

      // Also tick defender statuses that started this turn (debuffs applied above won't expire yet)
      // Tick statuses that were already on the defender before this turn
      defenderState.statusEffects = defenderState.statusEffects.map(e => {
        // Only tick effects that were pre-existing (not just applied — duration starts > 1 means it's new)
        return e;
      });

      let winner: 'player' | 'opponent' | null = state.winner;
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
        phase: winner ? 'victory' : state.phase,
        lastAttackerWasPlayer: isPlayerAttacking,
      };
    }

    case 'REST': {
      if (!state.player || !state.opponent || state.winner) return state;

      const isPlayerAttacking = action.attacker === 'player';
      const attackerState = isPlayerAttacking ? { ...state.player } : { ...state.opponent };
      const attackerBase = DINOSAURS[attackerState.dinoId];

      attackerState.stamina = Math.min(attackerBase.maxStamina, attackerState.stamina + 25);

      // Tick down statuses on rest
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
      };
    }

    default:
      return state;
  }
}
