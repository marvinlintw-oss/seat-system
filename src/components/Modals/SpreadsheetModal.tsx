// src/components/Modals/SpreadsheetModal.tsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; // 【新增】引入 createPortal
import { usePersonnelStore } from '../../store/usePersonnelStore';
import { useProjectStore } from '../../store/useProjectStore';
import { X, Save, Trash2, Plus, Table, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { Person } from '../../types';

interface Props { isOpen: boolean; onClose: () => void; }

type SortConfig = { key: keyof Person | 'categoryWeight'; direction: 'asc' | 'desc'; } | null;

export const SpreadsheetModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { personnel, categories, sessions } = useProjectStore();
  const { updatePersonnelList } = usePersonnelStore();
  
  const [localList, setLocalList] = useState<Person[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  useEffect(() => {
    if (isOpen) {
        const sortedList = [...personnel].sort((a, b) => {
            const wA = categories.find(c => c.label === a.category)?.weight || 0;
            const wB = categories.find(c => c.label === b.category)?.weight || 0;
            if (wA !== wB) return wB - wA; 
            return b.rankScore - a.rankScore;
        });
        setLocalList(JSON.parse(JSON.stringify(sortedList)));
        setSortConfig(null);
    }
  }, [isOpen, personnel, categories]);

  if (!isOpen) return null;

  const handleChange = (id: string, field: keyof Person, value: any) => {
    setLocalList(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleCategoryChange = (id: string, catLabel: string) => {
    const preset = categories.find(c => c.label === catLabel);
    setLocalList(prev => prev.map(p => p.id === id ? { 
        ...p, category: catLabel, rankScore: preset ? preset.weight : p.rankScore 
    } : p));
  };

  const handleToggleSessionForAll = (sessionId: string, isChecked: boolean) => {
    setLocalList(prev => prev.map(p => {
      let currentIds = p.attendingSessionIds ? [...p.attendingSessionIds] : sessions.map(ss => ss.id);
      if (isChecked) { if (!currentIds.includes(sessionId)) currentIds.push(sessionId); } 
      else { currentIds = currentIds.filter(id => id !== sessionId); }
      return { ...p, attendingSessionIds: currentIds };
    }));
  };

  const handleSave = () => { updatePersonnelList(localList); onClose(); };

  // 【優化】新增資料插入在第一筆 (最上方)
  const handleAddRow = () => {
    const defaultCat = categories[0];
    const generateUUID = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ext-${Date.now()}`;
    const newPerson: Person = {
      id: `person-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      externalId: generateUUID(),
      serialNumber: '', remarks: '', name: '', title: '', organization: '',
      category: defaultCat?.label || '一般貴賓', rankScore: defaultCat?.weight || 50,
      isSeated: false, attendingSessionIds: sessions.map(s => s.id)
    };
    setLocalList(prev => [newPerson, ...prev]); 
  };

  const handleSort = (key: keyof Person | 'categoryWeight') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });

    setLocalList(prevList => {
      const newList = [...prevList];
      newList.sort((a, b) => {
        let valA: any = key === 'categoryWeight' ? (categories.find(c => c.label === a.category)?.weight || 0) : a[key];
        let valB: any = key === 'categoryWeight' ? (categories.find(c => c.label === b.category)?.weight || 0) : b[key];
        
        if (!valA) valA = ''; if (!valB) valB = '';
        if (typeof valA === 'string' && typeof valB === 'string') {
          return direction === 'asc' ? valA.localeCompare(valB, 'zh-TW') : valB.localeCompare(valA, 'zh-TW');
        }
        if (typeof valA === 'number' && typeof valB === 'number') {
          return direction === 'asc' ? valA - valB : valB - valA;
        }
        return 0;
      });
      return newList;
    });
  };

  const renderSortIcon = (key: keyof Person | 'categoryWeight') => {
    if (sortConfig?.key !== key) return <ArrowUpDown size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"/>;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-blue-600"/> : <ArrowDown size={14} className="text-blue-600"/>;
  };

  const allSessionIds = sessions.map(s => s.id);

  // 【關鍵】使用 createPortal 掛載到 document.body，且 z-index 設為 z-[100] 徹底防蓋版
  return createPortal(
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-[95vw] flex flex-col h-[90vh]">
        
        <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0">
          <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
             <Table size={20} className="text-green-600"/> 總名單編輯 (矩陣編輯與排序模式)
          </h2>
          <div className="flex gap-3">
            {/* 【優化】把新增按鈕移到最上方 */}
            <button onClick={handleAddRow} className="flex items-center gap-2 bg-white border border-slate-300 text-slate-600 px-4 py-2 text-sm font-bold rounded-lg hover:bg-slate-100 transition shadow-sm">
              <Plus size={16}/> 插入新資料 (至最上方)
            </button>
            <button onClick={handleSave} className="flex items-center gap-2 bg-green-600 text-white px-5 py-2 text-sm font-bold rounded-lg hover:bg-green-700 shadow-sm transition">
              <Save size={16}/> 儲存變更
            </button>
            <div className="w-px bg-slate-300 mx-1"></div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition"><X size={20}/></button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto custom-scrollbar bg-slate-50/50 relative">
          <table className="w-full border-collapse text-sm bg-white min-w-max">
            <thead className="sticky top-0 z-30 shadow-sm">
              <tr className="bg-slate-200 text-slate-700">
                <th className="p-0 text-left font-bold border-b border-r border-slate-300 w-24 cursor-pointer group hover:bg-slate-300 transition-colors" onClick={() => handleSort('serialNumber')}>
                  <div className="px-3 py-3 flex items-center justify-between">序號 {renderSortIcon('serialNumber')}</div>
                </th>
                <th className="p-0 text-left font-bold sticky left-0 z-40 bg-slate-200 border-b border-r border-slate-300 w-32 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] cursor-pointer group hover:bg-slate-300 transition-colors" onClick={() => handleSort('name')}>
                  <div className="px-3 py-3 flex items-center justify-between">姓名 {renderSortIcon('name')}</div>
                </th>
                <th className="p-0 text-left font-bold border-b border-slate-300 w-32 cursor-pointer group hover:bg-slate-300 transition-colors" onClick={() => handleSort('title')}>
                  <div className="px-3 py-3 flex items-center justify-between">職稱 {renderSortIcon('title')}</div>
                </th>
                <th className="p-0 text-left font-bold border-b border-slate-300 w-48 cursor-pointer group hover:bg-slate-300 transition-colors" onClick={() => handleSort('organization')}>
                  <div className="px-3 py-3 flex items-center justify-between">單位 {renderSortIcon('organization')}</div>
                </th>
                <th className="p-0 text-left font-bold border-b border-slate-300 w-36 cursor-pointer group hover:bg-slate-300 transition-colors" onClick={() => handleSort('categoryWeight')}>
                  <div className="px-3 py-3 flex items-center justify-between">類別 {renderSortIcon('categoryWeight')}</div>
                </th>
                
                {sessions.map(s => {
                  const isAllAttending = localList.length > 0 && localList.every(p => {
                    const ids = p.attendingSessionIds || allSessionIds;
                    return ids.includes(s.id);
                  });
                  return (
                    <th key={s.id} className="p-2 text-center font-bold border-b border-l border-slate-300 min-w-[100px] max-w-[140px] bg-blue-50/80">
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="text-xs truncate w-full px-1 text-blue-800" title={s.name}>{s.name}</span>
                        <label className="flex items-center justify-center gap-1 text-[10px] cursor-pointer text-blue-600 hover:text-blue-800 bg-white px-2 py-1 rounded border border-blue-200 shadow-sm w-full transition hover:bg-blue-50">
                          <input type="checkbox" checked={isAllAttending} onChange={(e) => handleToggleSessionForAll(s.id, e.target.checked)} className="cursor-pointer accent-blue-600 w-3.5 h-3.5"/>
                          <span className="font-bold">全選</span>
                        </label>
                      </div>
                    </th>
                  );
                })}
                
                <th className="p-0 text-center font-bold border-b border-l border-slate-300 w-20 cursor-pointer group hover:bg-slate-300 transition-colors" onClick={() => handleSort('rankScore')}>
                  <div className="px-3 py-3 flex items-center justify-center gap-1">權重 {renderSortIcon('rankScore')}</div>
                </th>
                <th className="p-0 text-left font-bold border-b border-l border-slate-300 w-48 cursor-pointer group hover:bg-slate-300 transition-colors" onClick={() => handleSort('remarks')}>
                  <div className="px-3 py-3 flex items-center justify-between">備註 {renderSortIcon('remarks')}</div>
                </th>
                <th className="p-3 text-center font-bold border-b border-l border-slate-300 w-16">刪除</th>
              </tr>
            </thead>
            
            <tbody>
              {localList.map(p => {
                const isValidCategory = categories.some(c => c.label === p.category);
                return (
                <tr key={p.id} className="hover:bg-blue-50 transition-colors border-b border-slate-200 group">
                  <td className="p-0 bg-white border-r border-slate-200 group-hover:bg-blue-50 transition-colors">
                    <input value={p.serialNumber || ''} onChange={e => handleChange(p.id, 'serialNumber', e.target.value)} className="w-full px-3 py-2.5 outline-none bg-transparent font-mono text-slate-600 focus:ring-2 focus:ring-blue-200" placeholder="對外序號"/>
                  </td>
                  <td className="p-0 sticky left-0 z-20 bg-white border-r border-slate-200 group-hover:bg-blue-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] transition-colors">
                    <input value={p.name} onChange={e => handleChange(p.id, 'name', e.target.value)} className="w-full px-3 py-2.5 outline-none bg-transparent font-bold text-slate-800 focus:ring-2 focus:ring-blue-200" placeholder="姓名"/>
                  </td>
                  <td className="p-0"><input value={p.title} onChange={e => handleChange(p.id, 'title', e.target.value)} className="w-full px-3 py-2.5 outline-none bg-transparent text-slate-600 focus:ring-2 focus:ring-blue-100" placeholder="職稱"/></td>
                  <td className="p-0"><input value={p.organization} onChange={e => handleChange(p.id, 'organization', e.target.value)} className="w-full px-3 py-2.5 outline-none bg-transparent text-slate-600 focus:ring-2 focus:ring-blue-100" placeholder="單位"/></td>
                  <td className="p-1">
                    <select value={isValidCategory ? p.category : (p.category || '')} onChange={e => handleCategoryChange(p.id, e.target.value)} className={`w-full px-2 py-1.5 outline-none cursor-pointer rounded border border-transparent focus:border-blue-300 ${!isValidCategory ? 'text-red-500 font-bold bg-red-50' : 'bg-transparent text-slate-700 hover:bg-slate-100'}`}>
                       {categories.map(c => <option key={c.id} value={c.label}>{c.label}</option>)}
                       {!isValidCategory && p.category && <option value={p.category}>{p.category} (未定義)</option>}
                    </select>
                  </td>
                  
                  {sessions.map(s => {
                    const isAttending = p.attendingSessionIds ? p.attendingSessionIds.includes(s.id) : true;
                    return (
                      <td key={s.id} className="p-0 text-center border-l border-slate-200 bg-slate-50/30 group-hover:bg-transparent transition-colors">
                        <label className="flex items-center justify-center w-full h-full cursor-pointer py-3 hover:bg-blue-100/50">
                          <input type="checkbox" checked={isAttending}
                            onChange={(e) => {
                               let newIds = p.attendingSessionIds ? [...p.attendingSessionIds] : [...allSessionIds];
                               if (e.target.checked) { if (!newIds.includes(s.id)) newIds.push(s.id); } 
                               else { newIds = newIds.filter(id => id !== s.id); }
                               handleChange(p.id, 'attendingSessionIds', newIds);
                            }}
                            className="w-4 h-4 cursor-pointer accent-blue-600 rounded"
                          />
                        </label>
                      </td>
                    )
                  })}

                  <td className="p-0 border-l border-slate-200"><input type="number" value={p.rankScore} onChange={e => handleChange(p.id, 'rankScore', Number(e.target.value))} className="w-full text-center outline-none bg-transparent font-mono text-blue-600 font-bold focus:ring-2 focus:ring-blue-100 py-2.5"/></td>
                  <td className="p-0 border-l border-slate-200">
                    <input value={p.remarks || ''} onChange={e => handleChange(p.id, 'remarks', e.target.value)} className="w-full px-3 py-2.5 outline-none bg-transparent text-amber-600 focus:ring-2 focus:ring-amber-200" placeholder="例如：行動不便、吃素..."/>
                  </td>
                  <td className="p-0 border-l border-slate-200 text-center">
                      <button onClick={() => setLocalList(prev => prev.filter(item => item.id !== p.id))} className="text-slate-300 hover:text-red-500 hover:bg-red-50 w-full h-full py-2.5 transition-colors flex justify-center items-center"><Trash2 size={16}/></button>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>
    </div>,
    document.body
  );
};