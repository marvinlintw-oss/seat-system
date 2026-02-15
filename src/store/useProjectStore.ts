// src/store/useVenueStore.ts
import { create } from 'zustand';

export interface Seat {
  id: string;
  x: number;
  y: number;
  label: string;      // 顯示名稱 (e.g. "A-1")
  rankWeight: number; // [新增] 排序權重 (e.g. 1, 2, 3...)
  isPinned: boolean;
  assignedPersonId: string | null;
  type?: 'seat' | 'shape';
  width?: number;
  height?: number;
  shapeType?: 'rect' | 'circle';
  isVisible?: boolean; 
}

const SEAT_WIDTH = 100;
const SEAT_HEIGHT = 150;

interface VenueState {
  stageScale: number;
  stagePosition: { x: number; y: number };
  seats: Seat[];
  backgroundImage: string | null;
  history: Seat[][]; 

  setStageScale: (scale: number) => void;
  setStagePosition: (pos: { x: number; y: number }) => void;
  
  addSeat: (x: number, y: number) => boolean;
  updateSeatPosition: (id: string, x: number, y: number) => boolean;
  // [新增] 更新座位屬性 (代號與權重)
  updateSeatProperties: (id: string, label: string, rankWeight: number) => void;
  
  togglePinSeat: (id: string) => void;
  updateSeatAssignment: (seatId: string, personId: string | null) => void;
  unassignSeat: (seatId: string) => void;
  removeSeat: (seatId: string) => void;
  clearAllAssignments: () => void;
  saveToStorage: () => void;
  loadFromStorage: () => void;
  setBackgroundImage: (url: string | null) => void;
  addSeatBatch: (startX: number, startY: number, rows: number, cols: number) => void;
  addObstacle: (x: number, y: number, w: number, h: number, shape: 'rect' | 'circle', label: string) => void;
  toggleMainStage: () => void;
  undo: () => void;
  saveHistory: () => void;
}

const deepClone = <T>(obj: T): T => {
  try { return JSON.parse(JSON.stringify(obj)); } catch (e) { return obj; }
};

