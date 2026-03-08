// src/components/Modals/ReportModal.tsx
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useProjectStore } from '../../store/useProjectStore';
import { X, Printer, ArrowUpDown, ArrowUp, ArrowDown, Download } from 'lucide-react';

interface Props { isOpen: boolean; onClose: () => void; }

type SortKey = 'seatLabel' | 'serialNumber' | 'personName' | 'personTitle' | 'personOrg' | 'category';

export const ReportModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { personnel, sessions, activeSessionId, projectName } = useProjectStore();
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);
  
  if (!isOpen) return null;

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const seats = activeSession?.venue.seats || [];

  const handleSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortConfig?.key !== key) return <ArrowUpDown size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity inline ml-1"/>;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-blue-600 inline ml-1"/> : <ArrowDown size={14} className="text-blue-600 inline ml-1"/>;
  };

  const assignedSeats = seats
    .filter(seat => seat.assignedPersonId)
    .map(seat => {
      const person = personnel.find(p => p.id === seat.assignedPersonId);
      return {
        seatLabel: seat.label,
        serialNumber: person?.serialNumber || '', // 【新增】抓取序號
        personName: person?.name || '未知',
        personTitle: person?.title || '',
        personOrg: person?.organization || '',
        category: person?.category || '',
      };
    })
    .sort((a, b) => {
        if (!sortConfig) {
            const numA = parseInt(a.seatLabel); const numB = parseInt(b.seatLabel);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.seatLabel.localeCompare(b.seatLabel);
        }
        const { key, direction } = sortConfig;
        const valA = a[key]; const valB = b[key];
        
        if (key === 'seatLabel' || key === 'serialNumber') {
            const numA = parseInt(valA); const numB = parseInt(valB);
            if (!isNaN(numA) && !isNaN(numB)) return direction === 'asc' ? numA - numB : numB - numA;
        }
        return direction === 'asc' ? valA.localeCompare(valB, 'zh-TW') : valB.localeCompare(valA, 'zh-TW');
    });

  // 【新增】匯出 CSV 函式
  const handleExportCSV = () => {
      const BOM = '\uFEFF'; // 加入 BOM 確保 Excel 打開不會中文亂碼
      let csvContent = BOM + '座位,序號,姓名,職稱,單位,類別\n';
      
      assignedSeats.forEach(item => {
          // 使用雙引號包覆，避免內部文字含有逗號導致換欄
          const row = [
              `"${item.seatLabel}"`,
              `"${item.serialNumber}"`,
              `"${item.personName}"`,
              `"${item.personTitle}"`,
              `"${item.personOrg}"`,
              `"${item.category}"`
          ].join(',');
          csvContent += row + '\n';
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${projectName}_${activeSession?.name}_座位分配清單.csv`;
      link.click();
      URL.revokeObjectURL(url);
  };

  return createPortal(
    <>
      {/* 【核心修復】專為此 Modal 寫的列印樣式：確保在列印時隱藏背後的畫布，只印出報表 */}
      <style type="text/css">
        {`
          @media print {
            body * { visibility: hidden; }
            #report-print-area, #report-print-area * { visibility: visible; }
            #report-print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 0 !important;
              margin: 0 !important;
            }
          }
        `}
      </style>

      <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-[100] p-4 print:p-0 print:bg-white print:static">
        <div id="report-print-area" className="bg-white w-[950px] max-h-[90vh] rounded-xl shadow-2xl flex flex-col print:shadow-none print:w-full print:max-h-none print:h-auto">
          
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0 print:hidden">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Printer size={20} className="text-amber-500" /> 座位分配清單匯出
            </h2>
            <div className="flex gap-2">
              <button 
                onClick={handleExportCSV}
                className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 text-sm font-bold rounded-lg hover:bg-emerald-700 shadow-sm transition"
              >
                 <Download size={16}/> 匯出 CSV
              </button>
              <button 
                onClick={() => window.print()}
                className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 text-sm font-bold rounded-lg hover:bg-amber-600 shadow-sm transition"
              >
                 <Printer size={16}/> 列印 / 另存 PDF
              </button>
              <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-full text-slate-500 transition"><X size={20}/></button>
            </div>
          </div>

          <div className="p-8 overflow-y-auto custom-scrollbar flex-1 print:p-0 print:overflow-visible">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-slate-900 mb-1">{projectName}</h1>
              <h2 className="text-lg font-bold text-slate-600 mb-2">【 {activeSession?.name} 】座位安排表</h2>
              <p className="text-xs text-slate-400">製表時間：{new Date().toLocaleString()}</p>
            </div>

            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-white print:static z-10">
                <tr className="bg-slate-100 border-y-2 border-slate-300 print:bg-slate-100">
                  <th className="py-2 px-3 text-left w-20 cursor-pointer group hover:bg-slate-200 transition" onClick={() => handleSort('seatLabel')}>
                      座位 {renderSortIcon('seatLabel')}
                  </th>
                  {/* 【新增】序號欄位 */}
                  <th className="py-2 px-3 text-left w-20 cursor-pointer group hover:bg-slate-200 transition" onClick={() => handleSort('serialNumber')}>
                      序號 {renderSortIcon('serialNumber')}
                  </th>
                  <th className="py-2 px-3 text-left w-[20%] cursor-pointer group hover:bg-slate-200 transition" onClick={() => handleSort('personName')}>
                      姓名 {renderSortIcon('personName')}
                  </th>
                  <th className="py-2 px-3 text-left w-1/4 cursor-pointer group hover:bg-slate-200 transition" onClick={() => handleSort('personTitle')}>
                      職稱 {renderSortIcon('personTitle')}
                  </th>
                  <th className="py-2 px-3 text-left cursor-pointer group hover:bg-slate-200 transition" onClick={() => handleSort('personOrg')}>
                      單位 {renderSortIcon('personOrg')}
                  </th>
                  <th className="py-2 px-3 text-left w-28 cursor-pointer group hover:bg-slate-200 transition" onClick={() => handleSort('category')}>
                      類別 {renderSortIcon('category')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {assignedSeats.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50 print:border-slate-300">
                    <td className="py-2 px-3 font-mono font-bold text-blue-800">{item.seatLabel}</td>
                    {/* 【新增】序號資料 */}
                    <td className="py-2 px-3 font-mono text-slate-500">{item.serialNumber}</td>
                    <td className="py-2 px-3 font-bold text-base tracking-wide">{item.personName}</td>
                    <td className="py-2 px-3 text-slate-600">{item.personTitle}</td>
                    <td className="py-2 px-3 text-slate-600">{item.personOrg}</td>
                    <td className="py-2 px-3">
                      <span className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] text-slate-500">
                        {item.category}
                      </span>
                    </td>
                  </tr>
                ))}
                {assignedSeats.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400">本場次目前尚無人員入座</td>
                  </tr>
                )}
              </tbody>
            </table>
            
            <div className="mt-8 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400 hidden print:block">
               本報表由 Seat-System v4.0 自動產生
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};