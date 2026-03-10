// src/store/useProjectStore.ts
import { create } from 'zustand';
import { DEFAULT_CATEGORIES } from '../utils/constants';
import type { Person, Category, Session, ProjectData, PhotoBatch, Seat } from '../types';

interface ProjectState {
  version: string;
  projectName: string;
  setProjectName: (name: string) => void;
  fileId: string | null;
  setFileId: (id: string | null) => void;
  
  personnel: Person[];
  setPersonnel: (personnel: Person[]) => void;
  addPersonnel: (people: Person[]) => void;
  updatePerson: (id: string, updates: Partial<Person>) => void;
  removePerson: (id: string) => void;
  
  categories: Category[];
  setCategories: (categories: Category[]) => void;
  addCategory: (category: Category) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  removeCategory: (id: string) => void;
  
  sessions: Session[];
  activeSessionId: string;
  setActiveSession: (id: string) => void;
  addSession: (name: string) => void;
  removeSession: (id: string) => void;
  updateSessionName: (sessionId: string, newName: string) => void;

  activeViewMode: 'seat' | 'photo';
  setActiveViewMode: (mode: 'seat' | 'photo') => void;
  
  activePhotoBatchId: string | null;
  setActivePhotoBatchId: (id: string | null) => void;

  // 🟢 拍照模式上下分割排位開關
  isSplitViewEnabled: boolean;
  toggleSplitView: () => void;
  
  addPhotoBatch: (name: string, copyFromId?: string) => void;
  removePhotoBatch: (id: string) => void;
  updatePhotoBatchName: (batchId: string, newName: string) => void;
  
  loadProjectData: (data: ProjectData) => void;
}

const defaultSessionId = `session-${Date.now()}`;

export const useProjectStore = create<ProjectState>((set, _get) => ({
  version: '4.0',
  projectName: '未命名活動專案',
  fileId: null,
  setProjectName: (name) => set({ projectName: name }),
  setFileId: (id) => set({ fileId: id }),

  personnel: [],
  setPersonnel: (personnel) => set({ personnel }),
  addPersonnel: (people) => set((state) => ({ personnel: [...state.personnel, ...people] })),
  updatePerson: (id, updates) => set((state) => ({ personnel: state.personnel.map(p => p.id === id ? { ...p, ...updates } : p) })),
  removePerson: (id) => set((state) => ({ personnel: state.personnel.filter(p => p.id !== id) })),

  categories: DEFAULT_CATEGORIES,
  setCategories: (categories) => set({ categories }),
  addCategory: (category) => set((state) => ({ categories: [...state.categories, category] })),
  updateCategory: (id, updates) => set((state) => ({ categories: state.categories.map(c => c.id === id ? { ...c, ...updates } : c) })),
  removeCategory: (id) => set((state) => ({ categories: state.categories.filter(c => c.id !== id) })),

  sessions: [{ id: defaultSessionId, name: '主場次 (開幕式)', photoBatches: [], venue: { seats: [], backgroundImage: null, stageScale: 0.4, stagePosition: { x: 0, y: 50 } } }],
  activeSessionId: defaultSessionId,
  
  setActiveSession: (id) => set({ activeSessionId: id }),
  addSession: (name) => set((state) => {
    const newSession: Session = { id: `session-${Date.now()}`, name, photoBatches: [], venue: { seats: [], backgroundImage: null, stageScale: 0.4, stagePosition: { x: 0, y: 50 } } };
    return { sessions: [...state.sessions, newSession], activeSessionId: newSession.id };
  }),
  removeSession: (id) => set((state) => {
    if (state.sessions.length <= 1) return state; 
    const newSessions = state.sessions.filter(s => s.id !== id);
    return { sessions: newSessions, activeSessionId: state.activeSessionId === id ? newSessions[0].id : state.activeSessionId };
  }),
  updateSessionName: (sessionId, newName) => set((state) => ({ sessions: state.sessions.map(s => s.id === sessionId ? { ...s, name: newName } : s) })),

  activeViewMode: 'seat',
  setActiveViewMode: (mode) => set({ activeViewMode: mode }),
  
  activePhotoBatchId: null,
  setActivePhotoBatchId: (id) => set({ activePhotoBatchId: id }),

  // 🟢 實作分割模式狀態
  isSplitViewEnabled: false,
  toggleSplitView: () => set((state) => ({ isSplitViewEnabled: !state.isSplitViewEnabled })),

  addPhotoBatch: (name, copyFromId) => set((state) => {
    const sessionIndex = state.sessions.findIndex(s => s.id === state.activeSessionId);
    if (sessionIndex === -1) return state;
    
    const session = state.sessions[sessionIndex];
    const batches = session.photoBatches || [];
    
    const colors = ['#f59e0b', '#ec4899', '#8b5cf6', '#10b981', '#3b82f6'];
    const color = colors[batches.length % colors.length];

    let newSpots: Seat[] = [];
    if (copyFromId) {
        const prevBatch = batches.find(b => b.id === copyFromId);
        if (prevBatch) {
            newSpots = prevBatch.spots.map(s => ({
                ...s,
                id: `seat-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
            }));
        }
    }

    const newBatch: PhotoBatch = { id: `batch-${Date.now()}`, name, color, spots: newSpots };
    const newSessions = [...state.sessions];
    newSessions[sessionIndex] = { ...session, photoBatches: [...batches, newBatch] };

    return { sessions: newSessions, activePhotoBatchId: newBatch.id };
  }),

  removePhotoBatch: (id) => set((state) => {
    const sessionIndex = state.sessions.findIndex(s => s.id === state.activeSessionId);
    if (sessionIndex === -1) return state;
    const session = state.sessions[sessionIndex];
    const batches = session.photoBatches || [];
    const newBatches = batches.filter(b => b.id !== id);
    const newSessions = [...state.sessions];
    newSessions[sessionIndex] = { ...session, photoBatches: newBatches };
    return { sessions: newSessions, activePhotoBatchId: state.activePhotoBatchId === id ? (newBatches[0]?.id || null) : state.activePhotoBatchId };
  }),

  updatePhotoBatchName: (batchId, newName) => set((state) => {
    const sessionIndex = state.sessions.findIndex(s => s.id === state.activeSessionId);
    if (sessionIndex === -1) return state;
    const session = state.sessions[sessionIndex];
    const batches = session.photoBatches || [];
    const newSessions = [...state.sessions];
    newSessions[sessionIndex] = { ...session, photoBatches: batches.map(b => b.id === batchId ? { ...b, name: newName } : b) };
    return { sessions: newSessions };
  }),

  loadProjectData: (data) => set({
    version: data.version || '4.0', projectName: data.projectName || '未命名活動專案', fileId: data.fileId || null,
    personnel: (data.personnel || []).map(p => ({ ...p, externalId: p.externalId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ext-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`) })),
    categories: data.categories || DEFAULT_CATEGORIES,
    sessions: data.sessions && data.sessions.length > 0 ? data.sessions.map(s => ({ ...s, photoBatches: s.photoBatches || [] })) : [{ id: defaultSessionId, name: '主場次 (開幕式)', photoBatches: [], venue: { seats: [], backgroundImage: null, stageScale: 0.4, stagePosition: { x: 0, y: 50 } } }],
    activeSessionId: data.activeSessionId || (data.sessions && data.sessions.length > 0 ? data.sessions[0].id : defaultSessionId),
    activeViewMode: data.activeViewMode || 'seat', activePhotoBatchId: data.activePhotoBatchId || null
  })
}));