export const useVenueStore = create<VenueState>((set, get) => ({
  stageScale: 1,
  stagePosition: { x: 0, y: 0 },
  seats: [],
  backgroundImage: null,
  history: [],

  setStageScale: (scale) => set({ stageScale: scale }),
  setStagePosition: (pos) => set({ stagePosition: pos }),

  saveHistory: () => {
    const { seats, history } = get();
    const newHistory = [...history, deepClone(seats)].slice(-30);
    set({ history: newHistory });
  },

  undo: () => {
    const { history } = get();
    if (history.length === 0) return;
    const previousSeats = deepClone(history[history.length - 1]);
    const newHistory = history.slice(0, -1);
    set({ seats: previousSeats, history: newHistory });
  },

  addSeat: (x, y) => {
    const { seats } = get();
    const isOverlapping = seats.some(seat => seat.isVisible !== false && Math.abs(seat.x - x) < SEAT_WIDTH && Math.abs(seat.y - y) < SEAT_HEIGHT);
    if (isOverlapping) return false;
    get().saveHistory();
    
    // 自動計算下一個權重 (預設為目前座位數 + 1)
    const nextRank = seats.filter(s => s.type === 'seat').length + 1;
    
    set((state) => ({
      seats: [...state.seats, { 
        id: `seat-${Date.now()}`, x, y, 
        label: `${nextRank}`,      // 預設代號
        rankWeight: nextRank,      // [新增] 預設權重
        isPinned: false, assignedPersonId: null, type: 'seat', isVisible: true
      }],
    }));
    return true;
  },

  addSeatBatch: (startX, startY, rows, cols) => {
    get().saveHistory();
    const { seats } = get();
    const newSeats: Seat[] = [];
    const gapX = 10; const gapY = 10;
    let currentCount = seats.filter(s => s.type === 'seat').length;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        currentCount++;
        newSeats.push({
          id: `seat-${Date.now()}-${r}-${c}`, 
          x: startX + c * (SEAT_WIDTH + 10), 
          y: startY + r * (SEAT_HEIGHT + 10),
          label: `${currentCount}`,
          rankWeight: currentCount, // [新增] 批量生成時自動編號
          isPinned: false, assignedPersonId: null, type: 'seat', isVisible: true
        });
      }
    }
    set((state) => ({ seats: [...state.seats, ...newSeats] }));
  },

  // [新增] 更新屬性實作
  updateSeatProperties: (id, label, rankWeight) => {
    get().saveHistory();
    set((state) => ({
      seats: state.seats.map(s => 
        s.id === id ? { ...s, label, rankWeight } : s
      )
    }));
  },

  addObstacle: (x, y, w, h, shape, label) => {
    get().saveHistory();
    set((state) => ({
      seats: [...state.seats, {
        id: `obs-${Date.now()}`, x, y, label, 
        rankWeight: 9999, // 障礙物權重設大一點避免干擾
        isPinned: false, assignedPersonId: null, type: 'shape', width: w, height: h, shapeType: shape, isVisible: true
      }]
    }));
  },

  toggleMainStage: () => {
    get().saveHistory();
    const { seats } = get();
    const existingStage = seats.find(s => s.type === 'shape' && s.label === '主舞台');
    if (existingStage) {
      set((state) => ({
        seats: state.seats.map(s => s.id === existingStage.id ? { ...s, isVisible: !s.isVisible } : s)
      }));
    } else {
      set((state) => ({
        seats: [...state.seats, {
          id: `stage-${Date.now()}`, x: 50, y: 50, label: '主舞台', rankWeight: 0,
          isPinned: false, assignedPersonId: null, type: 'shape', width: 600, height: 150, shapeType: 'rect', isVisible: true
        }]
      }));
    }
  },

  removeSeat: (seatId) => {
    get().saveHistory();
    set((state) => ({ seats: state.seats.filter(s => s.id !== seatId) }));
  },

  updateSeatPosition: (id, x, y) => {
    const { seats } = get();
    const movingSeat = seats.find(s => s.id === id);
    if (!movingSeat) return false;
    if (movingSeat.x === x && movingSeat.y === y) return true;

    if (movingSeat.type === 'shape') {
        get().saveHistory();
        set((state) => ({ seats: state.seats.map((seat) => seat.id === id ? { ...seat, x, y } : seat) }));
        return true;
    }
    const isOverlapping = seats.some(seat => 
      seat.id !== id && seat.isVisible !== false && seat.type !== 'shape' &&
      Math.abs(seat.x - x) < SEAT_WIDTH && Math.abs(seat.y - y) < SEAT_HEIGHT
    );
    if (isOverlapping) return false;
    get().saveHistory();
    set((state) => ({ seats: state.seats.map((seat) => seat.id === id ? { ...seat, x, y } : seat) }));
    return true;
  },

  togglePinSeat: (id) => {
    get().saveHistory();
    set((state) => ({ seats: state.seats.map((seat) => seat.id === id ? { ...seat, isPinned: !seat.isPinned } : seat) }));
  },

  updateSeatAssignment: (seatId, personId) => {
    get().saveHistory();
    set((state) => ({ seats: state.seats.map((seat) => seat.id === seatId ? { ...seat, assignedPersonId: personId } : seat) }));
  },

  unassignSeat: (seatId) => {
    get().saveHistory();
    set((state) => ({ seats: state.seats.map((seat) => seat.id === seatId ? { ...seat, assignedPersonId: null } : seat) }));
  },

  clearAllAssignments: () => {
    get().saveHistory();
    set((state) => ({ seats: state.seats.map((seat) => ({ ...seat, assignedPersonId: null })) }));
  },

  saveToStorage: () => {
    const { seats, backgroundImage } = get();
    const cleanSeats = deepClone(seats); 
    localStorage.setItem('venue-data', JSON.stringify({ seats: cleanSeats, backgroundImage }));
    alert('專案已儲存！');
  },

  loadFromStorage: () => {
    const saved = localStorage.getItem('venue-data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          set({ seats: parsed, history: [] });
        } else {
          set({ 
            seats: deepClone(parsed.seats || []), 
            backgroundImage: parsed.backgroundImage || null, 
            history: [] 
          });
        }
      } catch (e) {
        console.error('讀取失敗', e);
        localStorage.removeItem('venue-data');
      }
    }
  },

  setBackgroundImage: (url) => set({ backgroundImage: url })
}));