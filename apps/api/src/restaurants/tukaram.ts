import type { RestaurantConfig } from './types';

/**
 * Tukaram Bar & Restaurant — Karaswada, Mapusa, Goa.
 * Menu taken from the printed menu cards. Price 0 = APS (as per size): the POS asks for today's price.
 *
 * Tax: menu prices are treated as FINAL (inclusive). Food is on GST 5%, liquor on "No GST" (liquor is
 * outside GST; Goa VAT is already in the price). Change in POS → Settings / Menu if the accountant says otherwise.
 */
const FISH_FRY = 'Special Fish Fry';

export const tukaram: RestaurantConfig = {
  code: 'TUKARAM',
  brand: 'Tukaram',
  name: 'Tukaram Bar & Restaurant',
  addressLines: ['Karaswada, Mapusa', 'Goa - 403526'],
  phone: '',
  gstin: '',
  fssai: '',
  businessHours: {
    sessions: [
      { open: '12:30', close: '16:00' },
      { open: '19:30', close: '22:00' },
    ],
  },
  settings: {
    taxInclusive: true,
    roundingMode: 'NEAREST_RUPEE',
    serviceChargeBps: 0,
    cashierMaxDiscountBps: 1000,
    receiptHeader: 'FRESH FISH & HOME FOOD',
    receiptFooter: 'Thank you! Visit again. Instagram: @tukaram_bar_restaurant',
    billPrefix: 'TBR',
    kotPrefix: 'KOT',
  },
  areas: [
    { name: 'Ground Floor', tables: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8'], capacity: 4 },
    { name: 'First Floor', tables: Array.from({ length: 15 }, (_, i) => `F${i + 1}`), capacity: 4 },
  ],
  taxSlabs: [
    { name: 'No GST (Liquor / exempt)', rateBps: 0 },
    { name: 'GST 5%', rateBps: 500 },
    { name: 'GST 18%', rateBps: 1800 },
  ],
  defaultTax: 500,
  categories: [
    {
      name: 'Special Fish Thali',
      food: 'NON_VEG',
      items: [
        { name: 'Kingfish Thali', code: 'KFT', price: 0 },
        { name: 'Chonak Thali', code: 'CHT', price: 0 },
        { name: 'Pomfret Thali', code: 'PFT', price: 0 },
        { name: 'Prawns Thali', code: 'PRT', price: 0 },
        { name: 'Baangda Thali', code: 'BGT', price: 0 },
      ],
    },
    {
      name: 'Veg Thali',
      items: [{ name: 'Veg Thali', code: 'VT', price: 100, food: 'VEG' }],
    },
    {
      name: FISH_FRY,
      food: 'NON_VEG',
      items: [
        { name: 'Kingfish', code: 'KF', price: 0, variations: [['Rawa Fry', 0], ['Tawa Fry', 0], ['Masala Fry', 0]] },
        { name: 'Chonak', code: 'CH', price: 0, variations: [['Rawa Fry', 0], ['Tawa Fry', 0], ['Masala Fry', 0]] },
        { name: 'Pomfret', code: 'PF', price: 0, variations: [['Rawa Fry', 0], ['Tawa Fry', 0], ['Recheado Fry', 0]] },
        { name: 'Prawns', code: 'PR', price: 0, variations: [['Rawa Fry', 0], ['Tawa Fry', 0], ['Masala Fry', 0], ['Golden Fry', 0]] },
        { name: 'Baangda', code: 'BG', price: 0, variations: [['Rawa Fry', 0], ['Tawa Fry', 0], ['Recheado Fry', 0]] },
        { name: 'Squids', code: 'SQ', price: 0, variations: [['Rawa Fry', 0], ['Tawa Fry', 0], ['Masala Fry', 0], ['Golden Fry', 0]] },
        { name: 'Shinanyo Rawa Fry', code: 'SH', price: 0 },
        { name: 'Lepo', code: 'LP', price: 0, variations: [['Rawa Fry', 0], ['Masala Fry', 0]] },
        { name: 'Tisryo Sukha', code: 'TS', price: 0 },
        { name: 'Crabs Sukha', code: 'CR', price: 0 },
      ],
    },
    {
      name: 'Chicken',
      food: 'NON_VEG',
      items: [
        // Rawa 240 / Tawa 250 from the menu card; Recheado had no printed price → APS. Please verify.
        { name: 'Chicken Fry', code: 'CK', price: 240, variations: [['Rawa Fry', 240], ['Tawa Fry', 250], ['Recheado Fry', 0]] },
      ],
    },
    {
      name: 'Dessert',
      items: [{ name: 'Serradura', code: 'SER', price: 110, food: 'VEG' }],
    },
    {
      name: 'Beverages',
      station: 'BAR',
      items: [
        { name: 'Virgin Mojito', code: 'VM', price: 150 },
        { name: 'Blue Lagoon', code: 'BL', price: 140 },
        { name: 'Fresh Lime Soda', code: 'FLS', price: 60, variations: [['Sweet', 60], ['Salted', 60], ['Mixed', 60]] },
        { name: 'Soft Drink', code: 'SD', price: 25 },
        { name: 'Plain Soda', code: 'PS', price: 10 },
        { name: 'Water Bottle', code: 'WB', price: 25 },
      ],
    },
    {
      name: 'Beer',
      station: 'BAR',
      tax: 0,
      items: [
        { name: 'Kingfisher Pint', code: 'KFP', price: 85 },
        { name: 'Kingfisher Quart', code: 'KFQ', price: 160 },
        { name: 'Kingfisher Ultra Pint', code: 'KUP', price: 95 },
        { name: 'Kingfisher Strong Quart', code: 'KSQ', price: 175 },
        { name: 'Budweiser Pint', code: 'BWP', price: 95 },
        { name: 'Budweiser Quart', code: 'BWQ', price: 180 },
        { name: 'Budweiser Magnum Quart', code: 'BMQ', price: 210 },
        { name: 'Carlsberg Pint', code: 'CBP', price: 95 },
        { name: 'Carlsberg Quart', code: 'CBQ', price: 180 },
        { name: 'Tuborg Pint', code: 'TBP', price: 90 },
        { name: 'Corona Pint', code: 'COP', price: 150 },
        { name: 'Heineken Pint', code: 'HNP', price: 110 },
        { name: 'Kings Pint', code: 'KGP', price: 120 },
        { name: 'Peoples Pint', code: 'PPP', price: 120 },
        { name: 'Maka Di Pint', code: 'MDP', price: 110 },
        { name: 'Breezer', code: 'BRZ', price: 120 },
      ],
    },
    {
      name: 'Whisky (60 ml)',
      station: 'BAR',
      tax: 0,
      items: [
        { name: "McDowell's No.1", code: 'MCD', price: 65 },
        { name: 'Royal Stag', code: 'RS', price: 75 },
        { name: 'Royal Challenge', code: 'RC', price: 75 },
        { name: "Blenders Pride", code: 'BP', price: 110 },
        { name: 'Signature', code: 'SIG', price: 105 },
        { name: 'Antiquity Blue', code: 'AB', price: 105 },
        { name: 'VAT 69', code: 'V69', price: 140 },
        { name: 'Black & White', code: 'BW', price: 150 },
        { name: 'Rockford', code: 'RF', price: 110 },
        { name: "Teacher's", code: 'TCH', price: 185 },
        { name: 'Red Label', code: 'RL', price: 210 },
        { name: 'Black Label', code: 'BLK', price: 330 },
        { name: 'Johnnie Walker Blonde', code: 'JWB', price: 280 },
        { name: 'Jameson', code: 'JAM', price: 270 },
        { name: 'Jim Beam', code: 'JB', price: 240 },
        { name: '100 Pipers', code: '100P', price: 160 },
        { name: "Dewar's", code: 'DEW', price: 170 },
      ],
    },
    {
      name: 'Vodka (60 ml)',
      station: 'BAR',
      tax: 0,
      items: [
        { name: 'Romanov', code: 'ROM', price: 70 },
        { name: 'Smirnoff', code: 'SMR', price: 110 },
        { name: 'Absolut', code: 'ABS', price: 260 },
        { name: 'Magic Moments', code: 'MM', price: 70 },
      ],
    },
    {
      name: 'Rum (60 ml)',
      station: 'BAR',
      tax: 0,
      items: [
        { name: 'Old Monk', code: 'OM', price: 60 },
        { name: 'Old Monk Coffee', code: 'OMC', price: 105 },
        { name: 'Black Bacardi', code: 'BBC', price: 65 },
        { name: 'Bacardi Limon', code: 'BCL', price: 110 },
        { name: 'Bacardi White', code: 'BCW', price: 110 },
      ],
    },
    {
      name: 'Brandy, Feni & Wine',
      station: 'BAR',
      tax: 0,
      items: [
        { name: 'Mansion House Brandy', code: 'MH', price: 65 },
        { name: 'Cashew Feni (Volando)', code: 'FEN', price: 120 },
        { name: 'Urrak', code: 'URK', price: 0, desc: 'Seasonal — as per serve' },
        { name: 'Red Wine', code: 'RW', price: 70 },
      ],
    },
  ],
  printers: [
    { name: 'Counter printer', station: 'BILL' },
    { name: 'Kitchen printer', station: 'KITCHEN' },
    { name: 'Bar printer', station: 'BAR' },
  ],
};
