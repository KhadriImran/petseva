import type { OutletSettings, RoleName } from '@rms/shared';

/**
 * Everything needed to set up one restaurant from scratch (first deploy / `npm run db:seed`).
 * Prices are in RUPEES here for readability; the seeder converts to paise.
 * A price of 0 means APS ("as per size" / market price): the POS asks for the price when the item is ordered.
 */
export interface ItemDef {
  name: string;
  /** quick-search code typed on the POS, e.g. "KFT" */
  code?: string;
  price: number;
  food?: 'VEG' | 'NON_VEG' | 'EGG';
  /** GST rate in basis points (500 = 5%); must match one of `taxSlabs` */
  tax?: number;
  /** packaging charge for takeaway/delivery, rupees */
  pack?: number;
  /** [name, price] pairs, e.g. [['Rawa Fry', 0], ['Tawa Fry', 0]] */
  variations?: [string, number][];
  /** keys of `addonGroups` */
  addons?: string[];
  station?: string;
  desc?: string;
}

export interface CategoryDef {
  name: string;
  /** KOT printer/station for the whole category (KITCHEN, BAR, …) */
  station?: string;
  /** default GST for items in this category (bps); an item's own `tax` wins */
  tax?: number;
  food?: 'VEG' | 'NON_VEG' | 'EGG';
  availability?: { days: number[]; from: string; to: string }[];
  items: ItemDef[];
}

export interface RestaurantConfig {
  /** unique outlet code; the seeder skips setup when an outlet with this code already exists */
  code: string;
  brand: string;
  name: string;
  addressLines: string[];
  phone?: string;
  gstin?: string;
  fssai?: string;
  businessHours: Record<string, unknown>;
  settings: Partial<OutletSettings>;
  areas: { name: string; tables: string[]; capacity: number }[];
  taxSlabs: { name: string; rateBps: number }[];
  /** default GST for items that don't say otherwise (bps) */
  defaultTax: number;
  addonGroups?: { key: string; name: string; minSelect?: number; maxSelect: number; addons: { name: string; price: number; food?: 'VEG' | 'NON_VEG' | 'EGG' }[] }[];
  categories: CategoryDef[];
  printers: { name: string; station: string; host?: string; port?: number; width?: 32 | 42 | 48 }[];
  /**
   * Staff created on first setup. Leave out for real restaurants: then only an OWNER account is created
   * (username `owner`, password from the SEED_OWNER_PASSWORD env var) and the owner adds staff in the POS → Staff page.
   */
  demoUsers?: { name: string; username: string; password: string; pin: string | null; role: RoleName }[];
  demoCustomers?: { phone: string; name: string }[];
}
