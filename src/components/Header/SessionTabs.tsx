// src/components/Header/SessionTabs.tsx
import React, { useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { Plus, X, Edit2 } from 'lucide-react';

export const SessionTabs: React.FC = () => {
  const { sessions, activeSessionId, setActiveSession, addSession, removeSession, updateSessionName } = useProjectStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleEdit = (id: string, currentName: string) => {
      setEditingId(id);
      setEditName(currentName);
  };

  const handleSave = (id: string) => {
      if (editName.trim()) updateSessionName(id, editName.trim());
      setEditingId(null);
  };

  return (
    <div className="flex items-center bg-slate-100 px-2 overflow-x-auto custom-scrollbar border-b border-slate-200 shrink-0">
      {sessions.map(s => (
         <div key={s.id} 
              className={`flex items-center gap-2 px-4 py-2 border-r border-slate-200 cursor-pointer min-w-max transition-colors ${activeSessionId === s.id ? 'bg-white border-t-2 border-t-blue-600 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-200'}`} 
              onClick={() => setActiveSession(s.id)}>
            
            {editingId === s.id ? (
               <input 
                  autoFocus value={editName} onChange={e => setEditName(e.target.value)} 
                  onBlur={() => handleSave(s.id)} onKeyDown={e => e.key === 'Enter' && handleSave(s.id)} 
                  className="border border-blue-300 rounded px-1 py-0.5 text-xs outline-none text-slate-700 font-normal" 
               />
            ) : (
               <>
                 <span onDoubleClick={() => handleEdit(s.id, s.name)}>{s.name}</span>
                 {activeSessionId === s.id && (
                     <button onClick={(e) => { e.stopPropagation(); handleEdit(s.id, s.name); }} className="text-slate-400 hover:text-blue-600 ml-1"><Edit2 size={12}/></button>
                 )}
               </>
            )}

            {sessions.length > 1 && (
                <button onClick={(e) => { e.stopPropagation(); if(window.confirm('確定刪除此場次？(該場次的專屬座位安排將遺失)')) removeSession(s.id); }} className="text-slate-400 hover:text-red-500 p-0.5 rounded-full hover:bg-slate-100 ml-2"><X size={14}/></button>
            )}
         </div>
      ))}
      <button onClick={() => addSession(`新場次 ${sessions.length + 1}`)} className="flex items-center gap-1 px-4 py-2 text-sm text-slate-500 hover:text-blue-600 hover:bg-slate-200 transition-colors min-w-max">
          <Plus size={16}/> 新增場次
      </button>
    </div>
  );
};