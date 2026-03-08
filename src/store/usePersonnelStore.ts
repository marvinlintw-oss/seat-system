// src/store/usePersonnelStore.ts
import { create } from 'zustand';
import { useProjectStore } from './useProjectStore';
import type { Person, Session } from '../types';

interface PersonnelState {
  addNewPerson: (name: string, title: string, org: string, category: string, rankScore: number) => void;
  updatePersonnelList: (list: Person[]) => void;
  removePerson: (id: string) => void;
  // 【修改】加入 isZoneLocked 參數
  autoArrangeByCategory: (arrangeAll?: boolean, isZoneLocked?: boolean) => void; 
  autoArrangeByImportance: (arrangeAll?: boolean, isZoneLocked?: boolean) => void;
  autoArrangeByPosition: (arrangeAll?: boolean, isZoneLocked?: boolean) => void;
  resetSeating: () => void;
  syncSeatingStatus: () => void;
}

const updateActiveSession = (updater: (session: Session) => Session) => {
  const state = useProjectStore.getState();
  useProjectStore.setState({
    sessions: state.sessions.map(s => s.id === state.activeSessionId ? updater(s) : s)
  });
};

export const usePersonnelStore = create<PersonnelState>((_set, get) => ({

  addNewPerson: (name, title, org, category, rankScore) => {
    const state = useProjectStore.getState();
    const safeRank = Math.max(0, Math.min(100, rankScore));
    const allSessionIds = state.sessions.map(s => s.id);
    
    const generateUUID = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ext-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    useProjectStore.setState({
      personnel: [
          { 
            id: `person-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, 
            externalId: generateUUID(),
            name: name.trim(), title: title.trim(), organization: org.trim(), 
            rankScore: safeRank, category: category.trim(), isSeated: false,
            attendingSessionIds: allSessionIds
          },
          ...state.personnel
      ]
    });
  },

  updatePersonnelList: (newList) => {
    const state = useProjectStore.getState();
    const personMap = new Map(newList.map(p => [p.id, p]));

    const updatedSessions = state.sessions.map(session => {
      let hasChanges = false;
      const newSeats = session.venue.seats.map(seat => {
        if (seat.assignedPersonId) {
          const person = personMap.get(seat.assignedPersonId);
          const isAttending = person?.attendingSessionIds ? person.attendingSessionIds.includes(session.id) : true;
          if (!person || !isAttending) {
            hasChanges = true;
            return { ...seat, assignedPersonId: null };
          }
        }
        return seat;
      });
      return hasChanges ? { ...session, venue: { ...session.venue, seats: newSeats } } : session;
    });

    useProjectStore.setState({ personnel: newList, sessions: updatedSessions });
    get().syncSeatingStatus();
  },

  removePerson: (id) => {
    const state = useProjectStore.getState();
    const newList = state.personnel.filter(p => p.id !== id);
    get().updatePersonnelList(newList); 
  },

  // 1. 依區塊排位
  autoArrangeByCategory: (arrangeAll = true, isZoneLocked = true) => {
    const projectState = useProjectStore.getState();
    const activeSession = projectState.sessions.find(s => s.id === projectState.activeSessionId);
    if (!activeSession) return;

    const newSeats = [...activeSession.venue.seats];
    const availableSeats = newSeats.filter(s => s.type !== 'shape' && !s.isPinned && s.isVisible !== false);
    
    if (arrangeAll) {
        newSeats.forEach(s => { if (s.type !== 'shape' && !s.isPinned) s.assignedPersonId = null; });
    }

    const occupiedPersonIds = new Set(newSeats.filter(s => s.assignedPersonId).map(s => s.assignedPersonId));
    
    const attendingPeople = projectState.personnel.filter(p => {
        const isAtt = p.attendingSessionIds ? p.attendingSessionIds.includes(activeSession.id) : true;
        return isAtt && !occupiedPersonIds.has(p.id);
    });

    attendingPeople.sort((a, b) => {
        const wA = projectState.categories.find(c => c.label === a.category)?.weight || 0;
        const wB = projectState.categories.find(c => c.label === b.category)?.weight || 0;
        if (wA !== wB) return wB - wA;
        return b.rankScore - a.rankScore;
    });

    availableSeats.sort((a, b) => {
        const wA = a.rankWeight ?? 9999;
        const wB = b.rankWeight ?? 9999;
        if (wA !== wB) return wA - wB;
        if (Math.abs(a.y - b.y) > 10) return a.y - b.y;
        return a.x - b.x;
    });

    const unassignedPeople = [];
    for (const person of attendingPeople) {
        // 第一優先：絕對符合區塊的座位
        const exactSeat = availableSeats.find(s => !s.assignedPersonId && s.zoneCategory === person.category);
        if (exactSeat) {
            newSeats.find(s => s.id === exactSeat.id)!.assignedPersonId = person.id;
        } else {
            unassignedPeople.push(person);
        }
    }

    // 第二階段：如果沒有鎖定，允許沒位子的人去塞一般空位 (甚至跨區)
    if (!isZoneLocked) {
        for (const person of unassignedPeople) {
            const emptySeat = availableSeats.find(s => !s.assignedPersonId);
            if (emptySeat) {
                newSeats.find(s => s.id === emptySeat.id)!.assignedPersonId = person.id;
            }
        }
    }

    updateActiveSession(s => ({ ...s, venue: { ...s.venue, seats: newSeats } }));
    get().syncSeatingStatus();
  },

  // 2. 依重要度排位
  autoArrangeByImportance: (arrangeAll = true, isZoneLocked = true) => {
    const projectState = useProjectStore.getState();
    const activeSession = projectState.sessions.find(s => s.id === projectState.activeSessionId);
    if (!activeSession) return;

    const newSeats = [...activeSession.venue.seats];
    const availableSeats = newSeats.filter(s => s.type !== 'shape' && !s.isPinned && s.isVisible !== false);
    
    if (arrangeAll) {
        newSeats.forEach(s => { if (s.type !== 'shape' && !s.isPinned) s.assignedPersonId = null; });
    }

    const occupiedPersonIds = new Set(newSeats.filter(s => s.assignedPersonId).map(s => s.assignedPersonId));
    const attendingPeople = projectState.personnel.filter(p => {
        const isAtt = p.attendingSessionIds ? p.attendingSessionIds.includes(activeSession.id) : true;
        return isAtt && !occupiedPersonIds.has(p.id);
    });

    attendingPeople.sort((a, b) => {
        const wA = projectState.categories.find(c => c.label === a.category)?.weight || 0;
        const wB = projectState.categories.find(c => c.label === b.category)?.weight || 0;
        if (wA !== wB) return wB - wA;
        return b.rankScore - a.rankScore;
    });

    availableSeats.sort((a, b) => {
        const wA = a.rankWeight ?? 9999;
        const wB = b.rankWeight ?? 9999;
        if (wA !== wB) return wA - wB;
        if (Math.abs(a.y - b.y) > 10) return a.y - b.y;
        return a.x - b.x;
    });

    for (const person of attendingPeople) {
        const targetSeat = availableSeats.find(s => {
            if (s.assignedPersonId) return false;
            // 【核心防呆】若鎖定開啟，碰到有設定類別的座位，人與類別不符必須跳過
            if (isZoneLocked && s.zoneCategory && s.zoneCategory !== person.category) return false;
            return true;
        });
        if (targetSeat) {
            newSeats.find(s => s.id === targetSeat.id)!.assignedPersonId = person.id;
        }
    }

    updateActiveSession(s => ({ ...s, venue: { ...s.venue, seats: newSeats } }));
    get().syncSeatingStatus();
  },

  // 3. 依位置排位
  autoArrangeByPosition: (arrangeAll = true, isZoneLocked = true) => {
    const projectState = useProjectStore.getState();
    const activeSession = projectState.sessions.find(s => s.id === projectState.activeSessionId);
    if (!activeSession) return;

    const newSeats = [...activeSession.venue.seats];
    const availableSeats = newSeats.filter(s => s.type !== 'shape' && !s.isPinned && s.isVisible !== false);
    
    if (arrangeAll) {
        newSeats.forEach(s => { if (s.type !== 'shape' && !s.isPinned) s.assignedPersonId = null; });
    }

    const occupiedPersonIds = new Set(newSeats.filter(s => s.assignedPersonId).map(s => s.assignedPersonId));
    const attendingPeople = projectState.personnel.filter(p => {
        const isAtt = p.attendingSessionIds ? p.attendingSessionIds.includes(activeSession.id) : true;
        return isAtt && !occupiedPersonIds.has(p.id);
    });

    attendingPeople.sort((a, b) => {
        const wA = projectState.categories.find(c => c.label === a.category)?.weight || 0;
        const wB = projectState.categories.find(c => c.label === b.category)?.weight || 0;
        if (wA !== wB) return wB - wA;
        return b.rankScore - a.rankScore;
    });

    availableSeats.sort((a, b) => {
        if (Math.abs(a.y - b.y) > 10) return a.y - b.y;
        return a.x - b.x;
    });

    for (const person of attendingPeople) {
        const targetSeat = availableSeats.find(s => {
            if (s.assignedPersonId) return false;
            // 【核心防呆】若鎖定開啟，碰到有設定類別的座位，人與類別不符必須跳過
            if (isZoneLocked && s.zoneCategory && s.zoneCategory !== person.category) return false;
            return true;
        });
        if (targetSeat) {
            newSeats.find(s => s.id === targetSeat.id)!.assignedPersonId = person.id;
        }
    }

    updateActiveSession(s => ({ ...s, venue: { ...s.venue, seats: newSeats } }));
    get().syncSeatingStatus();
  },

  resetSeating: () => {
    updateActiveSession(s => ({ ...s, venue: { ...s.venue, seats: s.venue.seats.map(seat => ({ ...seat, assignedPersonId: seat.isPinned ? seat.assignedPersonId : null as string | null })) } }));
    get().syncSeatingStatus();
  },

  syncSeatingStatus: () => {
    const projectState = useProjectStore.getState();
    const activeSession = projectState.sessions.find(s => s.id === projectState.activeSessionId);
    if (!activeSession) return;
    const seatedPersonIds = new Set(activeSession.venue.seats.filter(s => s.assignedPersonId !== null).map(s => s.assignedPersonId));
    useProjectStore.setState({
      personnel: projectState.personnel.map(p => ({ ...p, isSeated: seatedPersonIds.has(p.id) }))
    });
  }
}));