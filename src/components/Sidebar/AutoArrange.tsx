// src/components/Sidebar/AutoArrange.tsx
import React from 'react';
import { usePersonnelStore } from '../../store/usePersonnelStore';
import { Crown, LayoutGrid, Layers } from 'lucide-react';

export const AutoArrange: React.FC = () => {
  const { 
    autoArrangeByImportance, 
    autoArrangeByPosition, 
    autoArrangeByCategory, 
    resetSeating 
  } = usePersonnelStore();

  return (
    <div className="bg-slate-50 border-b border-slate-200 p-4 shrink-0">
      <h3 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">自動排位功能</h3>
      <div className="grid grid-cols-3 gap-2 mb-2">
        <button 
          onClick={autoArrangeByImportance} 
          className="bg-indigo-50 text-indigo-700 text-xs py-2 rounded hover:bg-indigo-100 transition flex flex-col items-center justify-center gap-1 font-medium border border-indigo-200"
        >
          <Crown size={14} /> 依重要度
        </button>
        <button 
          onClick={autoArrangeByPosition} 
          className="bg-blue-50 text-blue-700 text-xs py-2 rounded hover:bg-blue-100 transition flex flex-col items-center justify-center gap-1 font-medium border border-blue-200"
        >
          <LayoutGrid size={14} /> 依位置
        </button>
        <button 
          onClick={autoArrangeByCategory} 
          className="bg-purple-50 text-purple-700 text-xs py-2 rounded hover:bg-purple-100 transition flex flex-col items-center justify-center gap-1 font-medium border border-purple-200"
        >
          <Layers size={14} /> 依區塊
        </button>
      </div>
      <button 
        onClick={resetSeating} 
        className="w-full border border-slate-300 text-slate-600 text-xs py-1.5 rounded hover:bg-slate-100 transition"
      >
        重置所有人員排位
      </button>
    </div>
  );
};