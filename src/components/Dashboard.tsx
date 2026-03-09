// src/components/Dashboard.tsx
import React, { useState } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { useSystemStore } from '../store/useSystemStore'; // 【新增】引入 SystemStore
import { showDrivePicker, loadFileFromDrive } from '../utils/googleDriveAPI';
import { FolderOpen, Plus, Cloud } from 'lucide-react';

interface DashboardProps {
  onEnter: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onEnter }) => {
  const { setProjectName, loadProjectData } = useProjectStore();
  const { initDefaultCategories } = useSystemStore(); // 【新增】取得載入預設值的函式
  const [tempName, setTempName] = useState('');
  const [isPicking, setIsPicking] = useState(false);

  const handleCreateNew = () => {
    setProjectName(tempName.trim() || '未命名活動專案');
    initDefaultCategories(); // 【關鍵魔法】自動寫入府院首長等 10 組預設類別
    onEnter();
  };

  const handleOpenFromDrive = async () => {
    try {
      setIsPicking(true);
      const pickedFile = await showDrivePicker();
      if (pickedFile) {
        const data = await loadFileFromDrive(pickedFile.id);
        loadProjectData({ ...data, fileId: pickedFile.id });
        
        const newUrl = `${window.location.origin}${window.location.pathname}?fileId=${pickedFile.id}`;
        window.history.pushState({ path: newUrl }, '', newUrl);
        
        onEnter();
      }
    } catch (error) {
      console.error(error);
      alert('讀取檔案失敗！');
    } finally {
      setIsPicking(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans text-slate-800">
      <div className="text-center mb-10">
        <div className="flex justify-center mb-4">
          <div className="bg-blue-600 p-4 rounded-2xl shadow-lg text-white">
            <Cloud size={48} strokeWidth={1.5} />
          </div>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-2">
          Seat System <span className="text-blue-600">v1.2</span>
        </h1>
        <p className="text-slate-500 font-medium">多場次雲端排位管理系統</p>
      </div>

      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-100 p-8 space-y-8">
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">建立全新活動</h2>
          <div className="space-y-2">
            <input 
              type="text" 
              placeholder="例如：2026 地方創生論壇..." 
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateNew()}
            />
            <button 
              onClick={handleCreateNew}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition shadow-sm"
            >
              <Plus size={18} /> 進入排位畫布
            </button>
          </div>
        </div>

        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-medium">或者</span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">載入現有專案</h2>
          <button 
            onClick={handleOpenFromDrive}
            disabled={isPicking}
            className="w-full bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 border-2 border-slate-200 font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition"
          >
            <FolderOpen size={18} className="text-amber-500" />
            {isPicking ? '讀取中...' : '從 Google Drive 開啟'}
          </button>
        </div>
      </div>
    </div>
  );
};