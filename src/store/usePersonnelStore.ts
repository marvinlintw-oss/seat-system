// src/store/usePersonnelStore.ts
import { create } from 'zustand';
import { useVenueStore } from './useVenueStore';
import { CSV_HEADERS } from '../utils/constants';
import type { Person } from '../types';

export type { Person };

interface PersonnelState {
  personnel: Person[];
  addPerson: (person: Person) => void;
  updatePersonnelList: (list: Person[]) => void;
  addNewPerson: (name: string, title: string, org: string, category: string, rankScore: number) => void;
  
  autoArrangeByImportance: () => void;
  autoArrangeByPosition: () => void;
  autoArrangeByCategory: () => void; 
  resetSeating: () => void;
  syncSeatingStatus: () => void;
  downloadCsvTemplate: () => void;
}

export const usePersonnelStore = create<PersonnelState>((set, get) => ({
  personnel: [],

  addPerson: (person) => set((state) => ({ personnel: [...state.personnel, person] })),

  updatePersonnelList: (list) => {
    set({ personnel: list });
    get().syncSeatingStatus();
  },

  addNewPerson: (name, title, org, category, rankScore) => {
    const safeRank = Math.max(0, Math.min(100, rankScore));
    set((state) => ({
      personnel: [
          { id: `new-${Date.now()}`, name: name.trim(), title: title.trim(), organization: org.trim(), rankScore: safeRank, category: category.trim(), isSeated: false },
          ...state.personnel
      ]
    }));
  },

  autoArrangeByImportance: () => {
    const venueStore = useVenueStore.getState();
    const { personnel } = get();
    const validSeats = venueStore.seats.filter(s => !s.isPinned && s.type !== 'shape' && s.isVisible !== false);
    const stage = venueStore.seats.find(s => s.type === 'shape' && s.label === '主舞台');
    const stageX = stage ? stage.x + (stage.width || 600) / 2 : 1600;

    const sortedSeats = [...validSeats].sort((a, b) => {
      const weightDiff = (a.rankWeight || 0) - (b.rankWeight || 0);
      if (weightDiff !== 0) return weightDiff;
      const yDiff = a.y - b.y;
      if (Math.abs(yDiff) > 20) return yDiff;
      const distA = Math.abs((a.x + (a.width || 100)/2) - stageX);
      const distB = Math.abs((b.x + (b.width || 100)/2) - stageX);
      return distA - distB;
    });

    const sortedPeople = [...personnel].sort((a, b) => b.rankScore - a.rankScore);
    venueStore.clearAllAssignments();

    const limit = Math.min(sortedSeats.length, sortedPeople.length);
    for (let i = 0; i < limit; i++) {
      venueStore.updateSeatAssignment(sortedSeats[i].id, sortedPeople[i].id);
    }
    get().syncSeatingStatus();
  },

  autoArrangeByPosition: () => {
    const venueStore = useVenueStore.getState();
    const { personnel } = get();
    const validSeats = venueStore.seats.filter(s => !s.isPinned && s.type !== 'shape' && s.isVisible !== false);
    const stage = venueStore.seats.find(s => s.type === 'shape' && s.label === '主舞台');
    const stageX = stage ? stage.x + (stage.width || 600) / 2 : 1600;

    const sortedSeats = [...validSeats].sort((a, b) => {
      const yDiff = a.y - b.y;
      if (Math.abs(yDiff) > 20) return yDiff;
      const distA = Math.abs((a.x + (a.width || 100)/2) - stageX);
      const distB = Math.abs((b.x + (b.width || 100)/2) - stageX);
      if (Math.abs(distA - distB) < 5) return a.x - b.x;
      return distA - distB;
    });

    const sortedPeople = [...personnel].sort((a, b) => b.rankScore - a.rankScore);
    venueStore.clearAllAssignments();

    const limit = Math.min(sortedSeats.length, sortedPeople.length);
    for (let i = 0; i < limit; i++) {
      venueStore.updateSeatAssignment(sortedSeats[i].id, sortedPeople[i].id);
    }
    get().syncSeatingStatus();
  },

  autoArrangeByCategory: () => {
    const venueStore = useVenueStore.getState();
    const { personnel } = get();
    venueStore.clearAllAssignments();
    
    const validSeats = venueStore.seats.filter(s => !s.isPinned && s.type !== 'shape' && s.isVisible !== false);
    const stage = venueStore.seats.find(s => s.type === 'shape' && s.label === '主舞台');
    const stageX = stage ? stage.x + (stage.width || 600) / 2 : 1600;

    const sortSeatsFn = (a: any, b: any) => {
        const weightA = a.rankWeight ?? 9999;
        const weightB = b.rankWeight ?? 9999;
        if (weightA !== weightB) return weightA - weightB;
        const yDiff = a.y - b.y;
        if (Math.abs(yDiff) > 20) return yDiff;
        const distA = Math.abs((a.x + 50) - stageX);
        const distB = Math.abs((b.x + 50) - stageX);
        return distA - distB;
    };

    const availableSeats = [...validSeats].sort(sortSeatsFn);
    const sortedPeople = [...personnel].sort((a, b) => b.rankScore - a.rankScore);
    const unassignedPeople: Person[] = [];

    // 輔助函式：標準化字串去空白，徹底解決舊存檔匹配失敗問題
    const normalizeStr = (str?: string | null) => (str || '').trim().toLowerCase();

    // 第一階段：優先將人員塞入具有對應「區塊屬性」的座位中
    for (const person of sortedPeople) {
        // 【修正】使用防呆比對
        const matchIndex = availableSeats.findIndex(s => s.zoneCategory && normalizeStr(s.zoneCategory) === normalizeStr(person.category));
        
        if (matchIndex !== -1) {
            const seat = availableSeats[matchIndex];
            venueStore.updateSeatAssignment(seat.id, person.id);
            availableSeats.splice(matchIndex, 1); 
        } else {
            unassignedPeople.push(person);
        }
    }

    // 第二階段：將剩下的人排入剩餘座位，優先給「無區塊屬性」的空位
    availableSeats.sort((a, b) => {
        const aHasZone = a.zoneCategory ? 1 : 0;
        const bHasZone = b.zoneCategory ? 1 : 0;
        if (aHasZone !== bHasZone) return aHasZone - bHasZone;
        return sortSeatsFn(a, b);
    });

    for (const person of unassignedPeople) {
        if (availableSeats.length > 0) {
            const seat = availableSeats.shift()!;
            venueStore.updateSeatAssignment(seat.id, person.id);
        }
    }

    get().syncSeatingStatus();
  },

  resetSeating: () => {
    useVenueStore.getState().clearAllAssignments();
    set((state) => ({ personnel: state.personnel.map(p => ({ ...p, isSeated: false })) }));
  },

  syncSeatingStatus: () => {
    const venueState = useVenueStore.getState();
    const seatedPersonIds = new Set(
      venueState.seats.filter(s => s.assignedPersonId !== null).map(s => s.assignedPersonId)
    );
    set((state) => ({ personnel: state.personnel.map(p => ({ ...p, isSeated: seatedPersonIds.has(p.id) })) }));
  },

  downloadCsvTemplate: () => {
    const bom = "\uFEFF";
    const headerRow = CSV_HEADERS.map(h => h.label).join(",");
    const exampleRow = "範例姓名,範例職稱,範例單位,府院首長,95";
    const csvContent = bom + headerRow + "\n" + exampleRow;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "personnel_import_template.csv";
    link.click();
  }
}));