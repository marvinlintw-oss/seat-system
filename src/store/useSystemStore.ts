// src/store/useSystemStore.ts
import { create } from 'zustand';
import { CATEGORY_PRESETS } from '../utils/constants';

export type Category = {
  id: string;
  label: string;
  weight: number;
  color: string;       // 座位頂部區塊顏色 (場地分區用)
  personColor: string; // 人員資訊底色 (人員分類用)
};

interface SystemState {
  categories: Category[];
  addCategory: (label: string, weight: number, color: string, personColor: string) => void;
  updateCategory: (id: string, data: Partial<Category>) => void;
  removeCategory: (id: string) => void;
  getCategoryByLabel: (label: string) => Category | undefined;
}

// 預設顏色庫 (Tailwind 風格)
const DEFAULT_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', 
  '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef',
  '#ec4899', '#f43f5e'
];

// 初始化時將 constants 的資料轉換為具備顏色的結構
const INITIAL_CATEGORIES = CATEGORY_PRESETS.map((p, index) => ({
  id: `cat-${index}`,
  label: p.label,
  weight: p.weight,
  color: DEFAULT_COLORS[index % DEFAULT_COLORS.length], // 輪播顏色
  personColor: '#ffffff' // 人員預設白底
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
    return get().categories.find(c => c.label === label);
  }
}));