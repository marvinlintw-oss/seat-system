// src/components/Sidebar/ManualAssign.tsx
import React from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { User, CheckCircle2 } from 'lucide-react';
import type { Person } from '../../types';

export const ManualAssign: React.FC = () => {
  const { personnel, activeSessionId, sessions, categories } = useProjectStore();
  const activeSession = sessions.find(s => s.id === activeSessionId);
  
  const seatedIdsInCurrentSession = new Set(
    activeSession?.venue.seats.filter(s => s.assignedPersonId).map(s => s.assignedPersonId) || []
  );

  const isAttending = (p: any) => p.attendingSessionIds ? p.attendingSessionIds.includes(activeSessionId) : true;
  
  // 【核心功能】雙重排序引擎：類別權重 -> 分數
  const sortPersonnel = (list: Person[]) => {
      return [...list].sort((a, b) => {
          const wA = categories.find(c => c.label === a.category)?.weight || 0;
          const wB = categories.find(c => c.label === b.category)?.weight || 0;
          if (wA !== wB) return wB - wA; // 類別權重(大到小)
          return b.rankScore - a.rankScore; // 權重分數(大到小)
      });
  };

  const attendingPersonnel = personnel.filter(isAttending);
  const absentPersonnel = sortPersonnel(personnel.filter(p => !isAttending(p)));

  const seated = sortPersonnel(attendingPersonnel.filter(p => seatedIdsInCurrentSession.has(p.id)));
  const unseated = sortPersonnel(attendingPersonnel.filter(p => !seatedIdsInCurrentSession.has(p.id)));

  const handleDragStart = (e: React.DragEvent, personId: string) => {
    e.dataTransfer.setData('personId', personId);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 custom-scrollbar pb-12">
      {/* 待安排清單 */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex justify-between">
            待安排 ({unseated.length})
        </h3>
        <div className="space-y-2">
            {unseated.map(person => (
                <div key={person.id} draggable onDragStart={(e) => handleDragStart(e, person.id)} className="bg-white border p-3 rounded-lg shadow-sm flex items-center gap-3 transition relative group cursor-grab active:cursor-grabbing hover:border-blue-400 hover:shadow-md border-slate-200">
                    <div className="bg-yellow-100 p-2 rounded-full shrink-0">
                        <User className="text-yellow-600 fill-yellow-400" size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-800 truncate text-sm">{person.name}</div>
                        <div className="text-xs text-slate-500 truncate">{person.organization} | {person.title}</div>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded mb-1">{person.category}</span>
                        <span className="text-xs font-mono font-bold text-blue-600">{person.rankScore}</span>
                    </div>
                </div>
            ))}
            {unseated.length === 0 && <div className="text-center text-slate-400 text-xs py-4">所有人員已入座</div>}
        </div>
      </div>

      {/* 已安排清單 */}
      {seated.length > 0 && (
        <div>
           <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 border-t pt-4">已排座 ({seated.length})</h3>
           <div className="space-y-1 opacity-70">
            {seated.map(person => (
              <div key={person.id} className="flex items-center gap-2 p-2 bg-white/50 rounded border border-transparent hover:border-slate-200">
                <CheckCircle2 className="text-green-500 shrink-0" size={14} />
                <span className="text-xs font-bold text-slate-600 truncate flex-1 line-through">{person.name}</span>
                <span className="text-[10px] text-slate-400">{person.category}</span>
              </div>
            ))}
           </div>
        </div>
      )}

      {/* 未出席清單 */}
      {absentPersonnel.length > 0 && (
        <div>
           <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 border-t pt-4">未出席本場次 ({absentPersonnel.length})</h3>
           <div className="space-y-1 opacity-50">
            {absentPersonnel.map(person => (
              <div key={person.id} className="flex items-center gap-2 p-2 bg-slate-200/50 rounded border border-transparent cursor-not-allowed">
                <div className="w-3 h-3 rounded-full bg-slate-400 shrink-0"></div>
                <span className="text-xs font-medium text-slate-500 truncate flex-1">{person.name}</span>
                <span className="text-[10px] text-slate-400">{person.category}</span>
              </div>
            ))}
           </div>
        </div>
      )}
    </div>
  );
};