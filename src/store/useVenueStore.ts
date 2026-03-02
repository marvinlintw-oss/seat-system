// src/store/useVenueStore.ts
import { create } from 'zustand';
import type { Seat } from '../types';

export type { Seat }; 

export const VIRTUAL_WIDTH = 3200;
export const VIRTUAL_HEIGHT = 2400;

type SortMode = 'center' | 'top-left' | 'distance';
type NumberFormat = 'row-col' | 'sequence';

interface VenueState {
  stageScale: number;
  stagePosition: { x: number; y: number };
  backgroundImage: string | null;
  seats: Seat[];
  history: Seat[][];
  isEditMode: boolean;          
  selectedSeatIds: string[];    
  clipboard: Seat[];            
  
  rankSequenceCounter: number;  
  isSequencing: boolean;
  startRankSequence: (startNum: number) => void;
  applyRankToSeat: (seatId: string) => void; 
  stopRankSequence: () => void;
  autoPrioritySeats: (mode: SortMode) => void; 

  numberSequenceCounter: number;
  isNumbering: boolean;
  startNumberSequence: (startNum: number) => void;
  applyNumberToSeat: (seatId: string) => void;
  stopNumberSequence: () => void;
  autoNumberSeats: (mode: SortMode, format: NumberFormat) => void;

  exportCanvas: ((type: 'png' | 'svg' | 'pdf') => void) | null;
  registerExportHandler: (handler: (type: 'png' | 'svg' | 'pdf') => void) => void;

  setEditMode: (enabled: boolean) => void;
  setSelection: (ids: string[]) => void;
  addToSelection: (ids: string[]) => void;
  clearSelection: () => void;
  copySelection: () => void;
  pasteSelection: (cursorX?: number, cursorY?: number) => void;
  deleteSelectedSeats: () => void;
  exportVenueConfig: () => void; 
  importVenueConfig: (jsonContent: string) => void;
  setStageScale: (scale: number) => void;
  setStagePosition: (pos: { x: number; y: number }) => void;
  updateSeatPosition: (id: string, x: number, y: number) => boolean; 
  moveSeatsBatch: (ids: string[], deltaX: number, deltaY: number) => void;
  setSeatZone: (ids: string[], categoryLabel: string) => void;
  updateSeatAssignment: (seatId: string, personId: string | null) => void;
  unassignSeat: (seatId: string) => void;
  togglePinSeat: (id: string) => void;
  saveHistory: () => void;
  undo: () => void;
  setBackgroundImage: (url: string | null) => void;
  addSeat: (x: number, y: number) => void;
  updateSeatProperties: (id: string, label?: string, rankWeight?: number) => void;
  clearAllAssignments: () => void;
  removeSeat: (seatId: string) => void;
  addSeatBatch: (startX: number, startY: number, rows: number, cols: number) => void;
  toggleMainStage: () => void;
  checkCollision: (rect: {x: number, y: number, w: number, h: number}, excludeIds: string[]) => boolean;
}

const deepClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

