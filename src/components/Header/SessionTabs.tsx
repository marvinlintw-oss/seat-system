// src/components/Header/SessionTabs.tsx
import React, { useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { Plus, X, Edit2, Check } from 'lucide-react';

export const SessionTabs: React.FC = () => {
  const { sessions, activeSessionId, setActiveSession, addSession, removeSession, updateSessionName } = useProjectStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleEdit = (id: string, currentName: string) => {
      setEditingId(id);
      setEditName(currentName);
  };

  const handleSave = (id: string) => {
      // 確保不是空白名稱才存檔
      if (editName.trim()) {
          updateSessionName(id, editName.trim());
      }
      setEditingId(null);
  };

  return (
    <div className="flex items-center bg-slate-100 px-2 overflow-x-auto custom-scrollbar border-b border-slate-200 shrink-0">
      {sessions.map(s => (
         <div key={s.id} 
              className={`flex items-center gap-2 px-4 py-2 border-r border-slate-200 cursor-pointer min-w-max transition-colors ${activeSessionId === s.id ? 'bg-white border-t-2 border-t-blue-600 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-200'}`} 
              onClick={() => { if (editingId !== s.id) setActiveSession(s.id); }}>
            
            {editingId === s.id ? (
               <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                   <input 
                      autoFocus 
                      value={editName} 
                      onChange={e => setEditName(e.target.value)} 
                      onKeyDown={e => {
                          if (e.nativeEvent.isComposing) return;
                          if (e.key === 'Enter') handleSave(s.id);
                          if (e.key === 'Escape') setEditingId(null);
                      }} 
                      className="border border-blue-400 rounded px-1.5 py-0.5 text-sm outline-none text-slate-800 font-normal w-32 shadow-inner" 
                   />
                   <button 
                      onClick={(e) => { e.stopPropagation(); handleSave(s.id); }} 
                      className="p-1 bg-green-500 text-white rounded hover:bg-green-600 transition shadow-sm flex items-center justify-center"
                      title="儲存"
                   >
                       <Check size={14}/>
                   </button>
                   <button 
                      onClick={(e) => { e.stopPropagation(); setEditingId(null); }} 
                      className="p-1 bg-slate-400 text-white rounded hover:bg-slate-500 transition shadow-sm flex items-center justify-center"
                      title="取消"
                   >
                       <X size={14}/>
                   </button>
               </div>
            ) : (
               <>
                 <span onDoubleClick={() => handleEdit(s.id, s.name)}>{s.name}</span>
                 {activeSessionId === s.id && (
                     <button onClick={(e) => { e.stopPropagation(); handleEdit(s.id, s.name); }} className="text-slate-400 hover:text-blue-600 ml-1"><Edit2 size={12}/></button>
                 )}
               </>
            )}

            {sessions.length > 1 && editingId !== s.id && (
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