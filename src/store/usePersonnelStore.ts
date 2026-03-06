// src/store/usePersonnelStore.ts
import { create } from 'zustand';
import { useProjectStore } from './useProjectStore';
import type { Person, Session } from '../types';

interface PersonnelState {
  addNewPerson: (name: string, title: string, org: string, category: string, rankScore: number) => void;
  updatePersonnelList: (list: Person[]) => void;
  removePerson: (id: string) => void;
  autoArrangeByCategory: () => void; 
  autoArrangeByImportance: () => void; // 【新增】依重要度
  autoArrangeByPosition: () => void;   // 【新增】依位置
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
    
    useProjectStore.setState({
      personnel: [
          { 
            id: `person-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, 
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

// 1. 依區塊排位 (先找尋對應的 zoneCategory，找不到才隨便坐)
  autoArrangeByCategory: () => {
    const projectState = useProjectStore.getState();
    const activeSession = projectState.sessions.find(s => s.id === projectState.activeSessionId);
    if (!activeSession) return;

    const newSeats = [...activeSession.venue.seats];
    const availableSeats = newSeats.filter(s => s.type !== 'shape' && !s.isPinned && s.isVisible !== false);
    
    // 取得有出席本場次、且還沒被釘選座位的人員
    const pinnedPersonIds = new Set(newSeats.filter(s => s.isPinned && s.assignedPersonId).map(s => s.assignedPersonId));
    const attendingPeople = projectState.personnel.filter(p => {
        const isAtt = p.attendingSessionIds ? p.attendingSessionIds.includes(activeSession.id) : true;
        return isAtt && !pinnedPersonIds.has(p.id);
    });

    // 【核心邏輯】排序：類別權重(大到小) -> 人員權重(大到小)
    attendingPeople.sort((a, b) => {
        const wA = projectState.categories.find(c => c.label === a.category)?.weight || 0;
        const wB = projectState.categories.find(c => c.label === b.category)?.weight || 0;
        if (wA !== wB) return wB - wA;
        return b.rankScore - a.rankScore;
    });

    // 清空未釘選的座位
    newSeats.forEach(s => { if (s.type !== 'shape' && !s.isPinned) s.assignedPersonId = null; });

    // 先針對有「區塊屬性」的座位進行媒合
    const unassignedPeople = [];
    for (const person of attendingPeople) {
        const targetSeat = availableSeats.find(s => !s.assignedPersonId && s.zoneCategory === person.category);
        if (targetSeat) {
            newSeats.find(s => s.id === targetSeat.id)!.assignedPersonId = person.id;
        } else {
            unassignedPeople.push(person);
        }
    }

    // 剩下的人隨機塞入剩下的空位 (優先前排)
    availableSeats.sort((a, b) => a.y - b.y);
    for (const person of unassignedPeople) {
        const emptySeat = availableSeats.find(s => !s.assignedPersonId);
        if (emptySeat) newSeats.find(s => s.id === emptySeat.id)!.assignedPersonId = person.id;
    }

    updateActiveSession(s => ({ ...s, venue: { ...s.venue, seats: newSeats } }));
    get().syncSeatingStatus();
  },

  // 2. 依重要度排位 (不看區塊，純看座位優先度與人員權重)
  autoArrangeByImportance: () => {
    const projectState = useProjectStore.getState();
    const activeSession = projectState.sessions.find(s => s.id === projectState.activeSessionId);
    if (!activeSession) return;

    const newSeats = [...activeSession.venue.seats];
    const availableSeats = newSeats.filter(s => s.type !== 'shape' && !s.isPinned && s.isVisible !== false);
    
    // 座位排序：自訂權重(小到大) -> 前排(Y) -> 左側(X)
    availableSeats.sort((a, b) => {
        const wA = a.rankWeight ?? 9999;
        const wB = b.rankWeight ?? 9999;
        if (wA !== wB) return wA - wB;
        if (Math.abs(a.y - b.y) > 20) return a.y - b.y;
        return a.x - b.x;
    });

    const pinnedPersonIds = new Set(newSeats.filter(s => s.isPinned && s.assignedPersonId).map(s => s.assignedPersonId));
    const attendingPeople = projectState.personnel.filter(p => {
        const isAtt = p.attendingSessionIds ? p.attendingSessionIds.includes(activeSession.id) : true;
        return isAtt && !pinnedPersonIds.has(p.id);
    });

    // 排序：類別權重(大到小) -> 人員權重(大到小)
    attendingPeople.sort((a, b) => {
        const wA = projectState.categories.find(c => c.label === a.category)?.weight || 0;
        const wB = projectState.categories.find(c => c.label === b.category)?.weight || 0;
        if (wA !== wB) return wB - wA;
        return b.rankScore - a.rankScore;
    });

    newSeats.forEach(s => { if (s.type !== 'shape' && !s.isPinned) s.assignedPersonId = null; });

    let seatIndex = 0;
    for (const person of attendingPeople) {
        if (seatIndex < availableSeats.length) {
            newSeats.find(s => s.id === availableSeats[seatIndex].id)!.assignedPersonId = person.id;
            seatIndex++;
        }
    }

    updateActiveSession(s => ({ ...s, venue: { ...s.venue, seats: newSeats } }));
    get().syncSeatingStatus();
  },

  // 3. 依位置排位 (純看空間座標)
  autoArrangeByPosition: () => {
    const projectState = useProjectStore.getState();
    const activeSession = projectState.sessions.find(s => s.id === projectState.activeSessionId);
    if (!activeSession) return;

    const newSeats = [...activeSession.venue.seats];
    const availableSeats = newSeats.filter(s => s.type !== 'shape' && !s.isPinned && s.isVisible !== false);
    
    // 座位：純粹依照空間座標排序 (前排優先，然後由左至右)
    availableSeats.sort((a, b) => {
        if (Math.abs(a.y - b.y) > 20) return a.y - b.y;
        return a.x - b.x;
    });

    const pinnedPersonIds = new Set(newSeats.filter(s => s.isPinned && s.assignedPersonId).map(s => s.assignedPersonId));
    const attendingPeople = projectState.personnel.filter(p => {
        const isAtt = p.attendingSessionIds ? p.attendingSessionIds.includes(activeSession.id) : true;
        return isAtt && !pinnedPersonIds.has(p.id);
    });

    // 排序：類別權重(大到小) -> 人員權重(大到小)
    attendingPeople.sort((a, b) => {
        const wA = projectState.categories.find(c => c.label === a.category)?.weight || 0;
        const wB = projectState.categories.find(c => c.label === b.category)?.weight || 0;
        if (wA !== wB) return wB - wA;
        return b.rankScore - a.rankScore;
    });

    newSeats.forEach(s => { if (s.type !== 'shape' && !s.isPinned) s.assignedPersonId = null; });

    let seatIndex = 0;
    for (const person of attendingPeople) {
        if (seatIndex < availableSeats.length) {
            newSeats.find(s => s.id === availableSeats[seatIndex].id)!.assignedPersonId = person.id;
            seatIndex++;
        }
    }

    updateActiveSession(s => ({ ...s, venue: { ...s.venue, seats: newSeats } }));
    get().syncSeatingStatus();
  },

  resetSeating: () => {
    updateActiveSession(s => ({ ...s, venue: { ...s.venue, seats: s.venue.seats.map(seat => ({ ...seat, assignedPersonId: null as string | null })) } }));
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