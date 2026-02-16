import { create } from 'zustand';

export interface Seat {
  id: string;
  x: number;
  y: number;
  label: string;
  rankWeight: number;
  isPinned: boolean;
  assignedPersonId: string | null;
  type?: 'seat' | 'shape';
  width?: number;
  height?: number;
  shapeType?: 'rect' | 'circle';
  isVisible?: boolean; 
}

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

  setStageScale: (scale) => {
    if (!scale || isNaN(scale) || scale <= 0) scale = 1;
    set({ stageScale: scale });
  },

  setStagePosition: (pos) => {
    if (!pos || isNaN(pos.x) || isNaN(pos.y)) {
        set({ stagePosition: { x: 0, y: 0 } });
    } else {
        set({ stagePosition: pos });
    }
  },

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
    const isOverlapping = seats.some(seat => 
      seat.isVisible !== false &&
      Math.abs(seat.x - x) < 50 && 
      Math.abs(seat.y - y) < 50
    );
    if (isOverlapping) return false;
    get().saveHistory();
    
    const nextRank = seats.filter(s => s.type === 'seat').length + 1;
    
    set((state) => ({
      seats: [...state.seats, { 
        id: `seat-${Date.now()}`, x, y, 
        label: `${nextRank}`, rankWeight: nextRank,
        isPinned: false, assignedPersonId: null, type: 'seat', isVisible: true
      }],
    }));
    return true;
  },

  addSeatBatch: (startX, startY, rows, cols) => {
    get().saveHistory();
    const { seats } = get();
    const newSeats: Seat[] = [];
    let currentCount = seats.filter(s => s.type === 'seat').length;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        currentCount++;
        newSeats.push({
          id: `seat-${Date.now()}-${r}-${c}`, 
          x: startX + c * 110, 
          y: startY + r * 160,
          label: `${currentCount}`, rankWeight: currentCount,
          isPinned: false, assignedPersonId: null, type: 'seat', isVisible: true
        });
      }
    }
    set((state) => ({ seats: [...state.seats, ...newSeats] }));
  },

  updateSeatProperties: (id, label, rankWeight) => {
    get().saveHistory();
    set((state) => ({
      seats: state.seats.map(s => s.id === id ? { ...s, label, rankWeight } : s)
    }));
  },

  addObstacle: (x, y, w, h, shape, label) => {
    get().saveHistory();
    set((state) => ({
      seats: [...state.seats, {
        id: `obs-${Date.now()}`, x, y, label, 
        rankWeight: 9999,
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

  // [修正] 移除了未使用的 `const { seats } = get();` 變數
  updateSeatPosition: (id, x, y) => {
    // 這裡直接更新，不讀取 seats 以避免 "unused variable" 錯誤
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
        } else if (parsed && parsed.seats) {
          set({ 
            seats: deepClone(parsed.seats), 
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