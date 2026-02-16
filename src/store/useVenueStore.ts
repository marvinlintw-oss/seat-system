// src/store/useVenueStore.ts
import { create } from 'zustand';

// 虛擬畫布大小
export const VIRTUAL_WIDTH = 3200;
export const VIRTUAL_HEIGHT = 2400;

export type Seat = {
  id: string;
  x: number;
  y: number;
  label: string;      // 座位代碼
  rankWeight: number; // 重要度
  isPinned: boolean;
  assignedPersonId: string | null;
  type?: 'seat' | 'shape';
  width?: number;
  height?: number;
  shapeType?: 'rect' | 'circle';
  isVisible?: boolean; 
  zoneCategory?: string; // 需求 2.2: 座位區塊屬性 (對應人員類別)
};

interface VenueState {
  // --- 基本設定 ---
  stageScale: number;
  stagePosition: { x: number; y: number };
  backgroundImage: string | null;
  
  // --- 核心資料 ---
  seats: Seat[];
  history: Seat[][];

  // --- 狀態 ---
  isEditMode: boolean;          
  selectedSeatIds: string[];    
  clipboard: Seat[];            
  rankSequenceCounter: number;  
  isSequencing: boolean;        

  // --- Actions ---
  setEditMode: (enabled: boolean) => void;
  setSelection: (ids: string[]) => void;
  addToSelection: (ids: string[]) => void;
  clearSelection: () => void;
  
  copySelection: () => void;
  pasteSelection: (cursorX?: number, cursorY?: number) => void;
  deleteSelectedSeats: () => void;

  startRankSequence: (startNum: number) => void;
  applyRankToSeat: (seatId: string) => void; 
  stopRankSequence: () => void;
  autoRankSeats: () => void; 

  exportVenueConfig: () => void; 
  importVenueConfig: (jsonContent: string) => void;

  setStageScale: (scale: number) => void;
  setStagePosition: (pos: { x: number; y: number }) => void;
  
  // 移動與編輯
  updateSeatPosition: (id: string, x: number, y: number) => boolean; 
  moveSeatsBatch: (ids: string[], deltaX: number, deltaY: number) => void; // 新增：多選移動
  setSeatZone: (ids: string[], categoryLabel: string) => void; // 新增：設定座位分區

  updateSeatAssignment: (seatId: string, personId: string | null) => void;
  unassignSeat: (seatId: string) => void;
  togglePinSeat: (id: string) => void;
  saveHistory: () => void;
  undo: () => void;
  setBackgroundImage: (url: string | null) => void;
  addSeat: (x: number, y: number) => void;
  updateSeatProperties: (id: string, label: string, rankWeight: number) => void;
  
  clearAllAssignments: () => void;
  removeSeat: (seatId: string) => void;
  addSeatBatch: (startX: number, startY: number, rows: number, cols: number) => void;
  toggleMainStage: () => void;
  
  // Helpers
  checkCollision: (rect: {x: number, y: number, w: number, h: number}, excludeIds: string[]) => boolean;
}

const deepClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

