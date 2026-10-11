import type { RestaurantConfig } from './types';

/** Explorable demo outlet (used by tests / `npm run smoke`). Select with RESTAURANT=demo. */
export const demo: RestaurantConfig = {
  code: 'DEMO',
  brand: 'Demo Hospitality',
  name: 'Demo Cafe Goa',
  addressLines: ['Shop 4, Miramar Beach Road', 'Panaji, Goa 403001'],
  phone: '+91 98765 43210',
  gstin: '30ABCDE1234F1Z5',
  fssai: '11223344556677',
  businessHours: { open: '08:00', close: '23:30' },
  settings: { receiptFooter: 'Thank you for dining with us! Follow @democafegoa', serviceChargeBps: 0 },
  areas: [
    { name: 'AC Hall', tables: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'], capacity: 4 },
    { name: 'Non-AC', tables: ['N1', 'N2', 'N3', 'N4', 'N5', 'N6'], capacity: 4 },
    { name: 'Garden', tables: ['G1', 'G2', 'G3', 'G4'], capacity: 6 },
  ],
  taxSlabs: [
    { name: 'GST 0%', rateBps: 0 },
    { name: 'GST 5%', rateBps: 500 },
    { name: 'GST 12%', rateBps: 1200 },
    { name: 'GST 18%', rateBps: 1800 },
  ],
  defaultTax: 500,
  addonGroups: [
    {
      key: 'extras',
      name: 'Extras',
      maxSelect: 5,
      addons: [
        { name: 'Extra Cheese', price: 40 },
        { name: 'Extra Gravy', price: 30 },
        { name: 'Extra Paneer', price: 60 },
        { name: 'Extra Chicken', price: 80, food: 'NON_VEG' },
      ],
    },
    { key: 'spice', name: 'Spice level', minSelect: 0, maxSelect: 1, addons: [{ name: 'Mild', price: 0 }, { name: 'Medium', price: 0 }, { name: 'Extra Spicy', price: 0 }] },
    { key: 'bev', name: 'Beverage add-ons', maxSelect: 3, addons: [{ name: 'Extra Shot', price: 30 }, { name: 'Whipped Cream', price: 20 }, { name: 'Oat Milk', price: 40 }] },
  ],
  categories: [
    {
      name: 'Breakfast',
      availability: [{ days: [1, 2, 3, 4, 5, 6, 7], from: '07:00', to: '11:30' }],
      items: [
        { name: 'Poha', code: 'POH', price: 80 },
        { name: 'Masala Omelette', code: 'OML', price: 120, food: 'EGG', addons: ['spice'] },
        { name: 'Goan Bhaji Pao', code: 'BHP', price: 90 },
      ],
    },
    {
      name: 'Starters',
      items: [
        { name: 'Paneer Tikka', code: 'PT', price: 250, pack: 10, addons: ['extras', 'spice'], variations: [['Half', 250], ['Full', 420]] },
        { name: 'Chicken Tikka', code: 'CT', price: 320, food: 'NON_VEG', pack: 10, addons: ['spice'], variations: [['Half', 320], ['Full', 540]] },
        { name: 'Veg Spring Roll', code: 'VSR', price: 180, pack: 10 },
        { name: 'Chilli Chicken', code: 'CC', price: 290, food: 'NON_VEG', pack: 10, addons: ['spice'] },
        { name: 'Prawn Rava Fry', code: 'PRF', price: 380, food: 'NON_VEG', pack: 10 },
      ],
    },
    {
      name: 'Goan Specials',
      items: [
        { name: 'Goan Fish Curry Rice', code: 'FCR', price: 320, food: 'NON_VEG', pack: 15, desc: 'Kingfish curry with steamed rice' },
        { name: 'Chicken Xacuti', code: 'CX', price: 340, food: 'NON_VEG', pack: 15, addons: ['spice'] },
        { name: 'Pork Vindaloo', code: 'PV', price: 360, food: 'NON_VEG', pack: 15, addons: ['spice'] },
        { name: 'Veg Caldine', code: 'VC', price: 240, pack: 15 },
        { name: 'Prawn Balchao', code: 'PB', price: 390, food: 'NON_VEG', pack: 15 },
      ],
    },
    {
      name: 'Main Course',
      items: [
        { name: 'Paneer Butter Masala', code: 'PBM', price: 280, pack: 15, addons: ['extras', 'spice'], variations: [['Half', 280], ['Full', 450]] },
        { name: 'Dal Tadka', code: 'DT', price: 180, pack: 15, variations: [['Half', 180], ['Full', 290]] },
        { name: 'Butter Chicken', code: 'BC', price: 340, food: 'NON_VEG', pack: 15, addons: ['extras', 'spice'], variations: [['Half', 340], ['Full', 560]] },
        { name: 'Mutton Rogan Josh', code: 'MRJ', price: 420, food: 'NON_VEG', pack: 15, addons: ['spice'] },
        { name: 'Mix Veg', code: 'MV', price: 210, pack: 15 },
      ],
    },
    {
      name: 'Breads & Rice',
      station: 'TANDOOR',
      items: [
        { name: 'Butter Naan', code: 'BN', price: 50, pack: 3 },
        { name: 'Garlic Naan', code: 'GN', price: 60, pack: 3 },
        { name: 'Tandoori Roti', code: 'TR', price: 30, pack: 3 },
        { name: 'Jeera Rice', code: 'JR', price: 160, pack: 10 },
        { name: 'Chicken Biryani', code: 'CB', price: 320, food: 'NON_VEG', pack: 15, addons: ['spice'], variations: [['Regular', 320], ['Family', 850]] },
        { name: 'Veg Biryani', code: 'VB', price: 240, pack: 15, addons: ['spice'] },
      ],
    },
    {
      name: 'Beverages',
      station: 'BAR',
      items: [
        { name: 'Masala Chai', code: 'MC', price: 40 },
        { name: 'Cappuccino', code: 'CAP', price: 150, addons: ['bev'], variations: [['Regular', 150], ['Large', 190]] },
        { name: 'Cold Coffee', code: 'CCF', price: 170, addons: ['bev'] },
        { name: 'Fresh Lime Soda', code: 'FLS', price: 90, variations: [['Sweet', 90], ['Salted', 90], ['Mixed', 90]] },
        { name: 'Mineral Water 1L', code: 'MW', price: 40, tax: 1800 },
        { name: 'Kokum Sherbet', code: 'KS', price: 110 },
      ],
    },
    {
      name: 'Desserts',
      items: [
        { name: 'Bebinca', code: 'BEB', price: 150, pack: 5, desc: 'Traditional Goan layered pudding' },
        { name: 'Gulab Jamun', code: 'GJ', price: 110, pack: 5 },
        { name: 'Brownie with Ice Cream', code: 'BIC', price: 220, food: 'EGG', tax: 1800, pack: 5 },
      ],
    },
  ],
  printers: [
    { name: 'Counter printer', station: 'BILL', host: '192.168.1.50' },
    { name: 'Kitchen printer', station: 'KITCHEN', host: '192.168.1.51' },
    { name: 'Tandoor printer', station: 'TANDOOR', host: '192.168.1.51' },
    { name: 'Bar printer', station: 'BAR', host: '192.168.1.52' },
  ],
  demoUsers: [
    { name: 'Imran (Owner)', username: 'owner', password: 'owner123', pin: '1234', role: 'OWNER' },
    { name: 'Meera (Manager)', username: 'manager', password: 'manager123', pin: '1111', role: 'MANAGER' },
    { name: 'Asha (Cashier)', username: 'cashier', password: 'cashier123', pin: null, role: 'CASHIER' },
    { name: 'Rahul (Captain)', username: 'captain', password: 'captain123', pin: null, role: 'CAPTAIN' },
    { name: 'Kitchen', username: 'kitchen', password: 'kitchen123', pin: null, role: 'KITCHEN' },
  ],
  demoCustomers: [
    { phone: '9876500001', name: 'Priya Naik' },
    { phone: '9876500002', name: 'Joseph D’Souza' },
  ],
};
