// src/components/Header/TopNavBar.tsx
import React, { useState, useRef } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
// 【引入】清除 Token 的函式與重新登入的函式
import { saveFileToDrive, showDrivePicker, loadFileFromDrive, showFolderPicker, clearGoogleToken, requireLogin } from '../../utils/googleDriveAPI';
import { Cloud, Settings, CheckCircle, FolderOpen, Copy, HardDriveDownload, Upload, RefreshCw } from 'lucide-react';
import { CategoryModal } from '../Modals/CategoryModal';

export const TopNavBar: React.FC = () => {
  const { projectName, setProjectName, fileId, setFileId, loadProjectData } = useProjectStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      link.download = `${state.projectName || '未命名專案'}_備份_${Date.now()}.seatproject`;
      link.click();
      URL.revokeObjectURL(url);
  };

  const handleLocalLoad = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const data = JSON.parse(e.target?.result as string);
              loadProjectData(data);
              
              window.history.pushState({ path: window.location.pathname }, '', window.location.pathname);
              setFileId(null);
              
          } catch (error) {
              alert('檔案格式錯誤，無法讀取此專案檔！');
          }
      };
      reader.readAsText(file);
      event.target.value = '';
  };

  // 【核心新增】不重整網頁，手動強制重連 Google 雲端
  const handleReconnect = async () => {
      try {
          setIsProcessing(true);
          clearGoogleToken(); // 丟棄過期的 Token
          await requireLogin(); // 觸發 Google 驗證視窗
          alert('✅ 雲端重新連線成功！您可以繼續儲存與操作了。');
      } catch (error) {
          console.error('重新連線失敗:', error);
          alert('❌ 重新連線失敗，請檢查網路或允許瀏覽器彈出視窗。');
      } finally {
          setIsProcessing(false);
      }
  };

  const performSave = async (isSaveAs: boolean) => {
    setIsProcessing(true);
    setSaveStatus('idle');
    try {
      let targetFolderId: string | undefined = undefined;
      let finalFileName = projectName;

      if (isSaveAs || !fileId) {
          const newName = window.prompt('請輸入雲端專案檔名：', isSaveAs ? `${projectName} (複製)` : projectName);
          if (!newName) {
              setIsProcessing(false);
              return; 
          }
          finalFileName = newName;
          setProjectName(finalFileName); 

          const chooseFolder = window.confirm('是否要指定儲存的 Google Drive 資料夾？\n\n(按「確定」開啟選擇器，按「取消」則儲存於預設根目錄)');
          if (chooseFolder) {
              const folder = await showFolderPicker();
              if (folder) {
                  targetFolderId = folder.id;
              }
          }
      }

      const state = useProjectStore.getState();
      const projectDataToSave = {
        version: state.version,
        timestamp: new Date().toISOString(),
        fileId: isSaveAs ? null : state.fileId,
        projectName: finalFileName,
        personnel: state.personnel,
        categories: state.categories,
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
      };

      const savedFileId = await saveFileToDrive(
          finalFileName, 
          projectDataToSave, 
          isSaveAs ? undefined : (fileId || undefined), 
          targetFolderId
      );
      
      if (savedFileId) {
        setFileId(savedFileId);
        const newUrl = `${window.location.origin}${window.location.pathname}?fileId=${savedFileId}`;
        window.history.pushState({ path: newUrl }, '', newUrl);
      }
      
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error(error);
      setSaveStatus('error');
      // 【終極防護】存檔失敗時，自動丟棄過期的 Token
      clearGoogleToken();
      alert('⚠️ 雲端存檔失敗！可能是連線中斷或登入授權已過期。\n\n系統已自動為您下載一份【本機備份檔 (.seatproject)】以防止資料遺失。\n\n💡 解決方式：請點擊上方的「重新連線」按鈕，或直接再按一次「儲存雲端」，系統將自動為您重新驗證身份！');
      downloadLocalBackup();
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
          
          {/* 【升級】雲端狀態區塊，加入重新連線按鈕 */}
          <div className="flex items-center gap-2 mr-2 bg-slate-700/50 px-2 py-1 rounded-md">
              {fileId ? (
                  <span className="text-xs text-emerald-400 flex items-center gap-1"><Cloud size={12}/> 已連線雲端</span>
              ) : (
                  <span className="text-xs text-slate-400 flex items-center gap-1">本機未連線</span>
              )}
              <div className="w-px h-3 bg-slate-500 mx-1"></div>
              <button 
                  onClick={handleReconnect} 
                  disabled={isProcessing}
                  className="flex items-center gap-1 text-[10px] font-bold text-blue-300 hover:text-white transition disabled:opacity-50" 
                  title="重新取得授權 / 恢復連線"
              >
                  <RefreshCw size={12} className={isProcessing ? "animate-spin" : ""} /> 重新連線
              </button>
          </div>
          
          <input type="file" accept=".seatproject,.json" ref={fileInputRef} onChange={handleLocalLoad} className="hidden" />

          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded transition font-bold bg-slate-700 hover:bg-slate-600 border border-slate-500 hover:border-slate-400">
            <Upload size={16} className="text-amber-200" /> 載入本機
          </button>

          <button onClick={async () => {
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
          }} disabled={isProcessing} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded transition font-bold bg-slate-700 hover:bg-slate-600 disabled:opacity-50 border border-slate-500 hover:border-slate-400 ml-1">
            <FolderOpen size={16} className="text-amber-400" /> 載入雲端
          </button>

          <div className="w-px h-6 bg-slate-600 mx-1"></div>

          <button onClick={downloadLocalBackup} title="下載整份專案到本機電腦" className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded transition font-bold bg-slate-700 hover:bg-slate-600">
            <HardDriveDownload size={16} className="text-blue-300" /> 下載備份
          </button>

          <button onClick={() => performSave(false)} disabled={isProcessing} className={`flex items-center gap-1.5 text-sm px-4 py-1.5 rounded transition font-bold shadow-sm disabled:opacity-50 ml-1 ${saveStatus === 'success' ? 'bg-green-600 hover:bg-green-500' : 'bg-blue-600 hover:bg-blue-500'}`}>
            {isProcessing ? <span className="animate-pulse">處理中...</span> : saveStatus === 'success' ? <><CheckCircle size={16} /> 成功</> : <><Cloud size={16} /> 儲存雲端</>}
          </button>

          <button onClick={() => performSave(true)} disabled={isProcessing} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded transition font-bold bg-slate-700 hover:bg-slate-600 disabled:opacity-50 ml-1">
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