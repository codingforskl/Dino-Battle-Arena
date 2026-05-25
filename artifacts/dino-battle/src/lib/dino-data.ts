export type DinoId = 'velociraptor' | 'giganotosaurus' | 'spinosaurus';

export type AbilityId = string;

export interface Ability {
  id: AbilityId;
  name: string;
  description: string;
  staminaCost: number;
  type: 'attack' | 'buff' | 'debuff' | 'utility';
  damage?: number;
  accuracy?: number; // 0-1
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
      { id: 'sickle_claw', name: 'Sickle Claw Slash', description: 'Fast melee, low damage but high speed bonus', staminaCost: 8, type: 'attack', damage: 12 },
      { id: 'pack_feint', name: 'Pack Feint', description: 'Dodge next attack (50% chance)', staminaCost: 15, type: 'buff' },
      { id: 'leap_strike', name: 'Leap Strike', description: 'Jumping attack, high damage', staminaCost: 20, type: 'attack', damage: 25 },
      { id: 'bite_raptor', name: 'Bite', description: 'Low damage, requires multiple bites for thick hide', staminaCost: 10, type: 'attack', damage: 15 }
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
      { id: 'crushing_bite', name: 'Crushing Bite', description: 'Massive damage', staminaCost: 25, type: 'attack', damage: 45 },
      { id: 'body_slam', name: 'Body Slam', description: 'Stuns opponent briefly', staminaCost: 18, type: 'attack', damage: 20 },
      { id: 'tail_sweep_giga', name: 'Tail Sweep', description: 'Knocks back, reduces opponent speed', staminaCost: 15, type: 'attack', damage: 18 },
      { id: 'roar', name: 'Roar', description: 'Intimidates, reduces opponent attack', staminaCost: 12, type: 'debuff' }
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
      { id: 'sail_slam', name: 'Sail Slam', description: 'Medium damage using neural spine', staminaCost: 15, type: 'attack', damage: 22 },
      { id: 'tail_whip', name: 'Tail Whip', description: 'Long-range tail attack', staminaCost: 12, type: 'attack', damage: 18 },
      { id: 'ambush_strike', name: 'Ambush Strike', description: 'Bonus damage if opponent attacked last turn', staminaCost: 18, type: 'attack', damage: 20 },
      { id: 'bite_spino', name: 'Bite', description: 'Medium damage, good penetration', staminaCost: 14, type: 'attack', damage: 25 }
    ]
  }
};
