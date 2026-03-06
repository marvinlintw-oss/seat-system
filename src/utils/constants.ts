// src/utils/constants.ts
import type { Category } from '../types';

// CSV 匯入/匯出的對應標頭 (保持原樣)
export const CSV_HEADERS = [
  { label: '姓名', key: 'name' },
  { label: '職稱', key: 'title' },
  { label: '單位', key: 'organization' },
  { label: '類別', key: 'category' },
  { label: '權重', key: 'rankScore' }
];

// 擴充後的預設色票 (供 CategoryModal 顏色選擇器使用)
export const DEFAULT_COLORS = [
  '#fca5a5', '#fdba74', '#fcd34d', '#fde047', '#bef264', '#86efac', 
  '#6ee7b7', '#5eead4', '#67e8f9', '#7dd3fc', '#93c5fd', '#a5b4fc', 
  '#c4b5fd', '#d8b4fe', '#f3e8ff', '#fbcfe8', '#fecdd3', '#e2e8f0', '#cbd5e1'
];

// 升級版：近 20 個預設類別與權重 (符合 v4.0 的 Category 型別)
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-1', label: '府院首長', color: '#fca5a5', weight: 100 },
  { id: 'cat-2', label: '部會首長', color: '#fdba74', weight: 95 },
  { id: 'cat-3', label: '地方首長', color: '#fcd34d', weight: 90 },
  { id: 'cat-4', label: '民意代表', color: '#fde047', weight: 85 },
  { id: 'cat-5', label: '駐台使節與外賓', color: '#bef264', weight: 80 },
  { id: 'cat-6', label: '國策顧問與特聘', color: '#86efac', weight: 75 },
  { id: 'cat-7', label: '專家學者', color: '#6ee7b7', weight: 70 },
  { id: 'cat-8', label: '評審委員', color: '#5eead4', weight: 65 },
  { id: 'cat-9', label: '獲獎團隊', color: '#67e8f9', weight: 60 },
  { id: 'cat-10', label: '企業代表與贊助', color: '#7dd3fc', weight: 55 },
  { id: 'cat-11', label: '地方創生團隊', color: '#93c5fd', weight: 50 },
  { id: 'cat-12', label: '主辦單位', color: '#a5b4fc', weight: 45 },
  { id: 'cat-13', label: '協辦單位', color: '#c4b5fd', weight: 40 },
  { id: 'cat-14', label: '執行單位', color: '#d8b4fe', weight: 35 },
  { id: 'cat-15', label: '一般貴賓', color: '#f3e8ff', weight: 30 },
  { id: 'cat-16', label: '媒體', color: '#fbcfe8', weight: 20 },
  { id: 'cat-17', label: '口譯與隨扈', color: '#fecdd3', weight: 15 },
  { id: 'cat-18', label: '工作人員', color: '#e2e8f0', weight: 10 },
  { id: 'cat-19', label: '備用與保留席', color: '#cbd5e1', weight: 5 }
];