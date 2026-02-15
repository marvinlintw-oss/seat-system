// src/types/index.ts

export type Role = 'admin' | 'viewer';

export interface User {
  id: string;
  username: string;
  role: Role;
}

// 畫布尺寸定義
export interface CanvasDimension {
  width: number;
  height: number;
  label: string;
}

// 座位定義
export interface Seat {
  id: string;             // 唯一識別碼 (e.g., "row-1-seat-5")
  x: number;              // Canvas X 座標
  y: number;              // Canvas Y 座標
  type: 'fixed' | 'photo'; // 一般座位或合照站位
  code: string;           // 座位顯示代號 (e.g., "1排5號")
  zone?: string;          // 區域 (e.g., "舞台區", "貴賓席")
  rankWeight: number;     // 排序權重 (用於自動排位)
  isPinned: boolean;      // [NEW] 圖釘功能：鎖定後不可自動排位，不可移動
  assignedPersonId: string | null; // 綁定的人員 ID
}

// 人員定義
export interface Person {
  id: string;
  name: string;
  title: string;          // 職稱
  organization: string;   // 單位
  rankScore: number;      // 排序分數 (由職等/權重計算)
  category: string;       // 分類 (e.g., 部會首長)
  color?: string;         // 分類代表色
  note?: string;          // 備註
  // [NEW] 視覺狀態輔助欄位 (前端 UI 使用)
  isSeated: boolean;      // 是否已入座 (控制顯示小黃人)
}

// 專案定義
export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  
  // 場地設定
  venue: {
    width: number;        // [NEW] 支援 3000px 或 2000px
    height: number;
    backgroundImage?: string; // 底圖 URL
    seats: Seat[];
  };

  // 人員名單
  personnel: Person[];

  // 視圖狀態 (保存使用者最後的縮放位置)
  viewState: {
    zoom: number;         // 縮放比例
    panX: number;         // 拖曳位移 X
    panY: number;         // 拖曳位移 Y
  };
}