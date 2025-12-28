// Fix: Removed non-existent Aura member from types import as it is not defined in types.ts
import { Medal } from './types.ts'; // تم تغيير './types' إلى './types.ts'

export const getMedal = (count: number): Medal => {
  if (count > 150) return Medal.KING;
  if (count >= 101) return Medal.DIAMOND;
  if (count >= 51) return Medal.GOLD;
  if (count >= 1) return Medal.SILVER;
  return Medal.NONE;
};

export const getMedalColor = (medal: Medal): string => {
  switch (medal) {
    case Medal.SILVER: return 'text-slate-400';
    case Medal.GOLD: return 'text-yellow-500';
    case Medal.DIAMOND: return 'text-blue-400';
    case Medal.KING: return 'text-purple-600';
    default: return 'text-gray-300';
  }
};

export const getMedalPrice = (medal: Medal): number => {
  switch (medal) {
    case Medal.SILVER: return 100;
    case Medal.GOLD: return 150;
    case Medal.DIAMOND: return 200;
    case Medal.KING: return 300;
    default: return 0;
  }
};

export const getAuraClass = (count: number): string => {
  if (count === 0) return '';
  const level = Math.floor((count - 1) % 40 / 10);
  switch (level) {
    case 0: return 'aura-red';
    case 1: return 'aura-orange';
    case 2: return 'aura-green';
    case 3: return 'aura-blue';
    default: return '';
  }
};