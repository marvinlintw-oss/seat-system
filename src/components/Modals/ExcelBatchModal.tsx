// src/components/Modals/ExcelBatchModal.tsx
import React, { useState } from 'react';
import { usePersonnelStore } from '../../store/usePersonnelStore';
import { useSystemStore } from '../../store/useSystemStore';
import { X, Save, Trash2, Plus } from 'lucide-react';
import type { Person } from '../../types';

export const ExcelBatchModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { personnel, updatePersonnelList } = usePersonnelStore();
  const { categories } = useSystemStore(); // 【修正】改用系統動態類別，確保一致性
  
  const [localList, setLocalList] = useState<Person[]>(JSON.parse(JSON.stringify(personnel)));

  const handleChange = (id: string, field: keyof Person, value: any) => {
    setLocalList(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleCategoryChange = (id: string, catLabel: string) => {
    const preset = categories.find(c => c.label === catLabel);
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
  };

  const handleAddRow = () => {
    const defaultCat = categories[0];
    const newPerson: Person = {
      id: `excel-new-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: '',
      title: '',
      organization: '',
      category: defaultCat?.label || '其他',
      rankScore: defaultCat?.weight || 50,
      isSeated: false
    };
    setLocalList(prev => [...prev, newPerson]);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center">
      <div className="bg-white w-[90vw] h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
          <h2 className="font-bold text-xl text-slate-700">人員批次編輯 (試算表模式)</h2>
          <div className="flex gap-2">
            <button onClick={handleSave} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 shadow-sm">
              <Save size={18}/> 儲存變更
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded text-slate-500 transition"><X size={20}/></button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-4 custom-scrollbar">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-2 border text-left font-bold text-slate-600">姓名</th>
                <th className="p-2 border text-left font-bold text-slate-600">職稱</th>
                <th className="p-2 border text-left font-bold text-slate-600">單位</th>
                <th className="p-2 border text-left font-bold text-slate-600 w-48">類別 (自動帶入權重)</th>
                <th className="p-2 border text-center font-bold text-slate-600 w-24">權重</th>
                <th className="p-2 border text-center font-bold text-slate-600 w-16">刪除</th>
              </tr>
            </thead>
            <tbody>
              {localList.map(p => {
                // 檢查這個人的類別是不是在系統的合法名單中
                const isValidCategory = categories.some(c => c.label === p.category);
                
                return (
                <tr key={p.id} className="hover:bg-blue-50 transition-colors">
                  <td className="border p-1"><input value={p.name} onChange={e => handleChange(p.id, 'name', e.target.value)} className="w-full px-2 py-1 outline-none bg-transparent font-medium text-slate-800" placeholder="輸入姓名"/></td>
                  <td className="border p-1"><input value={p.title} onChange={e => handleChange(p.id, 'title', e.target.value)} className="w-full px-2 py-1 outline-none bg-transparent text-slate-600" placeholder="輸入職稱"/></td>
                  <td className="border p-1"><input value={p.organization} onChange={e => handleChange(p.id, 'organization', e.target.value)} className="w-full px-2 py-1 outline-none bg-transparent text-slate-600" placeholder="輸入單位"/></td>
                  <td className="border p-1 bg-white">
                    {/* 【修正】完美對接動態類別，若為無效的舊資料會強烈提示 */}
                    <select 
                      value={isValidCategory ? p.category : (p.category || '')} 
                      onChange={e => handleCategoryChange(p.id, e.target.value)} 
                      className={`w-full px-2 py-1 outline-none cursor-pointer ${!isValidCategory ? 'text-red-500 font-bold bg-red-50' : 'bg-transparent text-slate-700'}`}
                    >
                       {categories.map(c => <option key={c.id} value={c.label}>{c.label}</option>)}
                       
                       {/* 防呆提示：若舊存檔裡的字串沒有匹配到任何系統分類，就把它掛出來讓您看見 */}
                       {!isValidCategory && p.category && (
                           <option value={p.category}>{p.category} (未定義/舊資料)</option>
                       )}
                       {!p.category && <option value="">請選擇類別...</option>}
                    </select>
                  </td>
                  <td className="border p-1"><input type="number" value={p.rankScore} onChange={e => handleChange(p.id, 'rankScore', Number(e.target.value))} className="w-full text-center outline-none bg-transparent font-mono text-blue-600 font-bold"/></td>
                  <td className="border p-1 text-center">
                      <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={16}/></button>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>

          <button 
             onClick={handleAddRow} 
             className="mt-4 w-full py-3 border-2 border-dashed border-slate-300 text-slate-500 rounded-lg hover:bg-slate-50 hover:border-blue-400 hover:text-blue-500 transition flex justify-center items-center gap-2 font-bold"
          >
            <Plus size={18} /> 新增單筆人員資料
          </button>
        </div>
      </div>
    </div>
  );
};