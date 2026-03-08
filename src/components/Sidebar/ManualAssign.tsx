// src/components/Sidebar/ManualAssign.tsx
import React from 'react';
import { useProjectStore } from '../../store/useProjectStore';

export const ManualAssign: React.FC = () => {
  const { personnel, sessions, activeSessionId, categories, activeViewMode, activePhotoBatchId } = useProjectStore();

  const activeSession = sessions.find(s => s.id === activeSessionId);
  
  let currentSpots = [];
  if (activeViewMode === 'photo') {
      const batch = activeSession?.photoBatches?.find(b => b.id === activePhotoBatchId);
      currentSpots = batch ? batch.spots : [];
  } else {
      currentSpots = activeSession?.venue.seats || [];
  }

  const assignedIds = new Set(currentSpots.filter(s => s.assignedPersonId).map(s => s.assignedPersonId));
  
  const unassigned = personnel.filter(p => {
    const isAttending = p.attendingSessionIds ? p.attendingSessionIds.includes(activeSessionId) : true;
    return isAttending && !assignedIds.has(p.id);
  }).sort((a, b) => b.rankScore - a.rankScore);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-100/50">
      <div className="p-2 border-b border-slate-200 bg-white shrink-0 flex justify-between items-center">
          <span className="text-[11px] font-bold text-slate-500">
             {activeViewMode === 'photo' ? '待上台名單' : '待安排名單'} ({unassigned.length})
          </span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5 custom-scrollbar">
        {unassigned.map(person => {
          const cat = categories.find(c => c.label === person.category);
          const color = cat ? cat.color : '#cbd5e1';
          
          // 【核心新增】計算這個人在這場次的「其他梯次」是否已經有站位
          let participatedBatches: string[] = [];
          if (activeViewMode === 'photo' && activeSession?.photoBatches) {
              participatedBatches = activeSession.photoBatches
                  .filter(b => b.spots.some(s => s.assignedPersonId === person.id))
                  .map(b => b.name.match(/\d+/) ? b.name.match(/\d+/)![0] : b.name);
          }
          
          return (
            <div
              key={person.id}
              draggable
              onDragStart={(e) => e.dataTransfer.setData('personId', person.id)}
              className="bg-white border-l-4 rounded shadow-sm p-1.5 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-blue-400 transition-all flex items-center gap-2"
              style={{ borderLeftColor: color }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5 mb-0.5">
                  <span className="font-bold text-sm text-slate-800 truncate">{person.name}</span>
                  <span className="text-[12px] text-slate-500 font-mono truncate">{person.organization}</span>
                </div>
                <div className="text-[12px] text-slate-500 truncate leading-tight">
                  {person.title} 
                  {person.remarks && <span className="text-amber-600 font-bold ml-1">📝 {person.remarks}</span>}
                  {/* 【顯示提示】如果他已經在別拍，用橘黃色標籤提示 */}
                  {participatedBatches.length > 0 && (
                      <span className="ml-1 inline-block bg-orange-100 text-orange-700 px-1 py-0.5 rounded font-bold">
                          已排入 {participatedBatches.join(', ')} 拍
                      </span>
                  )}
                </div>
              </div>
              <div className="text-[9px] font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded shrink-0">
                {person.rankScore}
              </div>
            </div>
          );
        })}
        {unassigned.length === 0 && (
            <div className="text-center text-xs text-slate-400 mt-4">
                {activeViewMode === 'photo' ? '本梯次人員皆已就位' : '本場次所有人員皆已安排座位'}
            </div>
        )}
      </div>
    </div>
  );
};