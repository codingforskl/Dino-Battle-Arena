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
  phase: 'select' | 'explore' | 'battle' | 'victory';
  lastAttackerWasPlayer: boolean;
  gameMode: '1v1' | 'team' | 'hunt';
  playerTeam: CombatantState[];
  opponentTeam: CombatantState[];
  awaitingSwitch: 'player' | 'opponent' | null;
  playerCombo: number;
  opponentCombo: number;
  lastCrit: boolean;
  activeTurn: 'player' | 'opponent';
  roundStarter: 'player' | 'opponent';
  capturedDinos: DinoId[];
  huntRemainingWild: DinoId[];
  huntFledDinos: DinoId[];
}

export type GameAction =
  | { type: 'START_BATTLE'; playerDino: DinoId; opponentDino: DinoId }
  | { type: 'START_TEAM_BATTLE'; playerTeam: DinoId[]; opponentTeam: DinoId[] }
  | { type: 'START_EXPLORE' }
  | { type: 'ENCOUNTER_DINO'; wildDinoId: DinoId }
  | { type: 'RETURN_TO_EXPLORE' }
  | { type: 'SWITCH_TEAM_MEMBER'; attacker: 'player' | 'opponent'; nextDinoId: DinoId }
  | { type: 'USE_ABILITY'; abilityId: string; attacker: 'player' | 'opponent' }
  | { type: 'REST'; attacker: 'player' | 'opponent' }
  | { type: 'CAPTURE_ATTEMPT'; success: boolean }
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

function calcTurnOrder(playerDinoId: DinoId, oppDinoId: DinoId): 'player' | 'opponent' {
  const ps = DINOSAURS[playerDinoId].baseSpeed;
  const os = DINOSAURS[oppDinoId].baseSpeed;
  if (ps > os) return 'player';
  if (os > ps) return 'opponent';
  return Math.random() < 0.5 ? 'player' : 'opponent';
}

function applyBleedingAtTurnStart(
  combatant: CombatantState,
  log: string[],
  name: string
): CombatantState {
  const bleed = combatant.statusEffects.find(e => e.type === 'bleeding');
  if (!bleed) return combatant;
  const bleedDmg = 10;
  const newHp = Math.max(0, combatant.hp - bleedDmg);
  log.push(`🩸 ${name} is bleeding — takes ${bleedDmg} damage!`);
  return { ...combatant, hp: newHp };
}

const ALL_WILD: DinoId[] = ['velociraptor', 'giganotosaurus', 'spinosaurus', 'trex', 'pterodactylus'];

const EMPTY_STATE: GameState = {
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
  playerCombo: 0,
  opponentCombo: 0,
  lastCrit: false,
  activeTurn: 'player',
  roundStarter: 'player',
  capturedDinos: [],
  huntRemainingWild: [],
  huntFledDinos: [],
};

