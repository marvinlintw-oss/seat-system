// src/components/Modals/ExcelBatchModal.tsx
import React, { useState } from 'react';
import { usePersonnelStore } from '../../store/usePersonnelStore';
import { useProjectStore } from '../../store/useProjectStore';
import { X, Upload, ArrowRight, Check } from 'lucide-react';
import type { Person } from '../../types';

interface Props { isOpen: boolean; onClose: () => void; }

const parseBoolean = (val: string) => {
  if (!val) return false;
  return /^(1|true|y|yes|v|是|t|on)$/i.test(val.trim());
};

export const ExcelBatchModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { updatePersonnelList } = usePersonnelStore();
  const { sessions, personnel } = useProjectStore(); 
  
  const [step, setStep] = useState<1 | 2>(1);
  const [pastedText, setPastedText] = useState('');
  const [parsedRows, setParsedRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<number, string>>({});

  if (!isOpen) return null;

  const handleNext = () => {
    if (!pastedText.trim()) return;
    const lines = pastedText.split('\n').filter(line => line.trim());
    const rows = lines.map(line => line.split('\t').map(c => c.trim()));
    setParsedRows(rows);
    
    const headers = rows[0];
    const initialMapping: Record<number, string> = {};
    headers.forEach((h, i) => {
        if (h.includes('姓名') || h.toLowerCase().includes('name')) initialMapping[i] = 'name';
        else if (h.includes('職稱') || h.toLowerCase().includes('title')) initialMapping[i] = 'title';
        else if (h.includes('單位') || h.includes('組織')) initialMapping[i] = 'organization';
        else if (h.includes('類別') || h.includes('組別')) initialMapping[i] = 'category';
        else if (h.includes('權重') || h.includes('分數')) initialMapping[i] = 'rankScore';
        else if (h.includes('序號') || h.toLowerCase().includes('sn')) initialMapping[i] = 'serialNumber'; 
        else if (h.includes('備註')) initialMapping[i] = 'remarks';               
        else {
            const sessionMatch = sessions.find(s => h.includes(s.name));
            if (sessionMatch) initialMapping[i] = `session_${sessionMatch.id}`;
            else initialMapping[i] = 'ignore';
        }
    });
    setColumnMapping(initialMapping);
    setStep(2);
  };

  const handleImport = () => {
    const dataRows = parsedRows.slice(1);
    let importCount = 0;

    const newPeople: Person[] = [...personnel];
    const generateUUID = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ext-${Date.now()}`;

    dataRows.forEach(cols => {
        const personData: any = {
           id: `person-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
           externalId: generateUUID(),
           name: '', title: '', organization: '', category: '一般貴賓', rankScore: 50,
           serialNumber: '', remarks: '', 
           photoData: {}, // 初始化空字典
           isSeated: false, attendingSessionIds: []
        };

        cols.forEach((val, i) => {
            const mapKey = columnMapping[i];
            if (!mapKey || mapKey === 'ignore') return;
            if (mapKey === 'rankScore') personData.rankScore = parseInt(val, 10) || 50;
            else if (mapKey.startsWith('session_')) {
                const sessionId = mapKey.replace('session_', '');
                if (parseBoolean(val)) personData.attendingSessionIds.push(sessionId);
            } 
            else personData[mapKey] = val;
        });

        if (personData.name) {
            newPeople.push(personData);
            importCount++;
        }
    });

    updatePersonnelList(newPeople);
    alert(`成功匯入 ${importCount} 筆名單！`);
    setPastedText(''); setStep(1); onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b border-slate-200">
          <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
            <Upload size={20} className="text-blue-600"/> 
            {step === 1 ? '步驟 1：貼上 Excel 內容' : '步驟 2：欄位映射確認'}
          </h2>
          <button onClick={() => { setStep(1); setPastedText(''); onClose(); }} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition"><X size={20}/></button>
        </div>
        
        <div className="p-4 flex-1 overflow-auto custom-scrollbar bg-slate-50">
          {step === 1 ? (
             <textarea
                value={pastedText} onChange={(e) => setPastedText(e.target.value)}
                placeholder="在此貼上包含表頭的 Excel 資料 (Ctrl+V)..."
                className="w-full h-full min-h-[300px] border border-slate-300 rounded-lg p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 whitespace-pre transition"
             ></textarea>
          ) : (
             <div className="overflow-x-auto">
                 <table className="w-full text-sm bg-white border border-slate-200 rounded">
                    <thead>
                        <tr className="bg-slate-100 border-b border-slate-200">
                            {parsedRows[0].map((h, i) => (
                                <th key={i} className="p-2 border-r border-slate-200 min-w-[120px]">
                                    <div className="text-xs text-slate-500 mb-1 font-normal">Excel 表頭: {h}</div>
                                    <select 
                                      value={columnMapping[i] || 'ignore'} 
                                      onChange={(e) => setColumnMapping(prev => ({...prev, [i]: e.target.value}))}
                                      className="w-full border border-slate-300 rounded p-1 font-bold text-blue-700 outline-none"
                                    >
                                        <option value="ignore">-- 忽略不匯入 --</option>
                                        <option value="serialNumber">序號 (SN)</option>
                                        <option value="name">姓名 (Name)</option>
                                        <option value="title">職稱 (Title)</option>
                                        <option value="organization">單位 (Org)</option>
                                        <option value="category">類別 (Category)</option>
                                        <option value="rankScore">權重分數 (0-100)</option>
                                        <option value="remarks">備註 (Remarks)</option>
                                        {sessions.map(s => <option key={s.id} value={`session_${s.id}`}>出席: {s.name}</option>)}
                                    </select>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {parsedRows.slice(1, 6).map((row, ri) => (
                            <tr key={ri} className="border-b border-slate-100">
                                {row.map((cell, ci) => <td key={ci} className="p-2 border-r border-slate-100 text-slate-600 truncate max-w-[150px]">{cell}</td>)}
                            </tr>
                        ))}
                    </tbody>
                 </table>
             </div>
          )}
        </div>
        
        <div className="p-4 border-t border-slate-200 flex justify-end gap-2 bg-white rounded-b-xl">
          {step === 1 ? (
             <button onClick={handleNext} disabled={!pastedText.trim()} className="px-6 py-2 font-bold bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700 rounded-lg transition flex items-center gap-1 shadow-sm">
                下一步：對應欄位 <ArrowRight size={16}/>
             </button>
          ) : (
             <>
               <button onClick={() => setStep(1)} className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition">上一步</button>
               <button onClick={handleImport} className="px-6 py-2 font-bold bg-green-600 text-white hover:bg-green-700 rounded-lg transition flex items-center gap-1 shadow-sm">
                  <Check size={16}/> 確認匯入名單
               </button>
             </>
          )}
        </div>
      </div>
    </div>
  );
};