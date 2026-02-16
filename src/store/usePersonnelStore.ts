// src/store/usePersonnelStore.ts
import { create } from 'zustand';
import { useVenueStore } from './useVenueStore';
import { CSV_HEADERS } from '../utils/constants';

export type Person = {
  id: string;
  name: string;
  title: string;
  organization: string;
  rankScore: number;
  category: string;
  isSeated: boolean;
};

interface PersonnelState {
  personnel: Person[];
  addPerson: (person: Person) => void;
  updatePersonnelList: (list: Person[]) => void;
  addNewPerson: (name: string, title: string, org: string, category: string, rankScore: number) => void;
  
  autoArrangeByImportance: () => void;
  autoArrangeByPosition: () => void;
  resetSeating: () => void;
  syncSeatingStatus: () => void;
  downloadCsvTemplate: () => void;
}

// 注意：需與 VenueStore 的常數保持一致
const CANVAS_CENTER_X = 1600;

export const usePersonnelStore = create<PersonnelState>((set, get) => ({
  personnel: [],

  addPerson: (person) => set((state) => ({ personnel: [...state.personnel, person] })),

  updatePersonnelList: (list) => {
    set({ personnel: list });
    get().syncSeatingStatus();
  },

  addNewPerson: (name, title, org, category, rankScore) => set((state) => ({
    personnel: [
        {
            id: `new-${Date.now()}`,
            name,
            title,
            organization: org,
            rankScore: rankScore,
            category: category,
            isSeated: false
        },
        ...state.personnel
    ]
  })),

  autoArrangeByImportance: () => {
    const venueStore = useVenueStore.getState();
    const { personnel } = get();

    const validSeats = venueStore.seats.filter(s => 
      !s.isPinned && s.type !== 'shape' && s.isVisible !== false
    );

    const sortedSeats = [...validSeats].sort((a, b) => {
      const weightDiff = (a.rankWeight || 0) - (b.rankWeight || 0);
      if (weightDiff !== 0) return weightDiff;

      const yDiff = a.y - b.y;
      if (Math.abs(yDiff) > 20) return yDiff;

      const distA = Math.abs((a.x + (a.width || 100)/2) - CANVAS_CENTER_X);
      const distB = Math.abs((b.x + (b.width || 100)/2) - CANVAS_CENTER_X);
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

    const validSeats = venueStore.seats.filter(s => 
      !s.isPinned && s.type !== 'shape' && s.isVisible !== false
    );

    const sortedSeats = [...validSeats].sort((a, b) => {
      const yDiff = a.y - b.y;
      if (Math.abs(yDiff) > 20) return yDiff;

      const distA = Math.abs((a.x + (a.width || 100)/2) - CANVAS_CENTER_X);
      const distB = Math.abs((b.x + (b.width || 100)/2) - CANVAS_CENTER_X);
      
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

  resetSeating: () => {
    useVenueStore.getState().clearAllAssignments();
    set((state) => ({
      personnel: state.personnel.map(p => ({ ...p, isSeated: false }))
    }));
  },

  syncSeatingStatus: () => {
    const venueState = useVenueStore.getState();
    const seatedPersonIds = new Set(
      venueState.seats
        .filter(s => s.assignedPersonId !== null)
        .map(s => s.assignedPersonId)
    );

    set((state) => ({
      personnel: state.personnel.map(p => ({
        ...p,
        isSeated: seatedPersonIds.has(p.id)
      }))
    }));
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
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}));