// 【修正】共用排序演算法：加入動態的主舞台座標參數 (stageX, stageY)
const sortSeatsByMode = (seatsToSort: Seat[], mode: SortMode, stageX: number, stageY: number) => {
  if (!seatsToSort || seatsToSort.length === 0) return [];

  const rows: Seat[][] = [];
  const sortedByY = [...seatsToSort].sort((a,b) => a.y - b.y);
  let currentRow: Seat[] = [];
  let lastY = sortedByY[0]?.y ?? 0;

  sortedByY.forEach(s => {
      if (Math.abs(s.y - lastY) > 20 && currentRow.length > 0) {
          rows.push(currentRow);
          currentRow = [];
      }
      currentRow.push(s);
      lastY = s.y;
  });
  if (currentRow.length > 0) rows.push(currentRow);

  rows.forEach(row => {
      row.sort((a, b) => {
          if (mode === 'top-left') return a.x - b.x;
          
          if (mode === 'center') {
              const distA = Math.abs((a.x + (a.width||100)/2) - stageX);
              const distB = Math.abs((b.x + (b.width||100)/2) - stageX);
              if (Math.abs(distA - distB) < 10) return b.x - a.x; // 尊右原則
              return distA - distB;
          }

          if (mode === 'distance') {
              const distA = Math.hypot((a.x + (a.width||100)/2) - stageX, a.y - stageY);
              const distB = Math.hypot((b.x + (b.width||100)/2) - stageX, b.y - stageY);
              if (Math.abs(distA - distB) < 10) return b.x - a.x; // 尊右原則
              return distA - distB;
          }
          return 0;
      });
  });

  return rows;
};

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
  numberSequenceCounter: 1,
  isNumbering: false,
  
  exportCanvas: null,

  registerExportHandler: (handler) => set({ exportCanvas: handler }),

  setEditMode: (enabled) => set({ isEditMode: enabled, selectedSeatIds: [], isSequencing: false, isNumbering: false }),
  setSelection: (ids) => set({ selectedSeatIds: ids }),
  addToSelection: (ids) => set((state) => ({ selectedSeatIds: [...new Set([...state.selectedSeatIds, ...ids])] })),
  clearSelection: () => set({ selectedSeatIds: [] }),

  checkCollision: (targetRect, excludeIds = []) => {
    const { seats } = get();
    return seats.some(s => {
      if (s.isVisible === false || excludeIds.includes(s.id)) return false;
      const sW = s.width || 100;
      const sH = s.height || 150;
      return (
        Math.abs(s.x - targetRect.x) < (sW + targetRect.w)/2 * 0.9 &&
        Math.abs(s.y - targetRect.y) < (sH + targetRect.h)/2 * 0.9
      );
    });
  },

  copySelection: () => {
    const { seats, selectedSeatIds } = get();
    const selected = seats.filter(s => selectedSeatIds.includes(s.id));
    if (selected.length > 0) set({ clipboard: deepClone(selected) });
  },

  pasteSelection: (cursorX = 100, cursorY = 100) => {
    const { clipboard, seats } = get();
    if (clipboard.length === 0) return;
    get().saveHistory();

    const minX = Math.min(...clipboard.map(s => s.x));
    const minY = Math.min(...clipboard.map(s => s.y));

    let targetSeats = clipboard.map(seat => ({
      ...seat,
      id: `seat-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      x: (seat.x - minX) + cursorX, 
      y: (seat.y - minY) + cursorY,
      assignedPersonId: null, 
      isPinned: false
    }));

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

    set({ seats: [...seats, ...targetSeats], selectedSeatIds: targetSeats.map(s => s.id) });
  },

  deleteSelectedSeats: () => {
    const { selectedSeatIds, seats } = get();
    if (selectedSeatIds.length === 0) return;
    get().saveHistory();
    set({ seats: seats.filter(s => !selectedSeatIds.includes(s.id)), selectedSeatIds: [] });
  },

  startRankSequence: (startNum) => set({ isSequencing: true, isNumbering: false, rankSequenceCounter: startNum }),
  stopRankSequence: () => set({ isSequencing: false }),
  applyRankToSeat: (seatId) => {
    const { isSequencing, rankSequenceCounter, seats } = get();
    if (!isSequencing) return;
    get().saveHistory();
    const validRank = Math.max(0, Math.min(100, rankSequenceCounter));
    set({ 
      seats: seats.map(s => s.id === seatId ? { ...s, rankWeight: validRank } : s), 
      rankSequenceCounter: rankSequenceCounter + 1 
    });
  },

  autoPrioritySeats: (mode) => {
    get().saveHistory();
    const { seats } = get();
    const validSeats = seats.filter(s => s.type !== 'shape');
    if (validSeats.length === 0) return;

    // 【修正】動態獲取主舞台的真實位置，若無則預設為畫布頂端中央
    const stage = seats.find(s => s.type === 'shape' && s.label === '主舞台');
    const stageX = stage ? stage.x + (stage.width || 600) / 2 : VIRTUAL_WIDTH / 2;
    const stageY = stage ? stage.y + (stage.height || 150) / 2 : 50;

    const groupedRows = sortSeatsByMode(validSeats, mode, stageX, stageY);
    const flatSortedIds = groupedRows.flat().map(s => s.id);
    
    set({ seats: seats.map(s => {
      if (s.type === 'shape') return s;
      const index = flatSortedIds.indexOf(s.id);
      if (index === -1) return s;
      return { ...s, rankWeight: index + 1 };
    })});
  },

  startNumberSequence: (startNum) => set({ isNumbering: true, isSequencing: false, numberSequenceCounter: startNum }),
  stopNumberSequence: () => set({ isNumbering: false }),
  applyNumberToSeat: (seatId) => {
    const { isNumbering, numberSequenceCounter, seats } = get();
    if (!isNumbering) return;
    get().saveHistory();
    set({ 
      seats: seats.map(s => s.id === seatId ? { ...s, label: String(numberSequenceCounter) } : s), 
      numberSequenceCounter: numberSequenceCounter + 1 
    });
  },

  autoNumberSeats: (mode, format) => {
    get().saveHistory();
    const { seats } = get();
    const validSeats = seats.filter(s => s.type !== 'shape');
    if (validSeats.length === 0) return;

    // 【修正】動態獲取主舞台的真實位置
    const stage = seats.find(s => s.type === 'shape' && s.label === '主舞台');
    const stageX = stage ? stage.x + (stage.width || 600) / 2 : VIRTUAL_WIDTH / 2;
    const stageY = stage ? stage.y + (stage.height || 150) / 2 : 50;

    const groupedRows = sortSeatsByMode(validSeats, mode, stageX, stageY);
    const newSeats = [...seats];
    let globalSeq = 1;

    groupedRows.forEach((row, rowIdx) => {
        const rowStr = String(rowIdx + 1).padStart(2, '0');
        row.forEach((seat, colIdx) => {
            const colStr = String(colIdx + 1).padStart(2, '0');
            const newLabel = format === 'row-col' ? `${rowStr}-${colStr}` : String(globalSeq++);
            const sIndex = newSeats.findIndex(s => s.id === seat.id);
            if(sIndex !== -1) newSeats[sIndex] = { ...newSeats[sIndex], label: newLabel };
        });
    });

    set({ seats: newSeats });
  },

  exportVenueConfig: () => {
    const { seats, backgroundImage } = get();
    const data = { seats, backgroundImage, type: 'venue-only', version: '3.2' };
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
    } catch (e) { alert('匯入失敗：格式錯誤'); }
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
     if (x < 0 || y < 0 || x + 100 > VIRTUAL_WIDTH || y + 150 > VIRTUAL_HEIGHT) return;
     get().saveHistory();
     const { seats } = get();
     const nextRank = seats.filter(s => s.type !== 'shape').length + 1;
     set({ seats: [...seats, {
        id: `seat-${Date.now()}`, x, y, label: `S-${nextRank}`, rankWeight: 50,
        isPinned: false, assignedPersonId: null, type: 'seat', isVisible: true
     }]});
  },

  addSeatBatch: (startX, startY, rows, cols) => {
    const safeRows = Math.max(1, Math.min(10, rows));
    const safeCols = Math.max(1, Math.min(20, cols));
    get().saveHistory();
    const { seats } = get();
    const newSeats: Seat[] = [];
    let currentCount = seats.filter(s => s.type !== 'shape').length;
    for (let r = 0; r < safeRows; r++) {
      for (let c = 0; c < safeCols; c++) {
        currentCount++;
        newSeats.push({
          id: `seat-${Date.now()}-${r}-${c}`, 
          x: startX + c * 110, y: startY + r * 160,
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
  
  moveSeatsBatch: (ids, deltaX, deltaY) => {
    set(state => ({
      seats: state.seats.map(s => {
        if (!ids.includes(s.id)) return s;
        return { ...s, x: s.x + deltaX, y: s.y + deltaY };
      })
    }));
  },

  setSeatZone: (ids, categoryLabel) => {
    if (ids.length === 0) return;
    get().saveHistory();
    set(state => ({
      seats: state.seats.map(s => ids.includes(s.id) ? { ...s, zoneCategory: categoryLabel } : s)
    }));
  },
  
  updateSeatAssignment: (sid, pid) => set(state => ({ seats: state.seats.map(s => s.id === sid ? {...s, assignedPersonId: pid} : s) })),
  unassignSeat: (sid) => set(state => ({ seats: state.seats.map(s => s.id === sid ? {...s, assignedPersonId: null} : s) })),
  clearAllAssignments: () => {
    get().saveHistory();
    set((state) => ({ seats: state.seats.map((seat) => ({ ...seat, assignedPersonId: null })) }));
  },
  removeSeat: (seatId) => {
    get().saveHistory();
    set((state) => ({ seats: state.seats.filter(s => s.id !== seatId) }));
  },
  togglePinSeat: (id) => set(state => ({ seats: state.seats.map(s => s.id === id ? {...s, isPinned: !s.isPinned} : s) })),
  
  updateSeatProperties: (id, label, rankWeight) => {
     get().saveHistory();
     set(state => ({ seats: state.seats.map(s => {
         if (s.id !== id) return s;
         return { 
            ...s, 
            ...(label !== undefined && { label }), 
            ...(rankWeight !== undefined && { rankWeight: Math.max(0, Math.min(100, rankWeight)) }) 
         };
     })}));
  },

  toggleMainStage: () => {
    get().saveHistory();
    set((state) => {
        const hasStage = state.seats.some(s => s.type === 'shape' && s.label === '主舞台');
        if (hasStage) return { seats: state.seats.filter(s => !(s.type === 'shape' && s.label === '主舞台')) };
        return { seats: [...state.seats, {
            id: `stage-${Date.now()}`, x: VIRTUAL_WIDTH / 2 - 300, y: 50, 
            label: '主舞台', rankWeight: 0, isPinned: false, assignedPersonId: null, 
            type: 'shape', width: 600, height: 150, shapeType: 'rect', isVisible: true
        }]};
    });
  },
  setBackgroundImage: (url) => set({ backgroundImage: url }),
  setStageScale: (s) => set({ stageScale: s }),
  setStagePosition: (p) => set({ stagePosition: p }),
}));