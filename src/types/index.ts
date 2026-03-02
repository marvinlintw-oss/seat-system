// src/types/index.ts

export type Category = {
  id: string;
  label: string;
  weight: number;
  color: string;
  personColor: string;
};

export type Person = {
  id: string;
  name: string;
  title: string;
  organization: string;
  rankScore: number;
  category: string;
  isSeated: boolean;
};

export type Seat = {
  id: string;
  x: number;
  y: number;
  label: string;
  rankWeight: number;
  isPinned: boolean;
  assignedPersonId: string | null;
  type?: 'seat' | 'shape' | 'fixed' | 'photo'; // 擴充支援舊有屬性
  width?: number;
  height?: number;
  shapeType?: 'rect' | 'circle';
  isVisible?: boolean;
  zoneCategory?: string;
};

export interface Project {
  version: string;
  timestamp: string;
  personnel: Person[];
  venue: {
    seats: Seat[];
    backgroundImage: string | null;
    stageScale: number;
    stagePosition: { x: number; y: number };
  };
  categories: Category[];
}