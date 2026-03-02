// src/components/Sidebar/ManualAssign.tsx
import React from 'react';
import { usePersonnelStore } from '../../store/usePersonnelStore';
import { User, CheckCircle2 } from 'lucide-react';

export const ManualAssign: React.FC = () => {
  const { personnel } = usePersonnelStore();
  
  const unseated = personnel.filter(p => !p.isSeated);
  const seated = personnel.filter(p => p.isSeated);

  const handleDragStart = (e: React.DragEvent, personId: string) => {
    e.dataTransfer.setData('personId', personId);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
      {/* 待安排清單 */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex justify-between">
            待安排 ({unseated.length})
        </h3>
        <div className="space-y-2">
            {unseated.map(person => (
                <div 
                    key={person.id} 
                    draggable 
                    onDragStart={(e) => handleDragStart(e, person.id)} 
                    className="bg-white border p-3 rounded-lg shadow-sm flex items-center gap-3 transition relative group cursor-grab active:cursor-grabbing hover:border-blue-400 hover:shadow-md border-slate-200"
                >
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
      <div>
         <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">已排座 ({seated.length})</h3>
         <div className="space-y-1">
          {seated.map(person => (
            <div key={person.id} className="flex items-center gap-2 p-2 bg-white/50 rounded border border-transparent hover:border-slate-200">
              <CheckCircle2 className="text-green-500 shrink-0" size={14} />
              <span className="text-xs font-medium text-slate-600 truncate flex-1">{person.name}</span>
              <span className="text-[10px] text-slate-400">{person.organization}</span>
            </div>
          ))}
         </div>
      </div>
    </div>
  );
};