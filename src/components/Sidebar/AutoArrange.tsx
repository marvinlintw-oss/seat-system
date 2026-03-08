// src/components/Sidebar/AutoArrange.tsx
import React, { useState } from 'react';
import { usePersonnelStore } from '../../store/usePersonnelStore';
import { Crown, LayoutGrid, Layers } from 'lucide-react';

export const AutoArrange: React.FC = () => {
  const { autoArrangeByImportance, autoArrangeByPosition, autoArrangeByCategory, resetSeating } = usePersonnelStore();
  const [arrangeAll, setArrangeAll] = useState(true);
  const [isZoneLocked, setIsZoneLocked] = useState(true);

  return (
    <div className="bg-slate-50 border-b border-slate-200 p-2 shrink-0">
      <div className="grid grid-cols-2 gap-1 mb-1.5">
        <div className="flex bg-slate-200 p-0.5 rounded-md">
          <button onClick={() => setArrangeAll(true)} className={`flex-1 text-[11px] py-1 rounded font-bold transition-all ${arrangeAll ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>重排全部</button>
          <button onClick={() => setArrangeAll(false)} className={`flex-1 text-[11px] py-1 rounded font-bold transition-all ${!arrangeAll ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>僅排待安排</button>
        </div>
        <div className="flex bg-slate-200 p-0.5 rounded-md">
          <button onClick={() => setIsZoneLocked(true)} className={`flex-1 text-[11px] py-1 rounded font-bold transition-all ${isZoneLocked ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>鎖定類別</button>
          <button onClick={() => setIsZoneLocked(false)} className={`flex-1 text-[11px] py-1 rounded font-bold transition-all ${!isZoneLocked ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>可跨類別</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1">
        <button onClick={() => autoArrangeByImportance(arrangeAll, isZoneLocked)} className="bg-indigo-50 text-indigo-700 text-[12px] py-1.5 rounded hover:bg-indigo-100 border border-indigo-200 font-bold transition">
          <Crown size={14} className="mx-auto mb-0.5" /> 自動:重要度
        </button>
        <button onClick={() => autoArrangeByPosition(arrangeAll, isZoneLocked)} className="bg-blue-50 text-blue-700 text-[12px] py-1.5 rounded hover:bg-blue-100 border border-blue-200 font-bold transition">
          <LayoutGrid size={14} className="mx-auto mb-0.5" /> 自動:位置
        </button>
        <button onClick={() => autoArrangeByCategory(arrangeAll, isZoneLocked)} className="bg-fuchsia-50 text-fuchsia-700 text-[12px] py-1.5 rounded hover:bg-fuchsia-100 border border-fuchsia-200 font-bold transition">
          <Layers size={14} className="mx-auto mb-0.5" /> 自動:區塊
        </button>
      </div>
      
      <button onClick={() => { if(window.confirm('確定要清空當前場次排位？')) resetSeating(); }} className="w-full text-[12px] text-slate-600 py-1 hover:text-red-500 transition mt-1">
        重置排位
      </button>
    </div>
  );
};