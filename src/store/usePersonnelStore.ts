import { create } from 'zustand';
import { useVenueStore } from './useVenueStore';

export interface Person {
  id: string;
  name: string;
  title: string;
  organization: string;
  rankScore: number;
  category: string;
  isSeated: boolean;
}

interface PersonnelState {
  personnel: Person[];
  addPerson: (person: Person) => void;
  toggleAttendance: (id: string) => void;
  autoArrange: () => void;
  autoArrangeProtocol: () => void;
  resetSeating: () => void;
  syncSeatingStatus: () => void;
  addNewPerson: (name: string, title: string, org: string, category: string, rankScore: number) => void;
}

const MOCK_DATA: Person[] = Array.from({ length: 10 }).map((_, i) => ({
  id: `p-${i}`,
  name: i === 0 ? '總統' : i === 1 ? '行政院長' : `貴賓 ${i + 1}`,
  title: i === 0 ? '總統' : i === 1 ? '院長' : '部長',
  organization: i < 5 ? '總統府' : '行政院',
  rankScore: 100 - i,
  category: i < 5 ? 'VIP' : 'Guest',
  isSeated: false,
}));

export const usePersonnelStore = create<PersonnelState>((set, get) => ({
  personnel: MOCK_DATA,

  addPerson: (person) => set((state) => ({ personnel: [...state.personnel, person] })),
  
  toggleAttendance: (id) => set((state) => ({ personnel: state.personnel })),

  autoArrange: () => {
    const venueStore = useVenueStore.getState();
    const { personnel } = get();
    
    const availableSeats = venueStore.seats
      .filter(s => !s.isPinned && s.type !== 'shape')
      .sort((a, b) => {
        const weightDiff = (a.rankWeight || 0) - (b.rankWeight || 0);
        if (weightDiff !== 0) return weightDiff;
        return parseInt(a.label) - parseInt(b.label);
      });
      
    const sortedPeople = [...personnel].sort((a, b) => b.rankScore - a.rankScore);
    const limit = Math.min(availableSeats.length, sortedPeople.length);
    
    availableSeats.forEach(seat => venueStore.updateSeatAssignment(seat.id, null));

    for (let i = 0; i < limit; i++) {
      venueStore.updateSeatAssignment(availableSeats[i].id, sortedPeople[i].id);
    }
    get().syncSeatingStatus();
  },

  autoArrangeProtocol: () => {
    const venueStore = useVenueStore.getState();
    const { personnel } = get();
    
    const rawSeats = venueStore.seats
      .filter(s => !s.isPinned && s.type !== 'shape')
      .sort((a, b) => {
        const weightDiff = (a.rankWeight || 0) - (b.rankWeight || 0);
        if (weightDiff !== 0) return weightDiff;
        return parseInt(a.label) - parseInt(b.label);
      });

    if (rawSeats.length === 0) return;

    const centerIndex = Math.floor(rawSeats.length / 2);
    const protocolSeats = [];
    protocolSeats.push(rawSeats[centerIndex]);

    let offset = 1;
    while (protocolSeats.length < rawSeats.length) {
      if (centerIndex + offset < rawSeats.length) protocolSeats.push(rawSeats[centerIndex + offset]);
      if (centerIndex - offset >= 0) protocolSeats.push(rawSeats[centerIndex - offset]);
      offset++;
    }

    const sortedPeople = [...personnel].sort((a, b) => b.rankScore - a.rankScore);
    const limit = Math.min(protocolSeats.length, sortedPeople.length);

    rawSeats.forEach(seat => venueStore.updateSeatAssignment(seat.id, null));

    for (let i = 0; i < limit; i++) {
      venueStore.updateSeatAssignment(protocolSeats[i].id, sortedPeople[i].id);
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
    const assignedIds = new Set(
      useVenueStore.getState().seats
        .map(s => s.assignedPersonId)
        .filter(id => id !== null)
    );
    set((state) => ({
      personnel: state.personnel.map(p => ({
        ...p,
        isSeated: assignedIds.has(p.id)
      }))
    }));
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
  }))
}));