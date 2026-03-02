// src/components/Sidebar/PersonnelPanel.tsx
import React, { useState, useRef, useEffect } from 'react';
import { usePersonnelStore } from '../../store/usePersonnelStore';
import { useSystemStore } from '../../store/useSystemStore';
import { User, Plus, Upload, Download, Table, Palette, X, FileText } from 'lucide-react';
import { parseCsvFile, downloadCsvTemplate } from '../../utils/csvManager';

import { AutoArrange } from './AutoArrange';
import { ManualAssign } from './ManualAssign';
import { CategoryModal } from '../Modals/CategoryModal';
import { ExcelBatchModal } from '../Modals/ExcelBatchModal'; 
import { ReportModal } from '../Modals/ReportModal'; // 引入報表

export const PersonnelPanel: React.FC = () => {
  const { addNewPerson } = usePersonnelStore();
  const { categories, getCategoryByLabel } = useSystemStore();

  const csvInputRef = useRef<HTMLInputElement>(null);
  
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const [newName, setNewName] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newOrg, setNewOrg] = useState('');
  const [newCategory, setNewCategory] = useState(categories[0]?.label || '');
  const [currentRank, setCurrentRank] = useState(categories[0]?.weight || 50);

  useEffect(() => {
    const cat = getCategoryByLabel(newCategory);
    if (cat) setCurrentRank(cat.weight);
  }, [newCategory, getCategoryByLabel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName && newTitle) {
      addNewPerson(newName, newTitle, newOrg || '未指定', newCategory, currentRank);
      setNewName(''); setNewTitle(''); setNewOrg(''); setIsAdding(false);
    }
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rows = await parseCsvFile(file);
      let count = 0;
      rows.forEach((row: any) => {
        const name = row['Name'] || row['姓名'] || row['範例姓名'];
        const title = row['Title'] || row['職稱'] || row['範例職稱'] || '貴賓';
        const org = row['Org'] || row['單位'] || row['範例單位'] || '';
        const rank = parseInt(row['Rank'] || row['權重'] || row['權重分數'] || row['範例權重']) || 50;
        const category = row['Category'] || row['類別'] || row['範例類別'] || '匯入';
        
        if (name) { 
          addNewPerson(name, title, org, category, rank); 
          count++; 
        }
      });
      alert(`成功匯入 ${count} 筆資料！`);
    } catch (err: any) { alert(err.message); }

    if (csvInputRef.current) csvInputRef.current.value = '';
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden animate-in slide-in-from-top-2 duration-300">
      <input type="file" ref={csvInputRef} onChange={handleCSVUpload} className="hidden" accept=".csv" />

      <AutoArrange />

      <div className="p-4 border-b border-slate-200 bg-white shrink-0">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <User className="text-blue-600" size={20}/> 人員名單
          </h2>
          <div className="flex gap-1">
            <button onClick={() => csvInputRef.current?.click()} className="text-slate-500 hover:text-green-600 p-1" title="匯入 CSV"><Upload size={18}/></button>
            <button onClick={downloadCsvTemplate} className="text-slate-500 hover:text-blue-600 p-1" title="下載 CSV 範本"><Download size={18}/></button>
          </div>
        </div>

        {/* 2.1 & 2.2 更新 UI 按鈕 */}
        <div className="flex gap-2 mb-2">
          <button onClick={() => setShowExcelModal(true)} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-1.5 rounded text-xs flex justify-center items-center gap-1 shadow-sm">
            <Table size={14}/> 試算表編輯模式
          </button>
          <button onClick={() => setShowReportModal(true)} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-1.5 rounded text-xs flex justify-center items-center gap-1 shadow-sm">
            <FileText size={14}/> 報表列印
          </button>
          <button onClick={() => setShowCategoryModal(true)} className="flex-none bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded text-xs flex justify-center items-center gap-1 border border-slate-200">
            <Palette size={14}/> 類別
          </button>
        </div>

        {!isAdding ? (
          <button onClick={() => setIsAdding(true)} className="w-full text-xs text-slate-500 hover:text-blue-600 border border-dashed border-slate-300 rounded p-2 hover:bg-blue-50 transition flex items-center justify-center gap-1">
            <Plus size={14} /> 快速新增單筆
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="bg-slate-50 p-2 rounded border border-blue-200 text-xs">
            <div className="flex justify-between mb-2"><span className="font-bold text-blue-600">新增資料</span><button type="button" onClick={() => setIsAdding(false)}><X size={14}/></button></div>
            <input placeholder="姓名" value={newName} onChange={e => setNewName(e.target.value)} className="w-full border rounded px-2 py-1 mb-1" autoFocus />
            <input placeholder="職稱" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full border rounded px-2 py-1 mb-1" />
            <input placeholder="單位" value={newOrg} onChange={e => setNewOrg(e.target.value)} className="w-full border rounded px-2 py-1 mb-1" />
            <select value={newCategory} onChange={e => setNewCategory(e.target.value)} className="w-full border rounded px-2 py-1 mb-2 bg-white">
              {categories.map(c => <option key={c.id} value={c.label}>{c.label}</option>)}
            </select>
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-500">權重: {currentRank}</span>
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-1 rounded">確認</button>
          </form>
        )}
      </div>

      <ManualAssign />

      {showExcelModal && <ExcelBatchModal onClose={() => setShowExcelModal(false)} />}
      {showCategoryModal && <CategoryModal onClose={() => setShowCategoryModal(false)} />}
      {showReportModal && <ReportModal onClose={() => setShowReportModal(false)} />}
    </div>
  );
};