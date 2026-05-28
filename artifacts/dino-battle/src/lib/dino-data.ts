export type DinoId = 'velociraptor' | 'giganotosaurus' | 'spinosaurus' | 'trex' | 'pterodactylus';

export type AbilityId = string;

export interface Ability {
  id: AbilityId;
  name: string;
  description: string;
  shortEffect?: string;
  staminaCost: number;
  type: 'attack' | 'buff' | 'debuff' | 'utility';
  damage?: number;
  accuracy?: number;
  isUltimate?: boolean;
}

export interface DinoBase {
  id: DinoId;
  name: string;
  height: number;
  maxHp: number;
  baseSpeed: number;
  maxStamina: number;
  biteForce: number;
  hideToughness: 'low' | 'medium' | 'high';
  abilities: Ability[];
}

export const STATUS_TOOLTIPS: Record<string, string> = {
  stunned:     'Stunned — Cannot act this turn. Turn skipped automatically.',
  intimidated: 'Intimidated — Attack power reduced by 35% for 2 turns.',
  evade:       'Evasive — 50–60% chance to dodge the next incoming attack.',
  blinded:     'Blinded — 40% chance to miss next attack.',
  slowed:      'Slowed — Speed stat halved for 2 turns.',
  bleeding:    'Bleeding — Takes 10 damage at the start of each turn for 3 turns!',
  enraged:     'Enraged — Capture failed! +25% attack for 2 turns!',
};

