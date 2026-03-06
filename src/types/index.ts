// src/types/index.ts

// 1. 共用資源：人員
export type Person = {
  id: string;
  name: string;
  title: string;
  organization: string;
  rankScore: number;
  category: string;
  isSeated: boolean; 
  attendingSessionIds?: string[]; // 【新增】記錄參與的場次 ID 陣列
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
  type?: 'seat' | 'shape' | 'fixed' | 'photo'; // 保留了拍照站位的擴充性
  width?: number;
  height?: number;
  shapeType?: 'rect' | 'circle';
  isVisible?: boolean;
  zoneCategory?: string;
};

// 4. 【全新】單一場次定義 (每個場次有獨立的場地與座位)
export interface Session {
  id: string;
  name: string;      // 例如：'開幕式', '大合照', '分論壇A'
  venue: {
    seats: Seat[];
    backgroundImage: string | null;
    stageScale: number;
    stagePosition: { x: number; y: number };
  };
}

// 5. 【全新】最高層級的專案定義
export interface Project {
  version: string;
  timestamp: string;
  fileId?: string;           // 未來綁定 Google Drive 的檔案 ID
  projectName: string;       // 例如：'2026 地方創生論壇'
  
  personnel: Person[];       // 【大水庫】這場活動的所有長官名單
  categories: Category[];    // 【共用類別】
  
  sessions: Session[];       // 【多場次陣列】
  activeSessionId: string;   // 記錄目前正在檢視/編輯的場次
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