// src/store/usePersonnelStore.ts
import { create } from 'zustand';
import { useProjectStore } from './useProjectStore';
import type { Seat } from '../types';

const getActiveSeats = (): Seat[] => {
  const state = useProjectStore.getState();
  const session = state.sessions.find(s => s.id === state.activeSessionId);
  if (!session) return [];
  if (state.activeViewMode === 'photo') {
    const batch = session.photoBatches?.find(b => b.id === state.activePhotoBatchId);
    return batch ? batch.spots : [];
  }
  return session.venue.seats;
};

const updateActiveSeats = (updater: (seats: Seat[]) => Seat[]) => {
  useProjectStore.setState(state => ({
    sessions: state.sessions.map(s => {
      if (s.id !== state.activeSessionId) return s;
      if (state.activeViewMode === 'photo') {
        return {
          ...s,
          photoBatches: s.photoBatches?.map(b =>
            b.id === state.activePhotoBatchId ? { ...b, spots: updater(b.spots) } : b
          ) || []
        };
      }
      return { ...s, venue: { ...s.venue, seats: updater(s.venue.seats) } };
    })
  }));
};

interface PersonnelState {
  updatePersonnelList: (newList: any[]) => void;
  syncSeatingStatus: () => void;
  autoArrangeByImportance: (arrangeAll: boolean, isZoneLocked: boolean) => void;
  autoArrangeByPosition: (arrangeAll: boolean, isZoneLocked: boolean) => void;
  autoArrangeByCategory: (arrangeAll: boolean, isZoneLocked: boolean) => void;
  resetSeating: () => void;
}

export const usePersonnelStore = create<PersonnelState>((_set, get) => ({
  updatePersonnelList: (newList) => {
    useProjectStore.getState().setPersonnel(newList);
  },

  syncSeatingStatus: () => {
    const state = useProjectStore.getState();
    const activeSession = state.sessions.find(s => s.id === state.activeSessionId);
    if (!activeSession) return;
    
    // 只根據「主會場座位」來決定 isSeated (拍照不算入座)
    const seatedIds = new Set(activeSession.venue.seats.filter(s => s.assignedPersonId).map(s => s.assignedPersonId));
    useProjectStore.setState({
      personnel: state.personnel.map(p => ({ ...p, isSeated: seatedIds.has(p.id) }))
    });
  },

  autoArrangeByPosition: (arrangeAll, isZoneLocked) => {
    const state = useProjectStore.getState();
    const activeSession = state.sessions.find(s => s.id === state.activeSessionId);
    if (!activeSession) return;

    let activeSeats = getActiveSeats();
    const isPhoto = state.activeViewMode === 'photo';

    if (arrangeAll) activeSeats = activeSeats.map(s => s.isPinned ? s : { ...s, assignedPersonId: null });

    const assignedIds = new Set(activeSeats.filter(s => s.assignedPersonId).map(s => s.assignedPersonId));
    let unassignedPeople = state.personnel.filter(p => {
      const isAttending = p.attendingSessionIds ? p.attendingSessionIds.includes(state.activeSessionId) : true;
      return isAttending && !assignedIds.has(p.id);
    }).sort((a, b) => b.rankScore - a.rankScore);

    // 【殺手級功能：跨梯次錨定 (Cross-Batch Anchoring)】
    // 如果是拍照模式，且不是第一拍，自動讓上一拍的長官留在原位
    if (isPhoto && activeSession.photoBatches) {
        const currentBatchIndex = activeSession.photoBatches.findIndex(b => b.id === state.activePhotoBatchId);
        if (currentBatchIndex > 0) {
            const prevBatch = activeSession.photoBatches[currentBatchIndex - 1];
            
            activeSeats = activeSeats.map(seat => {
                if (seat.assignedPersonId || seat.type === 'shape' || seat.isPinned) return seat;
                
                // 尋找上一拍「同一個編號/標籤」的位置
                const prevSeat = prevBatch.spots.find(ps => ps.label === seat.label);
                if (prevSeat && prevSeat.assignedPersonId) {
                    // 如果這個人這梯次也要上台 (在 unassigned 名單內)
                    const personIdx = unassignedPeople.findIndex(p => p.id === prevSeat.assignedPersonId);
                    if (personIdx !== -1) {
                        const personToKeep = unassignedPeople[personIdx];
                        unassignedPeople.splice(personIdx, 1); // 安排後移出待排區
                        return { ...seat, assignedPersonId: personToKeep.id };
                    }
                }
                return seat;
            });
        }
    }

    // 將剩下的空位依照 rankWeight 排序後填入剩下的人
    const emptySeats = activeSeats.filter(s => !s.assignedPersonId && s.type !== 'shape').sort((a, b) => a.rankWeight - b.rankWeight);
    
    emptySeats.forEach(seat => {
      let candidateIndex = -1;
      if (isZoneLocked && seat.zoneCategory) {
        candidateIndex = unassignedPeople.findIndex(p => p.category === seat.zoneCategory);
      } else {
        candidateIndex = unassignedPeople.length > 0 ? 0 : -1;
      }
      if (candidateIndex !== -1) {
        const p = unassignedPeople[candidateIndex];
        unassignedPeople.splice(candidateIndex, 1);
        const sIndex = activeSeats.findIndex(s => s.id === seat.id);
        if (sIndex !== -1) activeSeats[sIndex] = { ...activeSeats[sIndex], assignedPersonId: p.id };
      }
    });

    updateActiveSeats(() => activeSeats);
    if (!isPhoto) get().syncSeatingStatus();
  },

  autoArrangeByImportance: (arrangeAll, isZoneLocked) => get().autoArrangeByPosition(arrangeAll, isZoneLocked),
  autoArrangeByCategory: (arrangeAll, isZoneLocked) => get().autoArrangeByPosition(arrangeAll, isZoneLocked),

  resetSeating: () => {
    const activeSeats = getActiveSeats();
    const clearedSeats = activeSeats.map(s => s.isPinned ? s : { ...s, assignedPersonId: null });
    updateActiveSeats(() => clearedSeats);
    if (useProjectStore.getState().activeViewMode === 'seat') get().syncSeatingStatus();
  }
}));