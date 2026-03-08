// src/store/useSystemStore.ts
import { create } from 'zustand';
import { useProjectStore } from './useProjectStore';
import { CATEGORY_PRESETS, DEFAULT_COLORS } from '../utils/constants';
import type { Category } from '../types';

interface SystemState {
  initDefaultCategories: () => void;
  addCategory: (label: string, weight: number, color: string, personColor: string) => void;
  updateCategory: (id: string, data: Partial<Category>) => void;
  removeCategory: (id: string) => void;
  getCategoryByLabel: (label: string) => Category | undefined;
}

export const useSystemStore = create<SystemState>((_set, _get) => ({
  // 初始化預設類別 (若專案是空的)
  initDefaultCategories: () => {
    const { categories } = useProjectStore.getState();
    if (categories.length === 0) {
      const initial = CATEGORY_PRESETS.map((p, index) => ({
        id: `cat-${index}`,
        label: p.label,
        weight: p.weight,
        color: DEFAULT_COLORS[index % DEFAULT_COLORS.length], 
        personColor: '#ffffff' 
      }));
      useProjectStore.setState({ categories: initial });
    }
  },

  addCategory: (label, weight, color, personColor) => {
    const { categories } = useProjectStore.getState();
    useProjectStore.setState({
      categories: [...categories, { id: `cat-${Date.now()}`, label, weight, color, personColor }]
    });
  },

  updateCategory: (id, data) => {
    const { categories } = useProjectStore.getState();
    useProjectStore.setState({
      categories: categories.map(c => c.id === id ? { ...c, ...data } : c)
    });
  },

  removeCategory: (id) => {
    const { categories } = useProjectStore.getState();
    useProjectStore.setState({
      categories: categories.filter(c => c.id !== id)
    });
  },

  getCategoryByLabel: (label) => {
    if (!label) return undefined;
    const { categories } = useProjectStore.getState();
    const normalizedTarget = label.trim().toLowerCase();
    return categories.find(c => c.label.trim().toLowerCase() === normalizedTarget);
  }
}));