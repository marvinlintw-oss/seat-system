// src/store/useProjectStore.ts
import { create } from 'zustand';
import { DEFAULT_CATEGORIES } from '../utils/constants';
import type { Person, Category, Session, ProjectData } from '../types';

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
  
  loadProjectData: (data: ProjectData) => void;
}

const defaultSessionId = `session-${Date.now()}`;

export const useProjectStore = create<ProjectState>((set) => ({
  version: '4.0',
  projectName: '未命名活動專案',
  fileId: null,
  setProjectName: (name) => set({ projectName: name }),
  setFileId: (id) => set({ fileId: id }),

  personnel: [],
  setPersonnel: (personnel) => set({ personnel }),
  addPersonnel: (people) => set((state) => ({ personnel: [...state.personnel, ...people] })),
  updatePerson: (id, updates) => set((state) => ({
    personnel: state.personnel.map(p => p.id === id ? { ...p, ...updates } : p)
  })),
  removePerson: (id) => set((state) => ({
    personnel: state.personnel.filter(p => p.id !== id)
  })),

  // 【套用常數】預設載入完美的 19 個分類與權重
  categories: DEFAULT_CATEGORIES,
  setCategories: (categories) => set({ categories }),
  addCategory: (category) => set((state) => ({ categories: [...state.categories, category] })),
  updateCategory: (id, updates) => set((state) => ({
    categories: state.categories.map(c => c.id === id ? { ...c, ...updates } : c)
  })),
  removeCategory: (id) => set((state) => ({
    categories: state.categories.filter(c => c.id !== id)
  })),

  sessions: [{
    id: defaultSessionId,
    name: '主場次 (開幕式)',
    venue: {
      seats: [],
      backgroundImage: null,
      stageScale: 0.4,
      stagePosition: { x: 0, y: 50 }
    }
  }],
  activeSessionId: defaultSessionId,
  
  setActiveSession: (id) => set({ activeSessionId: id }),
  addSession: (name) => set((state) => {
    const newSession: Session = {
      id: `session-${Date.now()}`,
      name,
      venue: {
        seats: [],
        backgroundImage: null,
        stageScale: 0.4,
        stagePosition: { x: 0, y: 50 }
      }
    };
    return {
      sessions: [...state.sessions, newSession],
      activeSessionId: newSession.id
    };
  }),
  removeSession: (id) => set((state) => {
    if (state.sessions.length <= 1) return state; // 防呆：至少保留一個場次
    const newSessions = state.sessions.filter(s => s.id !== id);
    return {
      sessions: newSessions,
      activeSessionId: state.activeSessionId === id ? newSessions[0].id : state.activeSessionId
    };
  }),
  
  // 【新增功能】場次改名
  updateSessionName: (sessionId, newName) => set((state) => ({
    sessions: state.sessions.map(s => s.id === sessionId ? { ...s, name: newName } : s)
  })),

  // 載入雲端專案邏輯，若雲端沒資料則退回預設常數
  loadProjectData: (data) => set({
    version: data.version || '4.0',
    projectName: data.projectName || '未命名活動專案',
    fileId: data.fileId || null,
    personnel: data.personnel || [],
    categories: data.categories || DEFAULT_CATEGORIES,
    sessions: data.sessions && data.sessions.length > 0 ? data.sessions : [{
      id: defaultSessionId,
      name: '主場次 (開幕式)',
      venue: { seats: [], backgroundImage: null, stageScale: 0.4, stagePosition: { x: 0, y: 50 } }
    }],
    activeSessionId: data.activeSessionId || (data.sessions && data.sessions.length > 0 ? data.sessions[0].id : defaultSessionId)
  })
}));