export const useVenueStore = create<VenueState>((set, get) => ({
  stageScale: 0.5,
  stagePosition: { x: 0, y: 0 },
  seats: [],
  history: [],
  backgroundImage: null,
  
  isEditMode: false,
  selectedSeatIds: [],
  clipboard: [],
  rankSequenceCounter: 1,
  isSequencing: false,

  setEditMode: (enabled) => set({ isEditMode: enabled, selectedSeatIds: [], isSequencing: false }),
  setSelection: (ids) => set({ selectedSeatIds: ids }),
  addToSelection: (ids) => set((state) => ({ 
    selectedSeatIds: [...new Set([...state.selectedSeatIds, ...ids])] 
  })),
  clearSelection: () => set({ selectedSeatIds: [] }),

  // 需求 1.5 & 1.2: 碰撞與邊界檢查 Helper
  checkCollision: (targetRect, excludeIds = []) => {
    const { seats } = get();
    return seats.some(s => {
      if (s.isVisible === false || excludeIds.includes(s.id)) return false;
      const sW = s.width || 100;
      const sH = s.height || 150;
      // 簡單的 AABB 碰撞偵測 (縮小一點範圍讓操作不要太卡)
      return (
        Math.abs(s.x - targetRect.x) < (sW + targetRect.w)/2 * 0.9 &&
        Math.abs(s.y - targetRect.y) < (sH + targetRect.h)/2 * 0.9
      );
    });
  },

  copySelection: () => {
    const { seats, selectedSeatIds } = get();
    const selected = seats.filter(s => selectedSeatIds.includes(s.id));
    if (selected.length > 0) {
      set({ clipboard: deepClone(selected) });
    }
  },

  pasteSelection: (cursorX = 100, cursorY = 100) => {
    const { clipboard, seats } = get();
    if (clipboard.length === 0) return;
    get().saveHistory();

    const minX = Math.min(...clipboard.map(s => s.x));
    const minY = Math.min(...clipboard.map(s => s.y));

    // 計算目標位置
    let targetSeats = clipboard.map(seat => ({
      ...seat,
      id: `seat-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      x: (seat.x - minX) + cursorX, 
      y: (seat.y - minY) + cursorY,
      assignedPersonId: null, 
      isPinned: false
    }));

    // 需求 1.2: 碰撞迴避 (簡單往下移嘗試)
    let overlap = true;
    let attempts = 0;
    while(overlap && attempts < 10) {
        const isColliding = targetSeats.some(ts => 
            get().checkCollision({x: ts.x, y: ts.y, w: ts.width||100, h: ts.height||150}, [])
        );
        if (isColliding) {
            targetSeats = targetSeats.map(s => ({...s, x: s.x + 20, y: s.y + 20}));
            attempts++;
        } else {
            overlap = false;
        }
    }

    // 需求 1.5: 邊界過濾
    targetSeats = targetSeats.filter(s => 
       s.x >= 0 && s.y >= 0 && 
       s.x + (s.width||100) <= VIRTUAL_WIDTH && 
       s.y + (s.height||150) <= VIRTUAL_HEIGHT
    );

    if (targetSeats.length === 0) {
        alert('無法貼上：所有座位皆超出邊界或重疊');
        return;
    }

    set({ 
      seats: [...seats, ...targetSeats],
      selectedSeatIds: targetSeats.map(s => s.id) 
    });
  },

  deleteSelectedSeats: () => {
    const { selectedSeatIds, seats } = get();
    if (selectedSeatIds.length === 0) return;
    get().saveHistory();
    set({ 
      seats: seats.filter(s => !selectedSeatIds.includes(s.id)),
      selectedSeatIds: []
    });
  },

  startRankSequence: (startNum) => set({ isSequencing: true, rankSequenceCounter: startNum }),
  stopRankSequence: () => set({ isSequencing: false }),

  // 需求 1.7: 僅更新重要度
  applyRankToSeat: (seatId) => {
    const { isSequencing, rankSequenceCounter, seats } = get();
    if (!isSequencing) return;
    
    get().saveHistory();
    const newSeats = seats.map(s => s.id === seatId ? {
      ...s,
      rankWeight: rankSequenceCounter
      // label 不變
    } : s);

    set({ seats: newSeats, rankSequenceCounter: rankSequenceCounter + 1 });
  },

  // 需求 1.7: 自動排序僅更新重要度
  autoRankSeats: () => {
    get().saveHistory();
    const { seats } = get();
    const validSeats = seats.filter(s => s.type === 'seat');
    const CENTER_X = VIRTUAL_WIDTH / 2;

    const sortedIds = [...validSeats].sort((a, b) => {
      const yDiff = a.y - b.y;
      if (Math.abs(yDiff) > 30) return yDiff; 
      
      const distA = Math.abs((a.x + 50) - CENTER_X);
      const distB = Math.abs((b.x + 50) - CENTER_X);
      
      if (Math.abs(distA - distB) < 10) return a.x - b.x;
      return distA - distB;
    }).map(s => s.id);
    
    const newSeats = seats.map(s => {
      if (s.type === 'shape') return s;
      const index = sortedIds.indexOf(s.id);
      if (index === -1) return s;
      return { ...s, rankWeight: index + 1 };
    });

    set({ seats: newSeats });
  },

  exportVenueConfig: () => {
    const { seats, backgroundImage } = get();
    const data = { seats, backgroundImage, type: 'venue-only', version: '2.1' };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `venue-layout-${new Date().toISOString().slice(0,10)}.venue.json`;
    a.click();
  },

  importVenueConfig: (jsonStr) => {
    try {
      const data = JSON.parse(jsonStr);
      if (!Array.isArray(data.seats)) throw new Error('Invalid Format');
      
      if(window.confirm('匯入新場地圖將會清空目前所有座位與人員排位，確定嗎？')) {
         set({ 
           seats: data.seats.map((s:any) => ({...s, assignedPersonId: null})), 
           backgroundImage: data.backgroundImage || null,
           history: []
         });
      }
    } catch (e) {
      alert('匯入失敗：格式錯誤');
    }
  },

  saveHistory: () => {
     const { seats, history } = get();
     set({ history: [...history, deepClone(seats)].slice(-20) });
  },
  
  undo: () => {
    const { history } = get();
    if (history.length === 0) return;
    const prev = history[history.length-1];
    set({ seats: prev, history: history.slice(0, -1) });
  },

  addSeat: (x, y) => {
     // 需求 1.5: 邊界檢查
     if (x < 0 || y < 0 || x + 100 > VIRTUAL_WIDTH || y + 150 > VIRTUAL_HEIGHT) {
        alert('無法新增：超出畫布範圍');
        return;
     }

     get().saveHistory();
     const { seats } = get();
     const nextRank = seats.filter(s => s.type === 'seat').length + 1;
     set({ seats: [...seats, {
        id: `seat-${Date.now()}`, x, y, label: `S-${nextRank}`, rankWeight: 50,
        isPinned: false, assignedPersonId: null, type: 'seat', isVisible: true
     }]});
  },

  addSeatBatch: (startX, startY, rows, cols) => {
    // 需求 1.5: 矩陣邊界檢查
    const totalW = cols * 110;
    const totalH = rows * 160;
    if (startX < 0 || startY < 0 || startX + totalW > VIRTUAL_WIDTH || startY + totalH > VIRTUAL_HEIGHT) {
        alert('無法新增：矩陣超出畫布範圍');
        return;
    }

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
          label: `S-${currentCount}`, rankWeight: 50,
          isPinned: false, assignedPersonId: null, type: 'seat', isVisible: true
        });
      }
    }
    set((state) => ({ seats: [...state.seats, ...newSeats] }));
  },

  updateSeatPosition: (id, x, y) => {
     set(state => ({ seats: state.seats.map(s => s.id === id ? {...s, x, y} : s) }));
     return true;
  },
  
  // 新增：多選移動
  moveSeatsBatch: (ids, deltaX, deltaY) => {
    set(state => ({
      seats: state.seats.map(s => {
        if (!ids.includes(s.id)) return s;
        return { ...s, x: s.x + deltaX, y: s.y + deltaY };
      })
    }));
  },

  // 新增：設定座位分區
  setSeatZone: (ids, categoryLabel) => {
    get().saveHistory();
    set(state => ({
      seats: state.seats.map(s => ids.includes(s.id) ? { ...s, zoneCategory: categoryLabel } : s)
    }));
  },
  
  updateSeatAssignment: (sid, pid) => {
     set(state => ({ seats: state.seats.map(s => s.id === sid ? {...s, assignedPersonId: pid} : s) }));
  },
  
  unassignSeat: (sid) => {
     set(state => ({ seats: state.seats.map(s => s.id === sid ? {...s, assignedPersonId: null} : s) }));
  },

  clearAllAssignments: () => {
    get().saveHistory();
    set((state) => ({ seats: state.seats.map((seat) => ({ ...seat, assignedPersonId: null })) }));
  },

  removeSeat: (seatId) => {
    get().saveHistory();
    set((state) => ({ seats: state.seats.filter(s => s.id !== seatId) }));
  },
  
  togglePinSeat: (id) => {
     set(state => ({ seats: state.seats.map(s => s.id === id ? {...s, isPinned: !s.isPinned} : s) }));
  },
  
  updateSeatProperties: (id, label, rank) => {
     get().saveHistory();
     set(state => ({ seats: state.seats.map(s => s.id === id ? {...s, label, rankWeight: rank} : s) }));
  },

  // 需求 1.4: 恢復舞台功能
  toggleMainStage: () => {
    get().saveHistory();
    set((state) => {
        const hasStage = state.seats.some(s => s.type === 'shape' && s.label === '主舞台');
        if (hasStage) {
            return { seats: state.seats.filter(s => !(s.type === 'shape' && s.label === '主舞台')) };
        } else {
            return { seats: [...state.seats, {
                id: `stage-${Date.now()}`, 
                x: VIRTUAL_WIDTH / 2 - 300, 
                y: 50, 
                label: '主舞台', 
                rankWeight: 0,
                isPinned: false, 
                assignedPersonId: null, 
                type: 'shape', 
                width: 600, 
                height: 150, 
                shapeType: 'rect', 
                isVisible: true
            }]};
        }
    });
  },

  setBackgroundImage: (url) => set({ backgroundImage: url }),
  setStageScale: (s) => set({ stageScale: s }),
  setStagePosition: (p) => set({ stagePosition: p }),
}));