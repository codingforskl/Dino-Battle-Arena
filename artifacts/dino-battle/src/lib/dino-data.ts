export type DinoId = 'velociraptor' | 'giganotosaurus' | 'spinosaurus' | 'trex' | 'pterodactylus';

export type AbilityId = string;

export interface Ability {
  id: AbilityId;
  name: string;
  description: string;
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
  stunned: 'Stunned — Cannot act this turn. Loses next move completely.',
  intimidated: 'Intimidated — Attack power reduced by 35% for 2 turns. Prey instincts kicked in!',
  evade: 'Evasive — 50% chance to dodge the next incoming attack.',
  blinded: 'Blinded — 40% chance to miss next attack. Vision disrupted!',
  slowed: 'Slowed — Speed stat halved for 2 turns. Movement impaired.',
};

export const DINOSAURS: Record<DinoId, DinoBase> = {
  velociraptor: {
    id: 'velociraptor',
    name: 'Velociraptor',
    height: 0.5,
    maxHp: 80,
    baseSpeed: 95,
    maxStamina: 70,
    biteForce: 500,
    hideToughness: 'low',
    abilities: [
      { id: 'sickle_claw', name: 'Sickle Claw', description: 'Fast melee slash with hooked killing claw', staminaCost: 8, type: 'attack', damage: 12 },
      { id: 'pack_feint', name: 'Pack Feint', description: 'Dodge the next attack (50% chance)', staminaCost: 15, type: 'buff' },
      { id: 'leap_strike', name: 'Leap Strike', description: 'Jumping pounce — high damage', staminaCost: 20, type: 'attack', damage: 25 },
      { id: 'bite_raptor', name: 'Bite', description: 'Low damage, needs 3 bites on thick hide', staminaCost: 10, type: 'attack', damage: 15 },
      { id: 'frenzy_blitz', name: 'FRENZY BLITZ', description: '5-slash frenzy — ignores hide toughness, massive damage', staminaCost: 45, type: 'attack', damage: 55, isUltimate: true },
    ]
  },
  giganotosaurus: {
    id: 'giganotosaurus',
    name: 'Giganotosaurus',
    height: 4.0,
    maxHp: 200,
    baseSpeed: 45,
    maxStamina: 90,
    biteForce: 35000,
    hideToughness: 'high',
    abilities: [
      { id: 'crushing_bite', name: 'Crushing Bite', description: 'Enormous jaw force — massive damage', staminaCost: 25, type: 'attack', damage: 45 },
      { id: 'body_slam', name: 'Body Slam', description: 'Full body collision — stuns opponent 1 turn', staminaCost: 18, type: 'attack', damage: 20 },
      { id: 'tail_sweep_giga', name: 'Tail Sweep', description: 'Sweeping tail — slows opponent speed', staminaCost: 15, type: 'attack', damage: 18 },
      { id: 'roar', name: 'Roar', description: 'Terrifying roar — intimidates, reduces attack', staminaCost: 12, type: 'debuff' },
      { id: 'apex_domination', name: 'APEX DOMINATION', description: 'Ground-shaking stomp — stuns AND deals crushing damage', staminaCost: 50, type: 'attack', damage: 65, isUltimate: true },
    ]
  },
  spinosaurus: {
    id: 'spinosaurus',
    name: 'Spinosaurus',
    height: 2.7,
    maxHp: 170,
    baseSpeed: 60,
    maxStamina: 80,
    biteForce: 8000,
    hideToughness: 'medium',
    abilities: [
      { id: 'sail_slam', name: 'Sail Slam', description: 'Strike with neural spine sail', staminaCost: 15, type: 'attack', damage: 22 },
      { id: 'tail_whip', name: 'Tail Whip', description: 'Long-range sweeping tail attack', staminaCost: 12, type: 'attack', damage: 18 },
      { id: 'ambush_strike', name: 'Ambush Strike', description: 'Bonus damage if opponent attacked last turn', staminaCost: 18, type: 'attack', damage: 20 },
      { id: 'bite_spino', name: 'Bite', description: 'Strong bite — penetrates medium hide in 1 hit', staminaCost: 14, type: 'attack', damage: 25 },
      { id: 'death_roll', name: 'DEATH ROLL', description: 'Crocodile death roll — ignores armor, deals % of max HP', staminaCost: 42, type: 'attack', damage: 50, isUltimate: true },
    ]
  },
  trex: {
    id: 'trex',
    name: 'T-Rex',
    height: 3.7,
    maxHp: 220,
    baseSpeed: 28,
    maxStamina: 85,
    biteForce: 57000,
    hideToughness: 'high',
    abilities: [
      { id: 'rex_bite', name: 'Rex Bite', description: 'Bone-crushing jaw force — penetrates any hide', staminaCost: 22, type: 'attack', damage: 42 },
      { id: 'stomp', name: 'Ground Stomp', description: 'Thunderous stomp — slows the opponent', staminaCost: 14, type: 'attack', damage: 20 },
      { id: 'headbutt', name: 'Headbutt', description: 'Battering ram skull strike', staminaCost: 18, type: 'attack', damage: 28 },
      { id: 'rex_roar', name: 'Predator Roar', description: 'Paralyses with fear — stuns opponent 1 turn', staminaCost: 20, type: 'debuff' },
      { id: 'tyrants_wrath', name: "TYRANT'S WRATH", description: 'Most powerful bite ever — devastates any target', staminaCost: 55, type: 'attack', damage: 85, isUltimate: true },
    ]
  },
  pterodactylus: {
    id: 'pterodactylus',
    name: 'Pterodactylus',
    height: 0.4,
    maxHp: 65,
    baseSpeed: 115,
    maxStamina: 60,
    biteForce: 300,
    hideToughness: 'low',
    abilities: [
      { id: 'talon_rake', name: 'Talon Rake', description: 'Razor talons rake across the target', staminaCost: 8, type: 'attack', damage: 14 },
      { id: 'aerial_dodge', name: 'Aerial Dodge', description: 'Takes to the air — 60% dodge chance', staminaCost: 12, type: 'buff' },
      { id: 'beak_stab', name: 'Beak Stab', description: 'Precision pointed beak jab', staminaCost: 10, type: 'attack', damage: 18 },
      { id: 'screech', name: 'Screech', description: 'Piercing screech — blinds opponent, 40% miss chance', staminaCost: 14, type: 'debuff' },
      { id: 'screech_dive', name: 'SCREECH DIVE', description: 'Full-speed aerial dive bomb — blinds AND massive impact', staminaCost: 40, type: 'attack', damage: 45, isUltimate: true },
    ]
  }
};
