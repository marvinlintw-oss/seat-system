// src/components/Sidebar/PersonnelPanel.tsx
import React, { useState } from 'react';
import { Plus, Table, Printer, RefreshCw, BarChart3, FileSearch } from 'lucide-react';
import { AutoArrange } from './AutoArrange';
import { ManualAssign } from './ManualAssign';
import { ExcelBatchModal } from '../Modals/ExcelBatchModal';
import { SpreadsheetModal } from '../Modals/SpreadsheetModal'; 
import { ReportModal } from '../Modals/ReportModal';
import { DataSyncModal } from '../Modals/DataSyncModal';
import { StatsModal } from '../Modals/StatsModal';
import { VersionDiffModal } from '../Modals/VersionDiffModal';

export const PersonnelPanel: React.FC = () => {
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isSpreadsheetOpen, setIsSpreadsheetOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isDataSyncOpen, setIsDataSyncOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false); // 【新增】差異比對狀態

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden animate-in slide-in-from-top-2 duration-300 bg-white relative">
      
      <div className="p-2 border-b border-slate-200 bg-white shrink-0 shadow-sm z-10">
        <div className="flex justify-between items-center mb-1.5 px-1">
            <h3 className="text-[12px] font-bold text-slate-600 uppercase tracking-wider">名單與動線</h3>
            <button 
                onClick={() => setIsExcelModalOpen(true)}
                className="flex items-center gap-1 text-[12px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 hover:bg-blue-100 transition"
              >
                <Plus size={10}/> 快速貼上
            </button>
        </div>
        
        {/* 【修改】改為 grid-cols-4 並加入異動按鈕 */}
        <div className="grid grid-cols-4 gap-1 px-1 mb-1.5">
          <button onClick={() => setIsSpreadsheetOpen(true)} className="bg-green-600 hover:bg-green-700 text-white py-1.5 rounded text-[12px] flex justify-center items-center gap-1 shadow-sm transition font-bold">
            <Table size={12}/> 編輯
          </button>
          <button onClick={() => setIsReportOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-white py-1.5 rounded text-[12px] flex justify-center items-center gap-1 shadow-sm transition font-bold">
            <Printer size={12}/> 報表
          </button>
          <button onClick={() => setIsStatsOpen(true)} className="bg-slate-700 hover:bg-slate-800 text-white py-1.5 rounded text-[12x] flex justify-center items-center gap-1 shadow-sm transition font-bold">
            <BarChart3 size={12}/> 統計
          </button>
          <button onClick={() => setIsDiffModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 rounded text-[12px] flex justify-center items-center gap-1 shadow-sm transition font-bold">
            <FileSearch size={12}/> 異動
          </button>
        </div>
        <button onClick={() => setIsDataSyncOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded text-[12px] flex justify-center items-center gap-1 shadow-sm transition font-bold w-full">
          <RefreshCw size={12}/> Google Sheet 雙向同步
        </button>
      </div>

      <AutoArrange />
      <ManualAssign />

      <ExcelBatchModal isOpen={isExcelModalOpen} onClose={() => setIsExcelModalOpen(false)} />
      <SpreadsheetModal isOpen={isSpreadsheetOpen} onClose={() => setIsSpreadsheetOpen(false)} />
      <ReportModal isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} />
      <DataSyncModal isOpen={isDataSyncOpen} onClose={() => setIsDataSyncOpen(false)} />
      <StatsModal isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)} />
      
      {/* 【修復】這裡補上剛才漏掉的 Component，紅黃字就會完全消失了！ */}
      <VersionDiffModal isOpen={isDiffModalOpen} onClose={() => setIsDiffModalOpen(false)} />
    </div>
  );
};