export const DINOSAURS: Record<DinoId, DinoBase> = {
  velociraptor: {
    id: 'velociraptor',
    name: 'Velociraptor Pack',
    height: 0.5,
    maxHp: 168,
    baseSpeed: 115,
    maxStamina: 122,
    biteForce: 1200,
    hideToughness: 'low',
    abilities: [
      { id: 'sickle_claw',     name: 'Pack Slash',       description: 'Both raptors slash with hooked killing claws',                            shortEffect: 'Direct attack',               staminaCost: 10, type: 'attack',  damage: 20 },
      { id: 'pack_feint',      name: 'Pack Feint',        description: 'One distracts while the other flanks — 55% dodge chance next hit',        shortEffect: 'Grants 55% dodge chance',     staminaCost: 15, type: 'buff' },
      { id: 'raptor_surround', name: 'Raptor Surround',   description: 'Pack circles prey from all sides — stuns target 1 turn',                  shortEffect: 'Stuns opponent 1 turn',       staminaCost: 20, type: 'attack',  damage: 18 },
      { id: 'jugular_slash',   name: 'Jugular Slash',     description: 'Razor sickle claw slices the throat — causes bleeding 3 turns',           shortEffect: '🩸 Causes bleeding (3 turns)', staminaCost: 18, type: 'attack',  damage: 14 },
      { id: 'leap_strike',     name: 'Tag-Team Pounce',   description: 'Coordinated leaping strike from both sides',                              shortEffect: 'High-power double strike',    staminaCost: 22, type: 'attack',  damage: 34 },
      { id: 'frenzy_blitz',    name: 'PACK FRENZY',       description: 'Both raptors unleash a relentless 8-slash frenzy — ignores hide',         shortEffect: 'Ignores hide armor',          staminaCost: 46, type: 'attack',  damage: 78, isUltimate: true },
    ]
  },
  giganotosaurus: {
    id: 'giganotosaurus',
    name: 'Giganotosaurus',
    height: 4.0,
    maxHp: 228,
    baseSpeed: 48,
    maxStamina: 100,
    biteForce: 35000,
    hideToughness: 'high',
    abilities: [
      { id: 'crushing_bite',   name: 'Crushing Bite',   description: 'Enormous jaw clamps shut with earth-shaking force',                       shortEffect: 'Massive bite damage',              staminaCost: 25, type: 'attack', damage: 55 },
      { id: 'body_slam',       name: 'Body Slam',       description: 'Full body collision — stuns opponent 1 turn',                              shortEffect: 'Stuns opponent 1 turn',            staminaCost: 18, type: 'attack', damage: 28 },
      { id: 'tail_sweep_giga', name: 'Tail Sweep',      description: 'Wide sweeping tail — slows opponent and deals impact damage',              shortEffect: 'Slows opponent 2 turns',           staminaCost: 15, type: 'attack', damage: 26 },
      { id: 'roar',            name: 'Roar',            description: 'Terrifying roar — reduces opponent attack power for 2 turns',              shortEffect: 'Intimidates: -35% attack (2 turns)', staminaCost: 12, type: 'debuff' },
      { id: 'apex_domination', name: 'APEX DOMINATION', description: 'Ground-shaking stomp followed by crushing bite — stuns AND devastates',    shortEffect: 'Stuns + devastating damage',       staminaCost: 50, type: 'attack', damage: 80, isUltimate: true },
    ]
  },
  spinosaurus: {
    id: 'spinosaurus',
    name: 'Spinosaurus',
    height: 2.7,
    maxHp: 180,
    baseSpeed: 65,
    maxStamina: 88,
    biteForce: 8000,
    hideToughness: 'medium',
    abilities: [
      { id: 'sail_slam',    name: 'Sail Slam',        description: 'Drives the massive neural spine sail into the target',                    shortEffect: 'Sail spine impact',               staminaCost: 15, type: 'attack', damage: 26 },
      { id: 'tail_whip',    name: 'Tail Whip',        description: 'Long-range sweeping tail crack — hard to dodge',                         shortEffect: 'Hard to dodge long-range hit',    staminaCost: 12, type: 'attack', damage: 22 },
      { id: 'ambush_strike',name: 'Ambush Strike',    description: 'Bonus damage if opponent attacked last turn',                             shortEffect: 'Bonus damage if they hit last',   staminaCost: 18, type: 'attack', damage: 26 },
      { id: 'bite_spino',   name: 'Crocodilian Bite', description: 'Powerful conical teeth — penetrates medium hide in one bite',            shortEffect: 'Pierces medium hide',             staminaCost: 14, type: 'attack', damage: 30 },
      { id: 'death_roll',   name: 'DEATH ROLL',       description: 'Locks onto target and barrel-rolls — ignores armor, massive damage',      shortEffect: 'Ignores all armor',               staminaCost: 42, type: 'attack', damage: 58, isUltimate: true },
    ]
  },
  trex: {
    id: 'trex',
    name: 'T-Rex',
    height: 3.7,
    maxHp: 252,
    baseSpeed: 32,
    maxStamina: 96,
    biteForce: 57000,
    hideToughness: 'high',
    abilities: [
      { id: 'rex_bite',     name: 'Rex Bite',      description: 'Bone-shattering jaw force — most powerful bite on land',                    shortEffect: 'Bone-crushing bite',              staminaCost: 22, type: 'attack', damage: 52 },
      { id: 'stomp',        name: 'Ground Stomp',  description: 'Thunderous stomp sends shockwaves — slows opponent',                        shortEffect: 'Slows opponent 2 turns',          staminaCost: 14, type: 'attack', damage: 28 },
      { id: 'headbutt',     name: 'Headbutt',      description: 'Battering-ram skull strike that staggers anything it hits',                  shortEffect: 'Staggers opponent',               staminaCost: 18, type: 'attack', damage: 38 },
      { id: 'rex_roar',     name: 'Predator Roar', description: 'Paralyses prey with pure terror — stuns opponent 1 turn',                   shortEffect: 'Stuns opponent 1 turn',           staminaCost: 20, type: 'debuff' },
      { id: 'tyrants_wrath',name: "TYRANT'S WRATH",description: 'The most powerful bite in history — nothing survives this',                  shortEffect: 'Maximum power — nothing survives', staminaCost: 55, type: 'attack', damage: 100, isUltimate: true },
    ]
  },
  pterodactylus: {
    id: 'pterodactylus',
    name: 'Pterodactyl Flock',
    height: 1.2,
    maxHp: 188,
    baseSpeed: 132,
    maxStamina: 118,
    biteForce: 900,
    hideToughness: 'low',
    abilities: [
      { id: 'talon_rake',  name: 'Triple Talon Rake',   description: 'All three pterodactyls rake razor talons in simultaneous passes',        shortEffect: 'Triple simultaneous slash',        staminaCost: 10, type: 'attack', damage: 28 },
      { id: 'aerial_dodge',name: 'Flock Scatter',        description: 'Flock disperses into chaos — 60% dodge chance',                         shortEffect: 'Grants 60% dodge chance',         staminaCost: 14, type: 'buff' },
      { id: 'terror_dive', name: 'Terror Dive',          description: 'All three plunge talons-first at the skull — stuns + damage',            shortEffect: 'Stuns opponent 1 turn',           staminaCost: 20, type: 'attack', damage: 22 },
      { id: 'screech',     name: 'Flock Screech',        description: 'Deafening coordinated screech — blinds opponent',                        shortEffect: 'Blinds opponent (40% miss chance)', staminaCost: 16, type: 'debuff' },
      { id: 'beak_stab',   name: 'Synchronized Strike',  description: 'Three pointed beaks drive in from different angles at once',             shortEffect: 'Three-angle precision strike',     staminaCost: 14, type: 'attack', damage: 36 },
      { id: 'screech_dive',name: 'SWARM DIVE BOMB',      description: 'All three dive from altitude at terminal velocity — catastrophic impact', shortEffect: 'Terminal velocity catastrophe',    staminaCost: 44, type: 'attack', damage: 78, isUltimate: true },
    ]
  }
};