export const INITIAL_GAME_STATE: GameState = EMPTY_STATE;

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_BATTLE': {
      const activeTurn = calcTurnOrder(action.playerDino, action.opponentDino);
      return {
        ...EMPTY_STATE,
        player: initializeCombatant(action.playerDino, true),
        opponent: initializeCombatant(action.opponentDino, false),
        turnNumber: 1,
        log: [
          `Battle started! ${DINOSAURS[action.playerDino].name} vs ${DINOSAURS[action.opponentDino].name}`,
          activeTurn === 'player'
            ? `⚡ ${DINOSAURS[action.playerDino].name} is faster — YOU go first!`
            : `⚡ ${DINOSAURS[action.opponentDino].name} is faster — OPPONENT goes first!`,
        ],
        phase: 'battle',
        gameMode: '1v1',
        activeTurn,
        roundStarter: activeTurn,
      };
    }

    case 'START_TEAM_BATTLE': {
      const [pFirst, ...pBench] = action.playerTeam.map(id => initializeCombatant(id, true));
      const [oFirst, ...oBench] = action.opponentTeam.map(id => initializeCombatant(id, false));
      const activeTurn = calcTurnOrder(pFirst.dinoId, oFirst.dinoId);
      return {
        ...EMPTY_STATE,
        player: pFirst,
        opponent: oFirst,
        playerTeam: pBench,
        opponentTeam: oBench,
        turnNumber: 1,
        log: [
          `Team Battle! ${DINOSAURS[pFirst.dinoId].name} vs ${DINOSAURS[oFirst.dinoId].name}`,
          activeTurn === 'player' ? `⚡ YOU go first!` : `⚡ OPPONENT goes first!`,
        ],
        phase: 'battle',
        gameMode: 'team',
        activeTurn,
        roundStarter: activeTurn,
      };
    }

    case 'START_EXPLORE': {
      const shuffled = [...ALL_WILD].sort(() => Math.random() - 0.5);
      return {
        ...EMPTY_STATE,
        phase: 'explore',
        gameMode: 'hunt',
        huntRemainingWild: shuffled,
        capturedDinos: [],
        huntFledDinos: [],
      };
    }

    case 'ENCOUNTER_DINO': {
      const activeTurn = calcTurnOrder('hunter', action.wildDinoId);
      return {
        ...state,
        player: initializeCombatant('hunter', true),
        opponent: initializeCombatant(action.wildDinoId, false),
        huntRemainingWild: state.huntRemainingWild.filter(id => id !== action.wildDinoId),
        turnNumber: 1,
        log: [
          `🌿 Wild ${DINOSAURS[action.wildDinoId].name} emerges from the wild!`,
          activeTurn === 'player' ? `⚡ Hunter moves first!` : `⚡ Wild ${DINOSAURS[action.wildDinoId].name} strikes first!`,
        ],
        phase: 'battle',
        gameMode: 'hunt',
        winner: null,
        activeTurn,
        roundStarter: activeTurn,
        playerCombo: 0,
        opponentCombo: 0,
        lastCrit: false,
      };
    }

    case 'RETURN_TO_EXPLORE': {
      // Re-add the current opponent back to the wild (they won, they escaped)
      const readdQueue = state.opponent
        ? [state.opponent.dinoId, ...state.huntRemainingWild]
        : state.huntRemainingWild;
      return {
        ...state,
        player: null,
        opponent: null,
        phase: 'explore',
        winner: null,
        turnNumber: 0,
        log: [],
        playerCombo: 0,
        opponentCombo: 0,
        lastCrit: false,
        activeTurn: 'player',
        huntRemainingWild: readdQueue,
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
      const playerDinoId = isPlayer ? action.nextDinoId : state.player!.dinoId;
      const oppDinoId = !isPlayer ? action.nextDinoId : state.opponent!.dinoId;
      const activeTurn = calcTurnOrder(playerDinoId, oppDinoId);
      return {
        ...state,
        player: isPlayer ? freshMember : state.player,
        opponent: !isPlayer ? freshMember : state.opponent,
        playerTeam: isPlayer ? newBench : state.playerTeam,
        opponentTeam: !isPlayer ? newBench : state.opponentTeam,
        awaitingSwitch: null,
        activeTurn,
        roundStarter: activeTurn,
        log: [...state.log, `${base.name} enters the battle!`, activeTurn === 'player' ? `⚡ YOU go first!` : `⚡ OPPONENT goes first!`],
      };
    }

    case 'CAPTURE_ATTEMPT': {
      if (!state.player || !state.opponent) return state;
      const wildBase = DINOSAURS[state.opponent.dinoId];
      const capturedId = state.opponent.dinoId;

      if (action.success) {
        const newCaptured = [...state.capturedDinos, capturedId];
        const newQueue = state.huntRemainingWild;
        const allDone = newCaptured.length + state.huntFledDinos.length >= ALL_WILD.length;
        if (allDone || newQueue.length === 0) {
          return {
            ...state,
            capturedDinos: newCaptured,
            huntRemainingWild: [],
            winner: 'player',
            phase: 'victory',
            log: [...state.log, `🎉 ${wildBase.name} captured! You caught ALL dinosaurs — LEGENDARY HUNTER!`],
          };
        }
        return {
          ...state,
          capturedDinos: newCaptured,
          phase: 'explore',
          player: null,
          opponent: null,
          winner: null,
          playerCombo: 0,
          opponentCombo: 0,
          lastCrit: false,
          log: [...state.log, `🎉 ${wildBase.name} captured! Return to the world to find the next one!`],
        };
      } else {
        const enragedOpponent = {
          ...state.opponent,
          statusEffects: [
            ...state.opponent.statusEffects.filter(e => e.type !== 'enraged'),
            { type: 'enraged', duration: 2 },
          ],
        };
        return {
          ...state,
          opponent: enragedOpponent,
          log: [...state.log, `❌ Net missed! ${wildBase.name} breaks free — ENRAGED for 2 turns! +25% damage!`],
        };
      }
    }

    case 'USE_ABILITY': {
      if (!state.player || !state.opponent || state.winner) return state;

      const isPlayerAttacking = action.attacker === 'player';
      let attackerState = isPlayerAttacking ? { ...state.player } : { ...state.opponent };
      let defenderState = isPlayerAttacking ? { ...state.opponent } : { ...state.player };

      const attackerBase = DINOSAURS[attackerState.dinoId];
      const defenderBase = DINOSAURS[defenderState.dinoId];
      const ability = attackerBase.abilities.find(a => a.id === action.abilityId);

      if (!ability || attackerState.stamina < ability.staminaCost) return state;

      let newLog = [...state.log];

      attackerState = applyBleedingAtTurnStart(attackerState, newLog, attackerBase.name);
      if (attackerState.hp === 0) {
        newLog.push(`${attackerBase.name} bled out before they could act!`);
        const winner: 'player' | 'opponent' = isPlayerAttacking ? 'opponent' : 'player';
        return {
          ...state,
          player: isPlayerAttacking ? attackerState : defenderState,
          opponent: isPlayerAttacking ? defenderState : attackerState,
          log: newLog, winner, phase: 'victory', lastCrit: false,
        };
      }

      newLog.push(`${attackerBase.name} used ${ability.name}!`);

      let damage = ability.damage || 0;
      let isCrit = false;

      if (ability.isUltimate) attackerState.ultimateUsed = true;

      if (attackerState.statusEffects.some(e => e.type === 'intimidated') && damage > 0) {
        damage = Math.floor(damage * 0.65);
        newLog.push(`${attackerBase.name} is intimidated — attack weakened!`);
      }

      const hpPct = attackerState.hp / attackerBase.maxHp;
      if (hpPct < 0.22 && damage > 0) {
        damage = Math.floor(damage * 1.25);
        newLog.push(`🔥 DESPERATE FURY! +25% damage!`);
      }

      if (attackerState.statusEffects.some(e => e.type === 'enraged') && damage > 0) {
        damage = Math.floor(damage * 1.25);
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
            newLog.push(`Hide penetrated! Full bite damage!`);
          }
        }
      }

      if (ability.id === 'death_roll') {
        const bonusDmg = Math.floor(defenderBase.maxHp * 0.12);
        damage += bonusDmg;
        newLog.push(`Death roll tears through armor! +${bonusDmg} bonus!`);
      }

      if (ability.id === 'ambush_strike' && !state.lastAttackerWasPlayer) {
        damage += 12;
        newLog.push(`Ambush! +12 bonus damage!`);
      }

      if (damage > 0 && ability.type === 'attack') {
        const atkSpd = attackerState.statusEffects.some(e => e.type === 'slowed')
          ? Math.floor(attackerBase.baseSpeed / 2) : attackerBase.baseSpeed;
        const defSpd = defenderState.statusEffects.some(e => e.type === 'slowed')
          ? Math.floor(defenderBase.baseSpeed / 2) : defenderBase.baseSpeed;
        const ratio = atkSpd / Math.max(1, defSpd);
        let spdBonus = 0;
        if (ratio >= 3.0) spdBonus = 0.30;
        else if (ratio >= 2.0) spdBonus = 0.20;
        else if (ratio >= 1.4) spdBonus = 0.10;
        if (spdBonus > 0) {
          const bonusDmg = Math.floor(damage * spdBonus);
          damage += bonusDmg;
          newLog.push(`💨 Speed advantage! +${Math.round(spdBonus * 100)}% damage! (+${bonusDmg})`);
        }
      }

      const currentCombo = isPlayerAttacking ? state.playerCombo : state.opponentCombo;
      const newCombo = currentCombo + 1;
      if (newCombo >= 2 && damage > 0) {
        const pct = Math.min(newCombo - 1, 3) * 0.10;
        const bonusDmg = Math.floor(damage * pct);
        damage += bonusDmg;
        newLog.push(`🔗 Combo ×${newCombo}! +${Math.round(pct * 100)}% (+${bonusDmg})`);
      }

      if (damage > 0 && !ability.isUltimate && Math.random() < 0.15) {
        const critBonus = Math.floor(damage * 0.5);
        damage += critBonus;
        isCrit = true;
        newLog.push(`⚡ CRITICAL HIT! +${critBonus} bonus!`);
      }

      if (ability.id === 'pack_feint') {
        attackerState.statusEffects.push({ type: 'evade', duration: 1 });
        newLog.push(`${attackerBase.name} braced to dodge!`);
      }
      if (ability.id === 'aerial_dodge') {
        attackerState.statusEffects.push({ type: 'evade', duration: 1 });
        newLog.push(`${attackerBase.name} takes to the air — 60% dodge!`);
      }
      if (ability.id === 'raptor_surround') {
        defenderState.statusEffects.push({ type: 'stunned', duration: 1 });
        newLog.push(`${defenderBase.name} is surrounded — STUNNED!`);
      }
      if (ability.id === 'jugular_slash') {
        defenderState.statusEffects.push({ type: 'bleeding', duration: 3 });
        newLog.push(`🩸 ${defenderBase.name} is BLEEDING for 3 turns!`);
      }
      if (ability.id === 'terror_dive') {
        defenderState.statusEffects.push({ type: 'stunned', duration: 1 });
        newLog.push(`${defenderBase.name} battered from above — STUNNED!`);
      }
      if (ability.id === 'body_slam' || ability.id === 'apex_domination') {
        defenderState.statusEffects.push({ type: 'stunned', duration: 1 });
        newLog.push(`${defenderBase.name} STUNNED — loses next move!`);
      }
      if (ability.id === 'rex_roar') {
        defenderState.statusEffects.push({ type: 'stunned', duration: 1 });
        newLog.push(`${defenderBase.name} paralysed with fear — STUNNED!`);
      }
      if (ability.id === 'roar') {
        defenderState.statusEffects.push({ type: 'intimidated', duration: 2 });
        newLog.push(`${defenderBase.name} intimidated — attack reduced 2 turns!`);
      }
      if (ability.id === 'tail_sweep_giga' || ability.id === 'stomp') {
        defenderState.statusEffects.push({ type: 'slowed', duration: 2 });
        newLog.push(`${defenderBase.name} SLOWED — speed halved 2 turns!`);
      }
      if (ability.id === 'screech' || ability.id === 'screech_dive') {
        defenderState.statusEffects.push({ type: 'blinded', duration: 1 });
        newLog.push(`${defenderBase.name} BLINDED — 40% miss chance!`);
      }

      if (attackerState.statusEffects.some(e => e.type === 'blinded') && ability.type === 'attack' && Math.random() < 0.4) {
        damage = 0;
        isCrit = false;
        newLog.push(`${attackerBase.name} is blinded and missed!`);
      }

      const hasEvade = defenderState.statusEffects.find(e => e.type === 'evade');
      if (hasEvade && ability.type === 'attack') {
        const evadeChance = defenderState.dinoId === 'pterodactylus' ? 0.6 : 0.5;
        if (Math.random() < evadeChance) {
          damage = 0; isCrit = false;
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

      const newActiveTurn: 'player' | 'opponent' = isPlayerAttacking ? 'opponent' : 'player';
      const newPlayerCombo = isPlayerAttacking ? newCombo : 0;
      const newOpponentCombo = !isPlayerAttacking ? newCombo : 0;

      let winner: 'player' | 'opponent' | null = state.winner;
      let awaitingSwitch: 'player' | 'opponent' | null = state.awaitingSwitch;
      let huntFledOut: DinoId[] = state.huntFledDinos;
      let nextPhase: GameState['phase'] | null = null;

      if (newDefenderHp === 0) {
        newLog.push(`${defenderBase.name} was defeated!`);
        if (state.gameMode === '1v1') {
          winner = isPlayerAttacking ? 'player' : 'opponent';
        } else if (state.gameMode === 'hunt') {
          if (isPlayerAttacking) {
            // Wild dino fled — auto-return to explore world
            newLog.push(`Wild ${defenderBase.name} fled into the wilderness — couldn't capture it!`);
            huntFledOut = [...state.huntFledDinos, defenderState.dinoId];
            const allDone = state.capturedDinos.length + huntFledOut.length >= ALL_WILD.length;
            if (allDone) {
              winner = 'player';
              nextPhase = 'victory';
            } else {
              winner = null;
              nextPhase = 'explore';
            }
          } else {
            winner = 'opponent';
            newLog.push(`The dinosaur overpowered you! Return to the world to recover.`);
          }
        } else {
          const remainingBench = isPlayerAttacking ? state.opponentTeam : state.playerTeam;
          if (remainingBench.length === 0) {
            winner = isPlayerAttacking ? 'player' : 'opponent';
            newLog.push(isPlayerAttacking ? 'All enemy dinosaurs defeated — VICTORY!' : 'Your entire team has fallen!');
          } else {
            awaitingSwitch = isPlayerAttacking ? 'opponent' : 'player';
            newLog.push(isPlayerAttacking
              ? `Opponent has ${remainingBench.length} fighter(s) left!`
              : `You have ${remainingBench.length} fighter(s) left — choose your next!`);
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
        phase: nextPhase ?? (winner ? 'victory' : state.phase),
        lastAttackerWasPlayer: isPlayerAttacking,
        awaitingSwitch,
        playerCombo: newPlayerCombo,
        opponentCombo: newOpponentCombo,
        lastCrit: isCrit,
        activeTurn: winner ? state.activeTurn : newActiveTurn,
        huntFledDinos: huntFledOut,
      };
    }

    case 'REST': {
      if (!state.player || !state.opponent || state.winner) return state;

      const isPlayerAttacking = action.attacker === 'player';
      let attackerState = isPlayerAttacking ? { ...state.player } : { ...state.opponent };
      const attackerBase = DINOSAURS[attackerState.dinoId];
      let newLog = [...state.log];

      attackerState = applyBleedingAtTurnStart(attackerState, newLog, attackerBase.name);
      attackerState.stamina = Math.min(attackerBase.maxStamina, attackerState.stamina + 25);
      attackerState.statusEffects = attackerState.statusEffects
        .map(e => ({ ...e, duration: e.duration - 1 }))
        .filter(e => e.duration > 0);

      newLog.push(`${attackerBase.name} rested — +25 stamina.`);

      const newActiveTurn: 'player' | 'opponent' = isPlayerAttacking ? 'opponent' : 'player';
      const newPlayerCombo = isPlayerAttacking ? 0 : state.playerCombo;
      const newOpponentCombo = !isPlayerAttacking ? 0 : state.opponentCombo;

      return {
        ...state,
        player: isPlayerAttacking ? attackerState : state.player,
        opponent: !isPlayerAttacking ? attackerState : state.opponent,
        log: newLog,
        turnNumber: state.turnNumber + (isPlayerAttacking ? 0 : 1),
        lastAttackerWasPlayer: isPlayerAttacking,
        playerCombo: newPlayerCombo,
        opponentCombo: newOpponentCombo,
        lastCrit: false,
        activeTurn: newActiveTurn,
      };
    }

    case 'RESET':
      return EMPTY_STATE;

    default:
      return state;
  }
}
