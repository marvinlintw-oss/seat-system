// src/components/Sidebar/ManualAssign.tsx
import React from 'react';
import { useProjectStore } from '../../store/useProjectStore';

export const ManualAssign: React.FC = () => {
  const { personnel, sessions, activeSessionId, categories } = useProjectStore();

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const seats = activeSession?.venue.seats || [];

  // 取得已入座的人員 ID
  const seatedIds = new Set(seats.filter(s => s.assignedPersonId).map(s => s.assignedPersonId));
  
  // 找出有出席當前場次，且尚未入座的人
  const unassigned = personnel.filter(p => {
    const isAttending = p.attendingSessionIds ? p.attendingSessionIds.includes(activeSessionId) : true;
    return isAttending && !seatedIds.has(p.id);
  }).sort((a, b) => b.rankScore - a.rankScore); // 預設按權重降冪排列

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-100/50">
      <div className="p-2 border-b border-slate-200 bg-white shrink-0 flex justify-between items-center">
          <span className="text-[10px] font-bold text-slate-500">待安排名單 ({unassigned.length})</span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5 custom-scrollbar">
        {unassigned.map(person => {
          const cat = categories.find(c => c.label === person.category);
          const color = cat ? cat.color : '#cbd5e1';
          
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
                  <span className="font-bold text-xs text-slate-800 truncate">{person.name}</span>
                  <span className="text-[9px] text-slate-400 font-mono truncate">{person.organization}</span>
                </div>
                <div className="text-[9px] text-slate-500 truncate leading-tight">
                  {person.title} {person.remarks && <span className="text-amber-600 font-bold ml-1">📝 {person.remarks}</span>}
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
                本場次所有人員皆已安排座位
            </div>
        )}
      </div>
    </div>
  );
};