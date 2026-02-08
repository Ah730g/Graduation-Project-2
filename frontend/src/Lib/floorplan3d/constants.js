/**
 * ثوابت للعرض ثلاثي الأبعاد
 */

// الأبعاد الافتراضية (بالأمتار)
export const DEFAULT_WALL_HEIGHT = 2.5; // ارتفاع الجدار
export const DEFAULT_CEILING_HEIGHT = 2.7; // ارتفاع السقف
export const DEFAULT_WALL_THICKNESS = 0.2; // سماكة الجدار
export const DEFAULT_FLOOR_THICKNESS = 0.1; // سماكة الأرضية

// أبعاد الأثاث (بالأمتار)
export const FURNITURE_DIMENSIONS = {
  sofa: { width: 2.0, height: 0.9, depth: 0.9 },
  tv: { width: 1.5, height: 0.9, depth: 0.2 },
  coffee_table: { width: 1.2, height: 0.4, depth: 0.6 },
  bed: { width: 1.9, height: 0.6, depth: 2.2 },
  king_bed: { width: 2.2, height: 0.6, depth: 2.3 },
  wardrobe: { width: 1.2, height: 2.0, depth: 0.6 },
  nightstand: { width: 0.5, height: 0.5, depth: 0.4 },
  vanity: { width: 1.0, height: 0.8, depth: 0.5 },
  desk: { width: 1.2, height: 0.75, depth: 0.6 },
  counter: { width: 2.0, height: 0.9, depth: 0.6 },
  stove: { width: 0.6, height: 0.9, depth: 0.6 },
  fridge: { width: 0.7, height: 1.8, depth: 0.7 },
  sink: { width: 0.6, height: 0.85, depth: 0.5 },
  toilet: { width: 0.4, height: 0.4, depth: 0.7 },
  shower: { width: 0.9, height: 1.9, depth: 0.9 },
  dining_table: { width: 1.6, height: 0.75, depth: 0.9 },
  chairs: { width: 0.5, height: 0.9, depth: 0.5 },
  chair: { width: 0.5, height: 0.9, depth: 0.5 },
  bookshelf: { width: 1.0, height: 1.8, depth: 0.4 },
  plants: { width: 0.4, height: 0.6, depth: 0.4 },
  shoe_rack: { width: 0.8, height: 0.4, depth: 0.3 },
  shelves: { width: 1.0, height: 1.5, depth: 0.3 },
};

// ألوان المواد
export const MATERIAL_COLORS = {
  floor: {
    wood: '#8B4513',
    tile: '#F5F5DC',
    marble: '#E6E6FA',
    carpet: '#CD853F',
  },
  wall: {
    paint: '#F5F0E6',
    wallpaper: '#FAF6F0',
    stone: '#E0D8CC',
    brick: '#D4B896',
  },
  ceiling: {
    default: '#FFFFFF',
  },
};

// ألوان الغرف حسب النوع (أرضية أغمق لتباين أوضح مع الجدران والأثاث)
export const ROOM_COLORS = {
  living: '#9CB59E',
  bedroom: '#7B9BC2',
  master_bedroom: '#B895BB',
  kitchen: '#C4A574',
  bathroom: '#6B9B97',
  dining: '#C48594',
  office: '#7A7E9E',
  balcony: '#8FA872',
  entrance: '#9A9A9A',
  corridor: '#8A8E92',
  storage: '#A09890',
  other: '#8E8E8E',
};

