// src/components/Modals/VersionDiffModal.tsx
import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useProjectStore } from '../../store/useProjectStore';
import { X, UploadCloud, FileSearch, Download, AlertCircle } from 'lucide-react';
// 【修復】這裡加上了 type 關鍵字，解決 ts(1484) 報錯
import { calculateVersionDiff, type DiffRecord } from '../../utils/diffEngine';

interface Props { isOpen: boolean; onClose: () => void; }

export const VersionDiffModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { projectName, activeSessionId, sessions } = useProjectStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [diffResults, setDiffResults] = useState<DiffRecord[] | null>(null);
  const [baselineName, setBaselineName] = useState<string>('');

  if (!isOpen) return null;

  const activeSession = sessions.find(s => s.id === activeSessionId);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setBaselineName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const oldData = JSON.parse(e.target?.result as string);
        const currentData = useProjectStore.getState();
        
        const results = calculateVersionDiff(oldData, currentData, activeSessionId);
        setDiffResults(results);
      } catch (error) {
        alert('無法解析該備份檔，請確認檔案格式是否正確！');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleExportCSV = () => {
    if (!diffResults) return;
    const BOM = '\uFEFF'; 
    let csvContent = BOM + '變動類型,人員/標的,單位/座位,原本狀態,最新狀態,詳細說明\n';
    
    const typeMap: Record<string, string> = {
      removed: '🔴 取消出席', added: '🟢 新增入座', 
      seat_changed: '🟡 座位異動', seat_replaced: '🔵 座位替換', photo_changed: '🟣 拍照異動'
    };

    diffResults.forEach(item => {
      csvContent += `"${typeMap[item.type]}","${item.personName}","${item.personOrg}","${item.originalLocation}","${item.newLocation}","${item.description}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectName}_${activeSession?.name}_版本差異提報表.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderBadge = (type: string) => {
    switch (type) {
      case 'removed': return <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold border border-red-200">🔴 取消出席</span>;
      case 'added': return <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold border border-emerald-200">🟢 新增入座</span>;
      case 'seat_changed': return <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-bold border border-amber-200">🟡 座位異動</span>;
      case 'seat_replaced': return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold border border-blue-200">🔵 座位替換</span>;
      case 'photo_changed': return <span className="bg-fuchsia-100 text-fuchsia-700 px-2 py-1 rounded text-xs font-bold border border-fuchsia-200">🟣 拍照異動</span>;
      default: return null;
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <div className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col h-[85vh] overflow-hidden">
        
        <div className="p-4 border-b flex justify-between items-center bg-white shrink-0">
          <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <FileSearch size={20} className="text-indigo-600"/> 
            版本差異比對引擎 <span className="text-sm font-normal text-slate-500 ml-2">({activeSession?.name})</span>
          </h2>
          <div className="flex items-center gap-3">
            {diffResults && (
              <button onClick={handleExportCSV} className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-1.5 text-sm font-bold rounded-lg hover:bg-emerald-700 shadow-sm transition">
                 <Download size={16}/> 匯出 CSV 提報表
              </button>
            )}
            <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-full text-slate-500 transition"><X size={20}/></button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6 flex flex-col gap-4">
            
            <div className="bg-white border border-indigo-100 rounded-xl p-6 shadow-sm flex items-center justify-between shrink-0">
                <div>
                    <h3 className="font-bold text-indigo-900 text-lg mb-1">上傳舊版備份檔作為基準</h3>
                    <p className="text-sm text-slate-500">系統將比對「目前畫面上的資料」與「上傳的舊檔」，自動抓出所有異動。</p>
                </div>
                <input type="file" accept=".seatproject,.json" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                <button 
                    onClick={() => fileInputRef.current?.click()} 
                    className="flex items-center gap-2 bg-indigo-50 text-indigo-700 border border-indigo-200 px-6 py-3 rounded-xl font-bold hover:bg-indigo-100 transition shadow-sm"
                >
                    <UploadCloud size={20}/> {baselineName ? `已載入基準：${baselineName}` : '選擇 .seatproject 備份檔'}
                </button>
            </div>

            {diffResults && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col">
                    <div className="p-3 bg-slate-100 border-b border-slate-200 flex justify-between items-center shrink-0">
                        <span className="font-bold text-slate-700">共偵測到 {diffResults.length} 筆異動</span>
                        {diffResults.length === 0 && <span className="text-sm text-slate-500 flex items-center gap-1"><AlertCircle size={14}/> 兩版本完全一致</span>}
                    </div>
                    
                    <div className="overflow-auto custom-scrollbar flex-1">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-4 py-3 font-bold text-slate-600 border-b">變動類型</th>
                                    <th className="px-4 py-3 font-bold text-slate-600 border-b">人員/標的</th>
                                    <th className="px-4 py-3 font-bold text-slate-600 border-b">單位/座位</th>
                                    <th className="px-4 py-3 font-bold text-slate-600 border-b w-1/4">原本狀態 (舊檔)</th>
                                    <th className="px-4 py-3 font-bold text-slate-600 border-b w-1/4">最新狀態 (目前)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {diffResults.map((diff, idx) => (
                                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="px-4 py-3">{renderBadge(diff.type)}</td>
                                        <td className="px-4 py-3 font-bold text-slate-800">{diff.personName}</td>
                                        <td className="px-4 py-3 text-slate-500">{diff.personOrg}</td>
                                        <td className="px-4 py-3 font-mono text-slate-500 bg-slate-50/50">{diff.originalLocation}</td>
                                        <td className="px-4 py-3 font-mono text-indigo-700 font-bold bg-indigo-50/30">{diff.newLocation}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>,
    document.body
  );
};