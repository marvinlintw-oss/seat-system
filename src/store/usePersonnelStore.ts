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
  
  // 修改：將舊的兩個排位函式改為新的命名
  autoArrangeByImportance: () => void; // 依重要度排位
  autoArrangeByPosition: () => void;   // 依位置排位
  
  resetSeating: () => void;
  syncSeatingStatus: () => void;
  addNewPerson: (name: string, title: string, org: string, category: string, rankScore: number) => void;
  updatePersonnelList: (list: Person[]) => void;
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

// 虛擬畫布中心點 (對應 VenueCanvas 的 VIRTUAL_WIDTH = 3200)
const CANVAS_CENTER_X = 1600;

export const usePersonnelStore = create<PersonnelState>((set, get) => ({
  personnel: MOCK_DATA,

  addPerson: (person) => set((state) => ({ personnel: [...state.personnel, person] })),
  
  toggleAttendance: (_id) => set((state) => ({ personnel: state.personnel })),

  updatePersonnelList: (list) => set({ personnel: list }),

  // 4.1 依重要度自動排位
  // 邏輯：依人物重要度填入座椅。座椅優先順序：權重(小到大) -> 前後(前到後) -> 中間到兩側
  autoArrangeByImportance: () => {
    const venueStore = useVenueStore.getState();
    const { personnel } = get();

    // 1. 取得所有有效座位 (不論有沒有人)
    const validSeats = venueStore.seats.filter(s => 
      !s.isPinned && s.type !== 'shape' && s.isVisible !== false
    );

    // 2. 對座位進行排序 (重要度優先)
    const sortedSeats = [...validSeats].sort((a, b) => {
      // 第一優先：權重 (越小越重要)
      const weightDiff = (a.rankWeight || 0) - (b.rankWeight || 0);
      if (weightDiff !== 0) return weightDiff;

      // 第二優先：Y軸 (越前面越重要)
      const yDiff = a.y - b.y;
      if (Math.abs(yDiff) > 10) return yDiff; // 給一點容許值，視為同一排

      // 第三優先：離中心點距離 (越中間越重要)
      const distA = Math.abs((a.x + (a.width || 100)/2) - CANVAS_CENTER_X);
      const distB = Math.abs((b.x + (b.width || 100)/2) - CANVAS_CENTER_X);
      return distA - distB;
    });

    // 3. 對人員進行排序 (分數高到低)
    const sortedPeople = [...personnel].sort((a, b) => b.rankScore - a.rankScore);

    // 4. 先清空所有非固定座位的指派
    venueStore.clearAllAssignments();

    // 5. 依序填入
    const limit = Math.min(sortedSeats.length, sortedPeople.length);
    for (let i = 0; i < limit; i++) {
      venueStore.updateSeatAssignment(sortedSeats[i].id, sortedPeople[i].id);
    }

    // 6. 同步狀態
    get().syncSeatingStatus();
  },

  // 4.2 依位置自動排位
  // 邏輯：不考慮椅子重要度。優先順序：前後(前到後) -> 中間到兩側
  autoArrangeByPosition: () => {
    const venueStore = useVenueStore.getState();
    const { personnel } = get();

    // 1. 取得所有有效座位
    const validSeats = venueStore.seats.filter(s => 
      !s.isPinned && s.type !== 'shape' && s.isVisible !== false
    );

    // 2. 對座位進行排序 (純幾何位置)
    const sortedSeats = [...validSeats].sort((a, b) => {
      // 第一優先：Y軸 (越前面越優先)
      const yDiff = a.y - b.y;
      // 若 Y 差距在 50px 內視為同一排，避免微小誤差導致順序錯亂
      if (Math.abs(yDiff) > 50) return yDiff;

      // 第二優先：離中心點距離 (越中間越優先)
      const distA = Math.abs((a.x + (a.width || 100)/2) - CANVAS_CENTER_X);
      const distB = Math.abs((b.x + (b.width || 100)/2) - CANVAS_CENTER_X);
      
      // 如果距離中心差不多，則從左到右 (保持視覺一致性)
      if (Math.abs(distA - distB) < 5) return a.x - b.x;
      
      return distA - distB;
    });

    // 3. 對人員進行排序
    const sortedPeople = [...personnel].sort((a, b) => b.rankScore - a.rankScore);

    // 4. 清空並填入
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

  addNewPerson: (name, title, org, category, rankScore) => set((state) => ({
    personnel: [
        {
            id: `new-${Date.now()}`,
            name, title, organization: org, rankScore, category, isSeated: false
        },
        ...state.personnel
    ]
  }))
}));