// src/utils/constants.ts
import type { Category } from '../types';

export const CSV_HEADERS = [
  { label: '姓名', key: 'name' },
  { label: '職稱', key: 'title' },
  { label: '單位', key: 'organization' },
  { label: '類別', key: 'category' },
  { label: '權重', key: 'rankScore' }
];

export const DEFAULT_COLORS = [
  '#fca5a5', '#fdba74', '#fcd34d', '#fde047', '#bef264', '#86efac', 
  '#6ee7b7', '#5eead4', '#67e8f9', '#7dd3fc', '#93c5fd', '#a5b4fc', 
  '#c4b5fd', '#d8b4fe', '#f3e8ff', '#fbcfe8', '#fecdd3', '#e2e8f0', '#cbd5e1'
];

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-1', label: '府院首長', color: '#fca5a5', weight: 98 },
  { id: 'cat-2', label: '部會首長', color: '#fdba74', weight: 95 },
  { id: 'cat-3', label: '縣市首長', color: '#fcd34d', weight: 88 },
  { id: 'cat-4', label: '立法委員', color: '#fde047', weight: 90 },
  { id: 'cat-5', label: '外賓與口譯', color: '#bef264', weight: 93 },
  { id: 'cat-6', label: '論壇主持講者', color: '#86efac', weight: 82 },
  { id: 'cat-7', label: '縣市議員', color: '#6ee7b7', weight: 73 },
  { id: 'cat-8', label: '國發會委辦廠商', color: '#5eead4', weight: 70 },
  { id: 'cat-9', label: '國發會外部評委', color: '#67e8f9', weight: 77 },
  { id: 'cat-10', label: '企業代表', color: '#7dd3fc', weight: 86 },
  { id: 'cat-11', label: '青培站', color: '#93c5fd', weight: 60 },
  { id: 'cat-12', label: '國發會長官', color: '#a5b4fc', weight: 85 },
  { id: 'cat-13', label: '國土處長官', color: '#c4b5fd', weight: 82 },
  { id: 'cat-14', label: '國土處', color: '#d8b4fe', weight: 74 },
  { id: 'cat-15', label: '外賓友人', color: '#f3e8ff', weight:91 },
  { id: 'cat-16', label: '媒體', color: '#fbcfe8', weight: 63 },
  { id: 'cat-17', label: '隨扈', color: '#fecdd3', weight: 92 },
  { id: 'cat-18', label: '工作人員', color: '#e2e8f0', weight: 10 },
  { id: 'cat-19', label: '備用與保留席', color: '#cbd5e1', weight: 5 }
];

// 【修復】加回舊版常數，以滿足舊有 Store (useSystemStore) 的引用需求，順利通過 Build
export const CATEGORY_PRESETS = [
  { label: '府院首長', weight: 98 },
  { label: '部會首長', weight: 95 },
  { label: '縣市首長', weight: 88 },
  { label: '立法委員', weight: 90 },
  { label: '外賓與口譯', weight: 93 },
  { label: '企業代表', weight: 86 },
  { label: '國發會', weight: 85 },
  { label: '媒體', weight: 63 },
  { label: '青培站', weight: 60 },
  { label: '國土處', weight: 74 }
];