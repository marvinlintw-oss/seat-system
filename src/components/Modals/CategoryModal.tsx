// src/components/Modals/CategoryModal.tsx
import React, { useState } from 'react';
import { useSystemStore } from '../../store/useSystemStore';
import { X, Trash2 } from 'lucide-react';

export const CategoryModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { categories, addCategory, updateCategory, removeCategory } = useSystemStore();
  const [newLabel, setNewLabel] = useState('');
  const [newWeight, setNewWeight] = useState(50);
  const [newColor, setNewColor] = useState('#e2e8f0');

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center">
      <div className="bg-white w-96 rounded-lg shadow-xl p-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-700">類別與顏色管理</h3>
          <button onClick={onClose}><X size={18}/></button>
        </div>
        
        <div className="bg-slate-50 p-3 rounded mb-4 border border-slate-200">
          <input className="w-full border p-1 text-sm mb-2 rounded" placeholder="類別名稱" value={newLabel} onChange={e=>setNewLabel(e.target.value)} />
          <div className="flex gap-2 mb-2">
            <input type="number" className="w-20 border p-1 text-sm rounded" placeholder="權重" value={newWeight} onChange={e=>setNewWeight(Number(e.target.value))} />
            <div className="flex-1 flex items-center gap-2">
               <input type="color" className="w-8 h-8 p-0 border rounded cursor-pointer" value={newColor} onChange={e=>setNewColor(e.target.value)}/>
               <span className="text-xs text-slate-500">顏色</span>
            </div>
          </div>
          <button 
            onClick={() => { if(newLabel) { addCategory(newLabel, newWeight, newColor, '#ffffff'); setNewLabel(''); }}}
            className="w-full bg-blue-600 text-white text-xs py-1.5 rounded"
          >
            新增類別
          </button>
        </div>

        <div className="space-y-2">
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center gap-2 border-b pb-2">
              <input type="color" className="w-6 h-6 rounded overflow-hidden border-0 cursor-pointer" value={cat.color} onChange={(e) => updateCategory(cat.id, { color: e.target.value })} title="顏色" />
              <div className="flex-1">
                <input className="w-full text-sm font-bold bg-transparent outline-none" value={cat.label} onChange={(e) => updateCategory(cat.id, { label: e.target.value })} />
                <div className="text-[10px] text-slate-400">權重: {cat.weight}</div>
              </div>
              <button onClick={() => removeCategory(cat.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};