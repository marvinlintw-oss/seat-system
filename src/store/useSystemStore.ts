// src/store/useSystemStore.ts
import { create } from 'zustand';
import { CATEGORY_PRESETS } from '../utils/constants';

export type Category = {
  id: string;
  label: string;
  weight: number;
  color: string;       
  personColor: string; 
};

interface SystemState {
  categories: Category[];
  addCategory: (label: string, weight: number, color: string, personColor: string) => void;
  updateCategory: (id: string, data: Partial<Category>) => void;
  removeCategory: (id: string) => void;
  getCategoryByLabel: (label: string) => Category | undefined;
}

const DEFAULT_COLORS = [
  '#fca5a5', '#fdba74', '#fcd34d', '#86efac', '#6ee7b7', '#67e8f9', 
  '#93c5fd', '#a5b4fc', '#c4b5fd', '#f0abfc', '#f9a8d4', '#fda4af'
];

const INITIAL_CATEGORIES = CATEGORY_PRESETS.map((p, index) => ({
  id: `cat-${index}`,
  label: p.label,
  weight: p.weight,
  color: DEFAULT_COLORS[index % DEFAULT_COLORS.length], 
  personColor: '#ffffff' 
}));

export const useSystemStore = create<SystemState>((set, get) => ({
  categories: INITIAL_CATEGORIES,

  addCategory: (label, weight, color, personColor) => set(state => ({
    categories: [...state.categories, { 
      id: `cat-${Date.now()}`, label, weight, color, personColor 
    }]
  })),

  updateCategory: (id, data) => set(state => ({
    categories: state.categories.map(c => c.id === id ? { ...c, ...data } : c)
  })),

  removeCategory: (id) => set(state => ({
    categories: state.categories.filter(c => c.id !== id)
  })),

  getCategoryByLabel: (label) => {
    if (!label) return undefined;
    // 【修正】防呆處理：去除前後空白並轉小寫，防止舊資料的隱形字元導致比對失敗
    const normalizedTarget = label.trim().toLowerCase();
    return get().categories.find(c => c.label.trim().toLowerCase() === normalizedTarget);
  }
}));