// src/utils/constants.ts
export const CATEGORY_PRESETS = [
  { label: '府院首長', weight: 95 },
  { label: '外賓與口譯', weight: 90 },
  { label: '立法委員', weight: 85 },
  { label: '部會首長', weight: 83 },
  { label: '縣市首長', weight: 80 },
  { label: '企業代表', weight: 78 },
  { label: '府院成員', weight: 75 },
  { label: '論壇主持人', weight: 70 },
  { label: '論壇與談人', weight: 70 },
  { label: '部會成員', weight: 60 },
  { label: '縣市成員', weight: 55 },
  { label: '團隊_青培站', weight: 53 },
  { label: '團隊_獎勵金', weight: 52 },
  { label: '團隊_中興新村', weight: 51 },
  { label: '團隊_其他', weight: 50 },
  { label: '國土處', weight: 40 },
  { label: '執行單位', weight: 30 },
  { label: '工作人員', weight: 0 },
];

export const CSV_HEADERS = [
  { label: '姓名', key: 'name' },
  { label: '職稱', key: 'title' },
  { label: '單位', key: 'organization' },
  { label: '類別', key: 'category' },
  { label: '權重分數', key: 'rankScore' }
];