// src/components/Sidebar/SidebarContainer.tsx
import React, { useRef } from 'react';
import { useVenueStore } from '../../store/useVenueStore';
import { usePersonnelStore } from '../../store/usePersonnelStore';
import { useSystemStore } from '../../store/useSystemStore';
import { Settings2, Save, FolderOpen, ImageIcon, FileCode, FileDown } from 'lucide-react';

// 引入拆解後的子面板與工具
import { VenueEditPanel } from './VenueEditPanel';
import { PersonnelPanel } from './PersonnelPanel';
import { exportProjectJSON, importProjectJSON } from '../../utils/projectIO';

export const SidebarContainer: React.FC = () => {
  const { isEditMode, setEditMode, exportCanvas } = useVenueStore();
  const projectInputRef = useRef<HTMLInputElement>(null);

  const handleSaveProject = () => {
    const projectData = {
      version: '3.2',
      timestamp: new Date().toISOString(),
      personnel: usePersonnelStore.getState().personnel,
      venue: {
        seats: useVenueStore.getState().seats,
        backgroundImage: useVenueStore.getState().backgroundImage,
        stageScale: useVenueStore.getState().stageScale,
        stagePosition: useVenueStore.getState().stagePosition
      },
      categories: useSystemStore.getState().categories
    };
    exportProjectJSON(projectData);
  };

  const handleLoadProject = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (window.confirm('讀取專案將會覆蓋目前所有進度，確定要繼續嗎？')) {
      try {
        const json = await importProjectJSON(file);
        usePersonnelStore.setState({ personnel: json.personnel });
        if(json.categories) useSystemStore.setState({ categories: json.categories });
        useVenueStore.setState({
          seats: json.venue.seats,
          backgroundImage: json.venue.backgroundImage,
          stageScale: json.venue.stageScale || 1,
          stagePosition: json.venue.stagePosition || { x: 0, y: 0 },
          history: [] 
        });
        usePersonnelStore.getState().syncSeatingStatus();
      } catch (err: any) {
        alert(err.message);
      }
    }
    if (projectInputRef.current) projectInputRef.current.value = '';
  };

  return (
    <div className="w-96 bg-white border-l border-slate-200 h-full flex flex-col shadow-xl z-20 shrink-0 select-none">
      <input type="file" ref={projectInputRef} onChange={handleLoadProject} className="hidden" accept=".json" />

      {/* 頂部模式切換區 */}
      <div className="bg-slate-800 text-white p-3 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-2">
          <Settings2 size={18} className="text-blue-400"/>
          <span className="font-bold text-sm tracking-wide">系統模式</span>
        </div>
        <div className="flex bg-slate-700 rounded p-1 border border-slate-600">
          <button 
             onClick={() => setEditMode(false)}
             className={`px-3 py-1 text-xs rounded transition-all font-medium ${!isEditMode ? 'bg-white text-slate-900 shadow' : 'text-slate-400 hover:text-white'}`}
          >人員排位</button>
          <button 
             onClick={() => setEditMode(true)}
             className={`px-3 py-1 text-xs rounded transition-all font-medium ${isEditMode ? 'bg-blue-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >場地編輯</button>
        </div>
      </div>

      {/* 根據模式渲染不同面板 */}
      {isEditMode ? <VenueEditPanel /> : <PersonnelPanel />}

      {/* 底部共用工具列 (匯出與存檔) */}
      <div className="p-3 border-t border-slate-200 flex gap-2 bg-slate-100 mt-auto">
        <div className="flex-1 flex gap-1">
           <button onClick={() => exportCanvas?.('png')} className="flex-1 bg-white border border-slate-300 text-slate-600 text-[10px] py-1 rounded hover:text-blue-600 flex items-center justify-center gap-1" title="匯出 PNG">
              <ImageIcon size={12}/> PNG
           </button>
           <button onClick={() => exportCanvas?.('svg')} className="flex-1 bg-white border border-slate-300 text-slate-600 text-[10px] py-1 rounded hover:text-purple-600 flex items-center justify-center gap-1" title="匯出 SVG">
              <FileCode size={12}/> SVG
           </button>
           <button onClick={() => exportCanvas?.('pdf')} className="flex-1 bg-white border border-slate-300 text-slate-600 text-[10px] py-1 rounded hover:text-red-600 flex items-center justify-center gap-1" title="匯出 PDF">
              <FileDown size={12}/> PDF
           </button>
        </div>
        <button onClick={handleSaveProject} className="bg-slate-800 text-white text-xs px-3 py-1 rounded hover:bg-slate-700 flex items-center gap-2" title="儲存專案">
          <Save size={14} /> 存檔
        </button>
        <button onClick={() => projectInputRef.current?.click()} className="bg-white border border-slate-300 text-slate-700 text-xs px-2 py-1 rounded hover:bg-slate-50" title="讀取專案">
          <FolderOpen size={14} />
        </button>
      </div>
    </div>
  );
};