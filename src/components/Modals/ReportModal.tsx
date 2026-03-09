// src/components/Modals/ReportModal.tsx
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useProjectStore } from '../../store/useProjectStore';
import { X, Printer, ArrowUpDown, ArrowUp, ArrowDown, Download, Camera, LayoutGrid } from 'lucide-react';

interface Props { isOpen: boolean; onClose: () => void; }

type SortKey = 'seatLabel' | 'serialNumber' | 'personName' | 'personTitle' | 'personOrg' | 'category' | 'batchName' | 'spotLabel';

export const ReportModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { personnel, sessions, activeSessionId, projectName } = useProjectStore();
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);
  const [reportType, setReportType] = useState<'seat' | 'photo'>('seat'); 
  
  if (!isOpen) return null;

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const mainSeats = activeSession?.venue.seats || [];
  const photoBatches = activeSession?.photoBatches || [];

  const handleSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortConfig?.key !== key) return <ArrowUpDown size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity inline ml-1"/>;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-blue-600 inline ml-1"/> : <ArrowDown size={14} className="text-blue-600 inline ml-1"/>;
  };

  let listData: any[] = [];

  if (reportType === 'seat') {
      mainSeats.filter(s => s.assignedPersonId).forEach(seat => {
          const p = personnel.find(person => person.id === seat.assignedPersonId);
          if (p) {
              listData.push({
                  seatLabel: seat.label, serialNumber: p.serialNumber || '',
                  personName: p.name, personTitle: p.title, personOrg: p.organization, category: p.category
              });
          }
      });
  } else {
      photoBatches.forEach(batch => {
          batch.spots.filter(s => s.assignedPersonId).forEach(spot => {
              const p = personnel.find(person => person.id === spot.assignedPersonId);
              const originalSeat = mainSeats.find(s => s.assignedPersonId === p?.id);
              if (p) {
                  listData.push({
                      batchName: batch.name, spotLabel: spot.label,
                      seatLabel: originalSeat ? originalSeat.label : '未入座',
                      serialNumber: p.serialNumber || '', personName: p.name,
                      personTitle: p.title, personOrg: p.organization
                  });
              }
          });
      });
  }

  // 【核心修正】導入自然數排序 (Natural Sort) 引擎
  listData.sort((a, b) => {
      const collator = new Intl.Collator('zh-TW', { numeric: true, sensitivity: 'base' });

      if (!sortConfig) {
          if (reportType === 'seat') {
              return collator.compare(a.seatLabel, b.seatLabel);
          } else {
              const batchDiff = collator.compare(a.batchName, b.batchName);
              if (batchDiff !== 0) return batchDiff;
              return collator.compare(a.spotLabel, b.spotLabel);
          }
      }
      
      const { key, direction } = sortConfig;
      const valA = a[key as keyof typeof a] || ''; 
      const valB = b[key as keyof typeof b] || '';
      
      const comparison = collator.compare(valA as string, valB as string);
      return direction === 'asc' ? comparison : -comparison;
  });

  const handleExportCSV = () => {
      const BOM = '\uFEFF'; 
      let csvContent = BOM;
      
      if (reportType === 'seat') {
          csvContent += '座位,序號,姓名,職稱,單位,類別\n';
          listData.forEach(item => {
              csvContent += `"${item.seatLabel}","${item.serialNumber}","${item.personName}","${item.personTitle}","${item.personOrg}","${item.category}"\n`;
          });
      } else {
          csvContent += '梯次,上台站位,原座位,序號,姓名,職稱,單位\n';
          listData.forEach(item => {
              csvContent += `"${item.batchName}","${item.spotLabel}","${item.seatLabel}","${item.serialNumber}","${item.personName}","${item.personTitle}","${item.personOrg}"\n`;
          });
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${projectName}_${activeSession?.name}_${reportType === 'seat' ? '座位分配表' : '拍照動線表'}.csv`;
      link.click();
      URL.revokeObjectURL(url);
  };

  return createPortal(
    <>
      <style type="text/css">
        {`@media print { body * { visibility: hidden; } #report-print-area, #report-print-area * { visibility: visible; } #report-print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 0 !important; margin: 0 !important; } }`}
      </style>

      <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-[100] p-4 print:p-0 print:bg-white print:static">
        <div id="report-print-area" className="bg-white w-[1000px] max-h-[90vh] rounded-xl shadow-2xl flex flex-col print:shadow-none print:w-full print:max-h-none print:h-auto">
          
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0 print:hidden">
            <div className="flex bg-white rounded-lg border border-slate-200 p-1 shadow-sm">
                <button onClick={() => setReportType('seat')} className={`flex items-center gap-2 px-4 py-1.5 rounded-md font-bold text-sm transition ${reportType === 'seat' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:bg-slate-100'}`}>
                    <LayoutGrid size={16}/> 座位分配表
                </button>
                <button onClick={() => setReportType('photo')} className={`flex items-center gap-2 px-4 py-1.5 rounded-md font-bold text-sm transition ${reportType === 'photo' ? 'bg-fuchsia-600 text-white shadow' : 'text-slate-500 hover:bg-slate-100'}`}>
                    <Camera size={16}/> 拍照動線表
                </button>
            </div>
            
            <div className="flex gap-2">
              <button onClick={handleExportCSV} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 text-sm font-bold rounded-lg hover:bg-emerald-700 shadow-sm transition"><Download size={16}/> 匯出 CSV</button>
              <button onClick={() => window.print()} className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 text-sm font-bold rounded-lg hover:bg-amber-600 shadow-sm transition"><Printer size={16}/> 列印 / PDF</button>
              <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-full text-slate-500 transition"><X size={20}/></button>
            </div>
          </div>

          <div className="p-8 overflow-y-auto custom-scrollbar flex-1 print:p-0 print:overflow-visible">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-slate-900 mb-1">{projectName}</h1>
              <h2 className={`text-lg font-bold mb-2 ${reportType === 'photo' ? 'text-fuchsia-700' : 'text-blue-700'}`}>
                  【 {activeSession?.name} 】{reportType === 'seat' ? '座位分配表' : '上台拍照動線表'}
              </h2>
              <p className="text-xs text-slate-400">製表時間：{new Date().toLocaleString()}</p>
            </div>

            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-white print:static z-10">
                {reportType === 'seat' ? (
                   <tr className="bg-blue-50/50 border-y-2 border-blue-200 print:bg-slate-100 text-blue-900">
                     <th className="py-2 px-3 text-left w-20 cursor-pointer group" onClick={() => handleSort('seatLabel')}>座位 {renderSortIcon('seatLabel')}</th>
                     <th className="py-2 px-3 text-left w-20 cursor-pointer group" onClick={() => handleSort('serialNumber')}>序號 {renderSortIcon('serialNumber')}</th>
                     <th className="py-2 px-3 text-left w-[20%] cursor-pointer group" onClick={() => handleSort('personName')}>姓名 {renderSortIcon('personName')}</th>
                     <th className="py-2 px-3 text-left w-1/4 cursor-pointer group" onClick={() => handleSort('personTitle')}>職稱 {renderSortIcon('personTitle')}</th>
                     <th className="py-2 px-3 text-left cursor-pointer group" onClick={() => handleSort('personOrg')}>單位 {renderSortIcon('personOrg')}</th>
                     <th className="py-2 px-3 text-left w-28 cursor-pointer group" onClick={() => handleSort('category')}>類別 {renderSortIcon('category')}</th>
                   </tr>
                ) : (
                   <tr className="bg-fuchsia-50/50 border-y-2 border-fuchsia-200 print:bg-slate-100 text-fuchsia-900">
                     <th className="py-2 px-3 text-left w-24 cursor-pointer group" onClick={() => handleSort('batchName')}>拍照梯次 {renderSortIcon('batchName')}</th>
                     <th className="py-2 px-3 text-left w-24 cursor-pointer group" onClick={() => handleSort('spotLabel')}>上台站位 {renderSortIcon('spotLabel')}</th>
                     <th className="py-2 px-3 text-left w-20 cursor-pointer group" onClick={() => handleSort('seatLabel')}>原座位 {renderSortIcon('seatLabel')}</th>
                     <th className="py-2 px-3 text-left w-16 cursor-pointer group" onClick={() => handleSort('serialNumber')}>序號 {renderSortIcon('serialNumber')}</th>
                     <th className="py-2 px-3 text-left w-32 cursor-pointer group" onClick={() => handleSort('personName')}>姓名 {renderSortIcon('personName')}</th>
                     <th className="py-2 px-3 text-left w-48 cursor-pointer group" onClick={() => handleSort('personTitle')}>職稱 {renderSortIcon('personTitle')}</th>
                     <th className="py-2 px-3 text-left cursor-pointer group" onClick={() => handleSort('personOrg')}>單位 {renderSortIcon('personOrg')}</th>
                   </tr>
                )}
              </thead>
              <tbody>
                {listData.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50 print:border-slate-300">
                    {reportType === 'seat' ? (
                        <>
                          <td className="py-2 px-3 font-mono font-bold text-blue-800">{item.seatLabel}</td>
                          <td className="py-2 px-3 font-mono text-slate-500">{item.serialNumber}</td>
                          <td className="py-2 px-3 font-bold text-base tracking-wide">{item.personName}</td>
                          <td className="py-2 px-3 text-slate-600">{item.personTitle}</td>
                          <td className="py-2 px-3 text-slate-600">{item.personOrg}</td>
                          <td className="py-2 px-3"><span className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] text-slate-500">{item.category}</span></td>
                        </>
                    ) : (
                        <>
                          <td className="py-2 px-3 font-bold text-fuchsia-700">{item.batchName}</td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-800 bg-fuchsia-50/30">{item.spotLabel}</td>
                          <td className="py-2 px-3 font-mono text-slate-500">{item.seatLabel}</td>
                          <td className="py-2 px-3 font-mono text-slate-400">{item.serialNumber}</td>
                          <td className="py-2 px-3 font-bold text-base tracking-wide">{item.personName}</td>
                          <td className="py-2 px-3 text-slate-600">{item.personTitle}</td>
                          <td className="py-2 px-3 text-slate-600">{item.personOrg}</td>
                        </>
                    )}
                  </tr>
                ))}
                {listData.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">目前尚無相關資料</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};