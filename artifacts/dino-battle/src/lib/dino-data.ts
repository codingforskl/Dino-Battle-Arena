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
    name: 'Velociraptor Pack',
    height: 0.5,
    maxHp: 148,
    baseSpeed: 100,
    maxStamina: 108,
    biteForce: 1200,
    hideToughness: 'low',
    abilities: [
      { id: 'sickle_claw', name: 'Pack Slash', description: 'Both raptors slash simultaneously with their hooked killing claws', staminaCost: 10, type: 'attack', damage: 18 },
      { id: 'pack_feint', name: 'Pack Feint', description: 'One distracts while the other flanks — 55% dodge chance next hit', staminaCost: 15, type: 'buff' },
      { id: 'leap_strike', name: 'Tag-Team Pounce', description: 'Coordinated leaping strike from both sides', staminaCost: 22, type: 'attack', damage: 32 },
      { id: 'bite_raptor', name: 'Pack Bite', description: 'Two sets of jaws clamp down in unison', staminaCost: 12, type: 'attack', damage: 20 },
      { id: 'frenzy_blitz', name: 'PACK FRENZY', description: 'Both raptors unleash a relentless 8-slash frenzy — ignores hide entirely', staminaCost: 46, type: 'attack', damage: 68, isUltimate: true },
    ]
  },
  giganotosaurus: {
    id: 'giganotosaurus',
    name: 'Giganotosaurus',
    height: 4.0,
    maxHp: 215,
    baseSpeed: 48,
    maxStamina: 95,
    biteForce: 35000,
    hideToughness: 'high',
    abilities: [
      { id: 'crushing_bite', name: 'Crushing Bite', description: 'Enormous jaw clamps shut with earth-shaking force', staminaCost: 25, type: 'attack', damage: 50 },
      { id: 'body_slam', name: 'Body Slam', description: 'Full body collision — stuns opponent 1 turn', staminaCost: 18, type: 'attack', damage: 24 },
      { id: 'tail_sweep_giga', name: 'Tail Sweep', description: 'Wide sweeping tail — slows opponent and deals impact damage', staminaCost: 15, type: 'attack', damage: 22 },
      { id: 'roar', name: 'Roar', description: 'Terrifying roar that rattles the opponent — reduces attack power', staminaCost: 12, type: 'debuff' },
      { id: 'apex_domination', name: 'APEX DOMINATION', description: 'Ground-shaking stomp followed by a crushing bite — stuns AND devastates', staminaCost: 50, type: 'attack', damage: 72, isUltimate: true },
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
      { id: 'sail_slam', name: 'Sail Slam', description: 'Drives the massive neural spine sail into the target', staminaCost: 15, type: 'attack', damage: 26 },
      { id: 'tail_whip', name: 'Tail Whip', description: 'Long-range sweeping tail crack — hard to dodge', staminaCost: 12, type: 'attack', damage: 22 },
      { id: 'ambush_strike', name: 'Ambush Strike', description: 'Opportunistic lunge — deals bonus damage if opponent attacked last turn', staminaCost: 18, type: 'attack', damage: 26 },
      { id: 'bite_spino', name: 'Crocodilian Bite', description: 'Powerful conical teeth — penetrates medium hide in a single bite', staminaCost: 14, type: 'attack', damage: 30 },
      { id: 'death_roll', name: 'DEATH ROLL', description: 'Locks onto target and barrel-rolls — ignores armor, massive damage', staminaCost: 42, type: 'attack', damage: 58, isUltimate: true },
    ]
  },
  trex: {
    id: 'trex',
    name: 'T-Rex',
    height: 3.7,
    maxHp: 235,
    baseSpeed: 32,
    maxStamina: 90,
    biteForce: 57000,
    hideToughness: 'high',
    abilities: [
      { id: 'rex_bite', name: 'Rex Bite', description: 'Bone-shattering jaw force — the most powerful bite on land', staminaCost: 22, type: 'attack', damage: 48 },
      { id: 'stomp', name: 'Ground Stomp', description: 'Thunderous stomp sends shockwaves — slows the opponent', staminaCost: 14, type: 'attack', damage: 24 },
      { id: 'headbutt', name: 'Headbutt', description: 'Battering-ram skull strike that staggers anything it hits', staminaCost: 18, type: 'attack', damage: 34 },
      { id: 'rex_roar', name: 'Predator Roar', description: 'Paralyses prey with pure terror — stuns opponent for 1 turn', staminaCost: 20, type: 'debuff' },
      { id: 'tyrants_wrath', name: "TYRANT'S WRATH", description: 'The most powerful bite in history — nothing survives this', staminaCost: 55, type: 'attack', damage: 92, isUltimate: true },
    ]
  },
  pterodactylus: {
    id: 'pterodactylus',
    name: 'Pterodactyl Flock',
    height: 1.2,
    maxHp: 170,
    baseSpeed: 122,
    maxStamina: 102,
    biteForce: 900,
    hideToughness: 'low',
    abilities: [
      { id: 'talon_rake', name: 'Triple Talon Rake', description: 'All three pterodactyls rake razor talons in simultaneous passes', staminaCost: 10, type: 'attack', damage: 26 },
      { id: 'aerial_dodge', name: 'Flock Scatter', description: 'Flock disperses into chaos — impossible to track, 60% dodge chance', staminaCost: 14, type: 'buff' },
      { id: 'beak_stab', name: 'Synchronized Strike', description: 'Three pointed beaks drive in from different angles at once', staminaCost: 14, type: 'attack', damage: 34 },
      { id: 'screech', name: 'Flock Screech', description: 'Coordinated deafening screech from all three — blinds the opponent', staminaCost: 16, type: 'debuff' },
      { id: 'screech_dive', name: 'SWARM DIVE BOMB', description: 'All three dive from altitude at terminal velocity — catastrophic combined impact', staminaCost: 44, type: 'attack', damage: 66, isUltimate: true },
    ]
  }
};
