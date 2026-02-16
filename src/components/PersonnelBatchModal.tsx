// src/components/PersonnelBatchModal.tsx
import React, { useState } from 'react';
import { usePersonnelStore, type Person } from '../store/usePersonnelStore';
import { CATEGORY_PRESETS } from '../utils/constants';
import { X, Save, Trash2 } from 'lucide-react';

export const PersonnelBatchModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { personnel, updatePersonnelList } = usePersonnelStore();
  const [localList, setLocalList] = useState<Person[]>(JSON.parse(JSON.stringify(personnel)));

  const handleChange = (id: string, field: keyof Person, value: any) => {
    setLocalList(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleCategoryChange = (id: string, catLabel: string) => {
    const preset = CATEGORY_PRESETS.find(c => c.label === catLabel);
    setLocalList(prev => prev.map(p => p.id === id ? { 
        ...p, 
        category: catLabel,
        rankScore: preset ? preset.weight : p.rankScore 
    } : p));
  };

  const handleSave = () => {
    updatePersonnelList(localList);
    onClose();
  };

  const handleDelete = (id: string) => {
      setLocalList(prev => prev.filter(p => p.id !== id));
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center">
      <div className="bg-white w-[90vw] h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
          <h2 className="font-bold text-xl text-slate-700">人員批次編輯 (Excel 模式)</h2>
          <div className="flex gap-2">
            <button onClick={handleSave} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              <Save size={18}/> 儲存變更
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded text-slate-500"><X size={20}/></button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-4">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-2 border text-left">姓名</th>
                <th className="p-2 border text-left">職稱</th>
                <th className="p-2 border text-left">單位</th>
                <th className="p-2 border text-left w-48">類別 (自動帶入權重)</th>
                <th className="p-2 border text-center w-24">權重</th>
                <th className="p-2 border text-center w-16">刪除</th>
              </tr>
            </thead>
            <tbody>
              {localList.map(p => (
                <tr key={p.id} className="hover:bg-blue-50">
                  <td className="border p-1"><input value={p.name} onChange={e => handleChange(p.id, 'name', e.target.value)} className="w-full px-2 py-1 outline-none bg-transparent"/></td>
                  <td className="border p-1"><input value={p.title} onChange={e => handleChange(p.id, 'title', e.target.value)} className="w-full px-2 py-1 outline-none bg-transparent"/></td>
                  <td className="border p-1"><input value={p.organization} onChange={e => handleChange(p.id, 'organization', e.target.value)} className="w-full px-2 py-1 outline-none bg-transparent"/></td>
                  <td className="border p-1">
                    <select value={p.category} onChange={e => handleCategoryChange(p.id, e.target.value)} className="w-full px-2 py-1 bg-transparent outline-none">
                       {CATEGORY_PRESETS.map(c => <option key={c.label} value={c.label}>{c.label}</option>)}
                       <option value="其他">其他 (自訂)</option>
                    </select>
                  </td>
                  <td className="border p-1"><input type="number" value={p.rankScore} onChange={e => handleChange(p.id, 'rankScore', Number(e.target.value))} className="w-full text-center outline-none bg-transparent"/></td>
                  <td className="border p-1 text-center">
                      <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};