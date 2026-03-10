// src/components/Sidebar/SidebarContainer.tsx
import React, { useState } from 'react';
import { PersonnelPanel } from './PersonnelPanel';
import { VenueEditPanel } from './VenueEditPanel';
// 🟢 匯入我們最新的統包引擎
import { exportHighResChart } from '../../utils/canvasExport';
import { useVenueStore, VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from '../../store/useVenueStore';
import { Users, Map, Image as ImageIcon, FileCode2, FileText } from 'lucide-react';
import { ExportOptionsModal, type ExportOptions } from '../Modals/ExportOptionsModal';

export const SidebarContainer: React.FC = () => {
  const isEditMode = useVenueStore(state => state.isEditMode);
  
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'png' | 'svg' | 'pdf'>('svg');

  const handleExportClick = (format: 'png' | 'svg' | 'pdf') => {
    setExportFormat(format);
    setExportModalOpen(true);
  };

  // 🟢 確認匯出時，把所有參數都交給新引擎處理！
  const handleConfirmExport = (options: ExportOptions) => {
    exportHighResChart(VIRTUAL_WIDTH, VIRTUAL_HEIGHT, options, exportFormat);
  };

  return (
    <div className="w-80 h-full bg-white border-r border-slate-200 flex flex-col shadow-lg z-10 shrink-0">
      
      <div className="flex bg-slate-800 text-slate-300 shrink-0">
        <button
          onClick={() => useVenueStore.setState({ isEditMode: false })}
          className={`flex-1 py-3 text-sm font-bold flex justify-center items-center gap-2 transition-colors ${!isEditMode ? 'bg-white text-blue-600' : 'hover:bg-slate-700 hover:text-white'}`}
        >
          <Users size={16} /> 人員排位
        </button>
        <button
          onClick={() => useVenueStore.setState({ isEditMode: true })}
          className={`flex-1 py-3 text-sm font-bold flex justify-center items-center gap-2 transition-colors ${isEditMode ? 'bg-white text-blue-600' : 'hover:bg-slate-700 hover:text-white'}`}
        >
          <Map size={16} /> 場地編輯
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col relative">
         {!isEditMode ? <PersonnelPanel /> : <VenueEditPanel />}
      </div>

      <div className="p-3 border-t border-slate-200 bg-slate-50 flex gap-2 shrink-0">
        <button 
           onClick={() => handleExportClick('png')} 
           className="flex-1 flex items-center justify-center gap-1 bg-white border border-slate-300 text-slate-600 py-1.5 rounded hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition text-xs font-bold shadow-sm"
           title="匯出為高畫質完整圖片"
        >
            <ImageIcon size={14}/> PNG
        </button>
        <button 
           onClick={() => handleExportClick('svg')} 
           className="flex-1 flex items-center justify-center gap-1 bg-white border border-slate-300 text-slate-600 py-1.5 rounded hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition text-xs font-bold shadow-sm"
           title="匯出為可編輯 SVG 向量檔"
        >
            <FileCode2 size={14}/> SVG
        </button>
        <button 
           onClick={() => handleExportClick('pdf')} 
           className="flex-1 flex items-center justify-center gap-1 bg-red-50 border border-red-200 text-red-600 py-1.5 rounded hover:bg-red-100 transition text-xs font-bold shadow-sm"
           title="匯出為列印專用格式"
        >
            <FileText size={14}/> PDF
        </button>
      </div>

      <ExportOptionsModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        onConfirm={handleConfirmExport}
        title={exportFormat.toUpperCase() + ' 格式匯出'}
      />
    </div>
  );
};