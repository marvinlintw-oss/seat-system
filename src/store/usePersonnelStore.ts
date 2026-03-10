// src/store/usePersonnelStore.ts
import { create } from 'zustand';
import { useProjectStore } from './useProjectStore';
import { useVenueStore } from './useVenueStore'; 
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

    if (isPhoto && activeSession.photoBatches) {
        const currentBatchIndex = activeSession.photoBatches.findIndex(b => b.id === state.activePhotoBatchId);
        if (currentBatchIndex > 0) {
            const prevBatch = activeSession.photoBatches[currentBatchIndex - 1];
            
            activeSeats = activeSeats.map(seat => {
                if (seat.assignedPersonId || seat.type === 'shape' || seat.isPinned) return seat;
                
                const prevSeat = prevBatch.spots.find(ps => ps.label === seat.label);
                if (prevSeat && prevSeat.assignedPersonId) {
                    const personIdx = unassignedPeople.findIndex(p => p.id === prevSeat.assignedPersonId);
                    if (personIdx !== -1) {
                        const personToKeep = unassignedPeople[personIdx];
                        unassignedPeople.splice(personIdx, 1); 
                        return { ...seat, assignedPersonId: personToKeep.id };
                    }
                }
                return seat;
            });
        }
    }

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

    // 【核心修復 3】執行大規模自動排位前，呼叫畫布大腦把當前狀態存進快照
    useVenueStore.getState().saveHistory();
    
    updateActiveSeats(() => activeSeats);
    if (!isPhoto) get().syncSeatingStatus();
  },

  autoArrangeByImportance: (arrangeAll, isZoneLocked) => get().autoArrangeByPosition(arrangeAll, isZoneLocked),
  autoArrangeByCategory: (arrangeAll, isZoneLocked) => get().autoArrangeByPosition(arrangeAll, isZoneLocked),

  resetSeating: () => {
    const activeSeats = getActiveSeats();
    const clearedSeats = activeSeats.map(s => s.isPinned ? s : { ...s, assignedPersonId: null });
    
    // 【核心修復 3】清空座位前，呼叫畫布大腦把當前狀態存進快照
    useVenueStore.getState().saveHistory();
    
    updateActiveSeats(() => clearedSeats);
    if (useProjectStore.getState().activeViewMode === 'seat') get().syncSeatingStatus();
  }
}));