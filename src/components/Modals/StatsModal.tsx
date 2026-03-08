// src/components/Modals/StatsModal.tsx
import React from 'react';
import { createPortal } from 'react-dom';
import { useProjectStore } from '../../store/useProjectStore';
import { X, BarChart3 } from 'lucide-react';

interface Props { isOpen: boolean; onClose: () => void; }

export const StatsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { personnel, sessions, activeSessionId, categories } = useProjectStore();
  
  if (!isOpen) return null;

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const seats = activeSession?.venue.seats || [];

  // 計算統計數據
  const stats = categories.map(cat => {
    const catSeats = seats.filter(s => s.zoneCategory === cat.label && s.type !== 'shape');
    const assignedCount = catSeats.filter(s => s.assignedPersonId !== null).length;
    // 尚未入座：該類別座位數 - 該類別已坐人數
    const unassignedCount = catSeats.length - assignedCount;

    return {
      label: cat.label,
      color: cat.color,
      totalSeats: catSeats.length,
      assigned: assignedCount,
      remaining: unassignedCount
    };
  }).filter(s => s.totalSeats > 0); // 只顯示該場次有設定座位的類別

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
          <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <BarChart3 size={20} className="text-blue-600"/> 排位即時統計戰情室
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-full text-slate-500 transition"><X size={20}/></button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-4 gap-4 mb-6">
             <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <div className="text-xs text-blue-600 font-bold mb-1">總座位數</div>
                <div className="text-2xl font-black text-blue-900">{seats.filter(s => s.type !== 'shape').length}</div>
             </div>
             <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                <div className="text-xs text-green-600 font-bold mb-1">已安排</div>
                <div className="text-2xl font-black text-green-900">{seats.filter(s => s.assignedPersonId).length}</div>
             </div>
             <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                <div className="text-xs text-amber-600 font-bold mb-1">總缺席/未入座</div>
                <div className="text-2xl font-black text-amber-900">{personnel.filter(p => !p.isSeated).length}</div>
             </div>
             <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="text-xs text-slate-500 font-bold mb-1">場次</div>
                <div className="text-sm font-bold text-slate-700 truncate">{activeSession?.name}</div>
             </div>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-500 border-b-2 border-slate-100 text-left">
                <th className="pb-2 font-bold">類別區塊</th>
                <th className="pb-2 text-center font-bold">類別座位數</th>
                <th className="pb-2 text-center font-bold">已安排座位</th>
                <th className="pb-2 text-center font-bold text-amber-600">尚未入座 (空位)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {stats.map(s => (
                <tr key={s.label} className="hover:bg-slate-50">
                  <td className="py-3 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full border border-slate-200" style={{backgroundColor: s.color}}></div>
                    <span className="font-medium text-slate-700">{s.label}</span>
                  </td>
                  <td className="py-3 text-center font-mono font-bold text-slate-500">{s.totalSeats}</td>
                  <td className="py-3 text-center font-mono font-bold text-blue-600">{s.assigned}</td>
                  <td className={`py-3 text-center font-mono font-bold ${s.remaining > 0 ? 'text-amber-500' : 'text-slate-300'}`}>
                    {s.remaining}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-50 border-t flex justify-center text-[10px] text-slate-400">
           💡 本數據依據「當前場次」之區塊屬性與入座名單即時運算
        </div>
      </div>
    </div>,
    document.body
  );
};