// src/components/Header/TopNavBar.tsx
import React, { useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { saveFileToDrive, showDrivePicker, loadFileFromDrive } from '../../utils/googleDriveAPI';
import { Cloud, Settings, CheckCircle, FolderOpen, Copy, HardDriveDownload } from 'lucide-react';
import { CategoryModal } from '../Modals/CategoryModal';

export const TopNavBar: React.FC = () => {
  const { projectName, setProjectName, fileId, setFileId, loadProjectData } = useProjectStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // 【新增】本地端緊急備份機制：將專案打包成 .seatproject 下載
  const downloadLocalBackup = () => {
      const state = useProjectStore.getState();
      const projectDataToSave = {
        version: state.version,
        timestamp: new Date().toISOString(),
        fileId: state.fileId,
        projectName: state.projectName,
        personnel: state.personnel,
        categories: state.categories,
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
      };
      const blob = new Blob([JSON.stringify(projectDataToSave)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${state.projectName || '未命名專案'}_緊急備份_${Date.now()}.seatproject`;
      link.click();
      URL.revokeObjectURL(url);
  };

  const performSave = async (targetFileId: string | null | undefined, targetName: string) => {
    setIsProcessing(true);
    setSaveStatus('idle');
    try {
      const state = useProjectStore.getState();
      const projectDataToSave = {
        version: state.version,
        timestamp: new Date().toISOString(),
        fileId: targetFileId || null,
        projectName: targetName,
        personnel: state.personnel,
        categories: state.categories,
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
      };

      const idToPass = targetFileId || undefined; 
      const savedFileId = await saveFileToDrive(targetName, projectDataToSave, idToPass);
      
      if (targetFileId !== savedFileId && savedFileId) {
        setFileId(savedFileId);
        const newUrl = `${window.location.origin}${window.location.pathname}?fileId=${savedFileId}`;
        window.history.pushState({ path: newUrl }, '', newUrl);
      }
      
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error(error);
      setSaveStatus('error');
      // 【防護機制】如果雲端存檔失敗，立刻觸發本地下載！
      alert('⚠️ 雲端存檔失敗！可能是連線中斷或授權過期。\n\n系統已自動為您下載一份【本機備份檔 (.seatproject)】以防止資料遺失。請妥善保存該檔案！');
      downloadLocalBackup();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = () => performSave(fileId, projectName);

  const handleSaveAs = () => {
    const newName = window.prompt('請輸入新專案名稱：', `${projectName} (複製)`);
    if (!newName) return;
    setProjectName(newName);
    performSave(undefined, newName); 
  };

  const handleLoad = async () => {
    try {
      setIsProcessing(true);
      const pickedFile = await showDrivePicker();
      if (pickedFile) {
        const data = await loadFileFromDrive(pickedFile.id);
        loadProjectData({ ...data, fileId: pickedFile.id });
        const newUrl = `${window.location.origin}${window.location.pathname}?fileId=${pickedFile.id}`;
        window.history.pushState({ path: newUrl }, '', newUrl);
      }
    } catch (error) {
      console.error(error);
      alert('讀取檔案失敗！');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="h-14 bg-slate-800 text-white flex items-center justify-between px-4 shadow-md shrink-0">
        
        <div className="flex items-center gap-4">
          <div className="font-bold text-lg tracking-wide text-blue-300">SeatSystem v4.0</div>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="bg-slate-700/50 hover:bg-slate-700 focus:bg-slate-600 text-white px-3 py-1.5 rounded outline-none transition w-64 font-medium"
            placeholder="輸入專案名稱..."
          />
        </div>

        <div className="flex items-center gap-2">
          {fileId && <span className="text-xs text-slate-400 mr-2">已連線至雲端</span>}
          
          <button onClick={handleLoad} disabled={isProcessing} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded transition font-bold bg-slate-700 hover:bg-slate-600 disabled:opacity-50">
            <FolderOpen size={16} className="text-amber-400" /> 載入
          </button>

          {/* 新增：手動本地端備份按鈕 */}
          <button onClick={downloadLocalBackup} title="下載整份專案到本機電腦" className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded transition font-bold bg-slate-700 hover:bg-slate-600 border border-slate-500 hover:border-slate-400 ml-1">
            <HardDriveDownload size={16} className="text-blue-300" /> 本機備份
          </button>

          <button onClick={handleSave} disabled={isProcessing} className={`flex items-center gap-1.5 text-sm px-4 py-1.5 rounded transition font-bold shadow-sm disabled:opacity-50 ml-1 ${saveStatus === 'success' ? 'bg-green-600 hover:bg-green-500' : 'bg-blue-600 hover:bg-blue-500'}`}>
            {isProcessing ? <span className="animate-pulse">處理中...</span> : saveStatus === 'success' ? <><CheckCircle size={16} /> 成功</> : <><Cloud size={16} /> 儲存</>}
          </button>

          <button onClick={handleSaveAs} disabled={isProcessing} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded transition font-bold bg-slate-700 hover:bg-slate-600 disabled:opacity-50 ml-1">
            <Copy size={16} className="text-emerald-400" /> 另存新檔
          </button>
          
          <div className="w-px h-6 bg-slate-600 mx-1"></div>

          <button onClick={() => setIsCategoryModalOpen(true)} className="p-1.5 text-slate-400 hover:text-white rounded transition" title="類別與顏色設定">
            <Settings size={18} />
          </button>
        </div>
      </div>

      <CategoryModal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} />
    </>
  );
};