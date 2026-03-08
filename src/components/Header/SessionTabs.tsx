// src/components/Header/SessionTabs.tsx
import React, { useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { Plus, X, Edit2, Check, Camera, LayoutGrid } from 'lucide-react';

export const SessionTabs: React.FC = () => {
  const { 
    sessions, activeSessionId, setActiveSession, addSession, removeSession, updateSessionName,
    activeViewMode, setActiveViewMode, activePhotoBatchId, setActivePhotoBatchId,
    addPhotoBatch, removePhotoBatch, updatePhotoBatchName
  } = useProjectStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [editBatchName, setEditBatchName] = useState('');

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const photoBatches = activeSession?.photoBatches || [];

  const handleEditSession = (id: string, currentName: string) => { setEditingId(id); setEditName(currentName); };
  const handleSaveSession = (id: string) => { if (editName.trim()) updateSessionName(id, editName.trim()); setEditingId(null); };

  const handleEditBatch = (id: string, currentName: string) => { setEditingBatchId(id); setEditBatchName(currentName); };
  const handleSaveBatch = (id: string) => { if (editBatchName.trim()) updatePhotoBatchName(id, editBatchName.trim()); setEditingBatchId(null); };

  const handleSwitchToPhoto = () => {
      setActiveViewMode('photo');
      if (photoBatches.length === 0) {
          addPhotoBatch('第 1 拍'); // 【修正】統一使用阿拉伯數字
      } else if (!activePhotoBatchId) {
          setActivePhotoBatchId(photoBatches[0].id);
      }
  };

  // 【核心新增】新增梯次時，詢問是否延續上一拍的場地與人員
  const handleAddBatch = () => {
      const nextNum = photoBatches.length + 1;
      const newName = `第 ${nextNum} 拍`;
      if (photoBatches.length > 0) {
          const prevBatch = photoBatches[photoBatches.length - 1];
          const doCopy = window.confirm(`是否將【${prevBatch.name}】的站位與人員延續到【${newName}】？\n\n(確定：複製站位與人員 / 取消：建立空白場地)`);
          addPhotoBatch(newName, doCopy ? prevBatch.id : undefined);
      } else {
          addPhotoBatch(newName);
      }
  };

  return (
    <div className="flex flex-col shrink-0 bg-slate-100 border-b border-slate-200">
      
      {/* 頂層：場次切換與模式開關 */}
      <div className="flex items-center justify-between w-full">
          <div className="flex items-center overflow-x-auto custom-scrollbar flex-1 px-2">
            {sessions.map(s => (
               <div key={s.id} 
                    className={`flex items-center gap-2 px-4 py-2 border-r border-slate-200 cursor-pointer min-w-max transition-colors ${activeSessionId === s.id ? 'bg-white border-t-2 border-t-blue-600 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-200'}`} 
                    onClick={() => { if (editingId !== s.id) setActiveSession(s.id); }}>
                  
                  {editingId === s.id ? (
                     <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                         <input autoFocus value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => { if (e.nativeEvent.isComposing) return; if (e.key === 'Enter') handleSaveSession(s.id); if (e.key === 'Escape') setEditingId(null); }} className="border border-blue-400 rounded px-1.5 py-0.5 text-sm outline-none text-slate-800 font-normal w-32" />
                         <button onClick={(e) => { e.stopPropagation(); handleSaveSession(s.id); }} className="p-1 bg-green-500 text-white rounded hover:bg-green-600"><Check size={14}/></button>
                         <button onClick={(e) => { e.stopPropagation(); setEditingId(null); }} className="p-1 bg-slate-400 text-white rounded hover:bg-slate-500"><X size={14}/></button>
                     </div>
                  ) : (
                     <>
                       <span onDoubleClick={() => handleEditSession(s.id, s.name)}>{s.name}</span>
                       {activeSessionId === s.id && ( <button onClick={(e) => { e.stopPropagation(); handleEditSession(s.id, s.name); }} className="text-slate-400 hover:text-blue-600 ml-1"><Edit2 size={12}/></button> )}
                     </>
                  )}
                  {sessions.length > 1 && editingId !== s.id && ( <button onClick={(e) => { e.stopPropagation(); if(window.confirm('確定刪除此場次？')) removeSession(s.id); }} className="text-slate-400 hover:text-red-500 p-0.5 rounded-full hover:bg-slate-100 ml-2"><X size={14}/></button> )}
               </div>
            ))}
            <button onClick={() => addSession(`新場次 ${sessions.length + 1}`)} className="flex items-center gap-1 px-4 py-2 text-sm text-slate-500 hover:text-blue-600 hover:bg-slate-200 transition-colors min-w-max">
                <Plus size={16}/> 新增場次
            </button>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-200 rounded-lg mx-2 shrink-0">
             <button onClick={() => setActiveViewMode('seat')} className={`flex items-center gap-1 px-4 py-1.5 rounded-md text-xs font-bold transition shadow-sm ${activeViewMode === 'seat' ? 'bg-white text-blue-600' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}>
                <LayoutGrid size={14}/> 座位模式
             </button>
             <button onClick={handleSwitchToPhoto} className={`flex items-center gap-1 px-4 py-1.5 rounded-md text-xs font-bold transition shadow-sm ${activeViewMode === 'photo' ? 'bg-fuchsia-600 text-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}>
                <Camera size={14}/> 拍照模式
             </button>
          </div>
      </div>

      {/* 第二層：拍照梯次 */}
      {activeViewMode === 'photo' && (
         <div className="flex items-center bg-fuchsia-50/70 border-t border-slate-200 px-2 overflow-x-auto custom-scrollbar shadow-inner">
             <span className="text-xs font-black text-fuchsia-800 ml-2 mr-4 shrink-0 flex items-center gap-1">
                 <Camera size={14}/> 動線梯次切換：
             </span>
             {photoBatches.map(b => (
                <div key={b.id} 
                     className={`flex items-center gap-2 px-4 py-1.5 border-r border-fuchsia-200 cursor-pointer min-w-max transition-colors text-sm ${activePhotoBatchId === b.id ? 'bg-white text-fuchsia-700 font-bold border-t-2' : 'text-fuchsia-600/70 hover:bg-fuchsia-100 border-t-2 border-transparent'}`}
                     style={activePhotoBatchId === b.id ? { borderTopColor: b.color } : {}}
                     onClick={() => { if (editingBatchId !== b.id) setActivePhotoBatchId(b.id); }}>
                   
                   {editingBatchId === b.id ? (
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <input autoFocus value={editBatchName} onChange={e => setEditBatchName(e.target.value)} onKeyDown={e => { if (e.nativeEvent.isComposing) return; if (e.key === 'Enter') handleSaveBatch(b.id); if (e.key === 'Escape') setEditingBatchId(null); }} className="border border-fuchsia-400 rounded px-1.5 py-0.5 text-xs outline-none text-slate-800 font-normal w-24" />
                          <button onClick={(e) => { e.stopPropagation(); handleSaveBatch(b.id); }} className="p-0.5 bg-green-500 text-white rounded"><Check size={12}/></button>
                          <button onClick={(e) => { e.stopPropagation(); setEditingBatchId(null); }} className="p-0.5 bg-slate-400 text-white rounded"><X size={12}/></button>
                      </div>
                   ) : (
                      <>
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color }}></div>
                        <span onDoubleClick={() => handleEditBatch(b.id, b.name)}>{b.name}</span>
                        {activePhotoBatchId === b.id && ( <button onClick={(e) => { e.stopPropagation(); handleEditBatch(b.id, b.name); }} className="text-fuchsia-300 hover:text-fuchsia-600 ml-1"><Edit2 size={12}/></button> )}
                      </>
                   )}
                   {photoBatches.length > 1 && editingBatchId !== b.id && ( <button onClick={(e) => { e.stopPropagation(); if(window.confirm('確定刪除此梯次？')) removePhotoBatch(b.id); }} className="text-fuchsia-300 hover:text-red-500 p-0.5 rounded-full hover:bg-fuchsia-100 ml-2"><X size={14}/></button> )}
                </div>
             ))}
             {/* 呼叫延續按鈕 */}
             <button onClick={handleAddBatch} className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold text-fuchsia-600 hover:bg-fuchsia-100 transition-colors min-w-max rounded-md ml-2 border border-dashed border-fuchsia-300">
                 <Plus size={14}/> 新增梯次
             </button>
         </div>
      )}
    </div>
  );
};