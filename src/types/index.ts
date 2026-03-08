// src/types/index.ts

export type Person = {
  id: string;
  externalId: string;    
  serialNumber?: string; 
  remarks?: string;      
  name: string;
  title: string;
  organization: string;
  rankScore: number;
  category: string;
  isSeated: boolean; 
  attendingSessionIds?: string[];
  photoData?: Record<string, { 
    batches: string[]; 
    position: string; 
  }>;
};

export type Category = {
  id: string;
  label: string;
  weight: number;
  color: string;
  personColor?: string;
};

export type Seat = {
  id: string;
  x: number;
  y: number;
  label: string;
  rankWeight: number;
  isPinned: boolean;
  assignedPersonId: string | null;
  type?: 'seat' | 'shape' | 'fixed' | 'photo'; // 支援 'photo' 站位點
  width?: number;
  height?: number;
  shapeType?: 'rect' | 'circle';
  isVisible?: boolean;
  zoneCategory?: string;
};

// 【全新加入】獨立的拍照梯次子畫布結構
export interface PhotoBatch {
  id: string;
  name: string;    // 例如：'一拍', '二拍'
  color: string;   // 梯次主題色，用來視覺區分與防呆
  spots: Seat[];   // 專屬這個梯次的站位點資料
}

export interface Session {
  id: string;
  name: string;      
  venue: {
    seats: Seat[];
    backgroundImage: string | null;
    stageScale: number;
    stagePosition: { x: number; y: number };
  };
  // 【全新加入】一個場次可以擁有多個拍照梯次
  photoBatches?: PhotoBatch[]; 
}

export interface Project {
  version: string;
  timestamp: string;
  fileId?: string;           
  projectName: string;       
  personnel: Person[];       
  categories: Category[];    
  sessions: Session[];       
  activeSessionId: string;   
  
  // 【全新加入】畫布視角控制狀態
  activeViewMode?: 'seat' | 'photo';  // 當前是排座位還是排拍照？
  activePhotoBatchId?: string | null; // 當前正在檢視哪一個梯次？
}

export interface ProjectData {
  version?: string;
  projectName?: string;
  fileId?: string | null;
  personnel?: Person[];
  categories?: Category[];
  sessions?: Session[];
  activeSessionId?: string;
  activeViewMode?: 'seat' | 'photo';
  activePhotoBatchId?: string | null;
}