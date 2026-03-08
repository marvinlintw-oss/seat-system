// src/types/index.ts

// 1. 共用資源：人員
export type Person = {
  id: string;
  externalId: string;    // 系統底層 UUID (供 Google Sheet 雙向同步使用)
  serialNumber?: string; // 【新增】給使用者看與對應的自訂序號
  remarks?: string;      // 【新增】備註 (例如：吃素、行動不便)
  name: string;
  title: string;
  organization: string;
  rankScore: number;
  category: string;
  isSeated: boolean; 
  attendingSessionIds?: string[];
};

// 2. 共用資源：類別
export type Category = {
  id: string;
  label: string;
  weight: number;
  color: string;
  personColor?: string;
};

// 3. 場地物件：座位或形狀
export type Seat = {
  id: string;
  x: number;
  y: number;
  label: string;
  rankWeight: number;
  isPinned: boolean;
  assignedPersonId: string | null;
  type?: 'seat' | 'shape' | 'fixed' | 'photo';
  width?: number;
  height?: number;
  shapeType?: 'rect' | 'circle';
  isVisible?: boolean;
  zoneCategory?: string;
};

// 4. 單一場次定義
export interface Session {
  id: string;
  name: string;
  venue: {
    seats: Seat[];
    backgroundImage: string | null;
    stageScale: number;
    stagePosition: { x: number; y: number };
  };
}

// 5. 最高層級的專案定義
export interface Project {
  version: string;
  timestamp: string;
  fileId?: string;
  projectName: string;
  personnel: Person[];
  categories: Category[];
  sessions: Session[];
  activeSessionId: string;
}

// 雲端存檔會用到的資料結構定義
export interface ProjectData {
  version?: string;
  projectName?: string;
  fileId?: string | null;
  personnel?: Person[];
  categories?: Category[];
  sessions?: Session[];
  activeSessionId?: string;
}