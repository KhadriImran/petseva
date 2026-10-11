import { demo } from './demo';
import { tukaram } from './tukaram';
import type { RestaurantConfig } from './types';

/**
 * One file per restaurant. To onboard a new hotel: copy tukaram.ts, edit it, add it here,
 * then deploy a new Vercel project with RESTAURANT=<key> and its own database.
 */
export const RESTAURANTS: Record<string, RestaurantConfig> = { tukaram, demo };

export function getRestaurant(key = process.env.RESTAURANT ?? 'tukaram'): RestaurantConfig {
  const r = RESTAURANTS[key.toLowerCase()];
  if (!r) throw new Error(`Unknown RESTAURANT "${key}". Known: ${Object.keys(RESTAURANTS).join(', ')}`);
  return r;
}

export type { RestaurantConfig };
