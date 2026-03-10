// src/components/Modals/DataSyncModal.tsx
import React, { useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { usePersonnelStore } from '../../store/usePersonnelStore';
import { showDrivePicker, fetchSpreadsheetData, updateSpreadsheetData } from '../../utils/googleDriveAPI';
import { X, RefreshCw, UploadCloud, DownloadCloud, AlertTriangle } from 'lucide-react';

interface Props { isOpen: boolean; onClose: () => void; }

export const DataSyncModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { personnel, sessions } = useProjectStore();
  const { updatePersonnelList } = usePersonnelStore();
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLog, setSyncLog] = useState<string[]>([]);
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);

  if (!isOpen) return null;

  const log = (msg: string) => setSyncLog(prev => [...prev, msg]);

  const handleSyncProcess = async () => {
    try {
      setIsSyncing(true);
      setSyncLog([]);
      
      let targetId = selectedSheetId;
      if (!targetId) {
          log('等待使用者選擇 Google 試算表...');
          const file = await showDrivePicker('spreadsheet');
          if (!file) { log('取消選擇。'); setIsSyncing(false); return; }
          targetId = file.id;
          setSelectedSheetId(file.id);
      }

      log(`正在讀取試算表資料...`);
      // 🟢 呼叫升級版的 API，自動拿回真實的 SheetName 和資料
      const { values: rawData, sheetName } = await fetchSpreadsheetData(targetId, 'A:Z');
      
      if (!rawData || rawData.length === 0) {
          log('❌ 試算表是空的！請確保有資料。');
          setIsSyncing(false); return;
      }

      const headers = rawData[0];
      const externalIdIndex = headers.findIndex(h => h.includes('externalId') || h.includes('系統ID'));
      const nameIndex = headers.findIndex(h => h.includes('姓名'));
      
      if (nameIndex === -1) {
          log('❌ 找不到「姓名」欄位，無法同步！');
          setIsSyncing(false); return;
      }

      log(`✅ 成功連線分頁「${sheetName}」，開始比對資料...`);
      let added = 0, updated = 0;
      const newPersonnelList = [...personnel];
      const generateUUID = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ext-${Date.now()}`;

      // 1. 從 Sheet 更新至本地 (Pull)
      for (let i = 1; i < rawData.length; i++) {
          const row = rawData[i];
          const extId = externalIdIndex !== -1 ? row[externalIdIndex] : null;
          const name = row[nameIndex];
          if (!name) continue;

          const existingIdx = newPersonnelList.findIndex(p => (extId && p.externalId === extId) || (!extId && p.name === name));
          
          if (existingIdx >= 0) {
              newPersonnelList[existingIdx].name = name;
              updated++;
          } else {
              newPersonnelList.push({
                  id: `person-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                  externalId: extId || generateUUID(),
                  name: name,
                  title: '', organization: '', category: '一般貴賓', rankScore: 50,
                  isSeated: false, attendingSessionIds: sessions.map(s => s.id)
              });
              added++;
          }
      }
      
      updatePersonnelList(newPersonnelList);
      log(`✅ Pull 完成：新增 ${added} 筆，更新 ${updated} 筆本地資料。`);

      // 2. 將包含排位結果的資料寫回 Sheet (Push)
      log(`準備將最終座位寫回試算表...`);
      
      const pushHeaders = ['系統ID (externalId)', '姓名', '職稱', '單位', '類別', '權重'];
      sessions.forEach(s => pushHeaders.push(`[座位] ${s.name}`));
      
      const pushData = [pushHeaders];

      newPersonnelList.forEach(p => {
          const rowData = [p.externalId || '', p.name, p.title, p.organization, p.category, p.rankScore.toString()];
          sessions.forEach(s => {
              const seat = s.venue.seats.find(st => st.assignedPersonId === p.id);
              rowData.push(seat ? seat.label : '未入座');
          });
          pushData.push(rowData);
      });

      // 🟢 寫回時也使用動態抓到的真實 sheetName，保證不踩雷！
      await updateSpreadsheetData(targetId, `${sheetName}!A1`, pushData);
      
      log(`✅ Push 完成：已將最新名單與座位代碼寫回 Google Sheet！`);
      log(`🎉 雙向同步大功告成！`);

    } catch (error: any) {
        // 🟢 將系統翻譯過的錯誤訊息印在畫面上
        log(`❌ ${error.message}`);
    } finally {
        setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-[600px] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50 rounded-t-xl">
          <h2 className="font-bold flex items-center gap-2 text-slate-800">
            <RefreshCw size={20} className="text-blue-600"/> Google Sheet 雙向同步資料庫
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full p-1"><X size={20}/></button>
        </div>

        <div className="p-6 space-y-4">
           <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg text-sm flex gap-3">
              <AlertTriangle className="shrink-0 text-blue-500"/>
              <div>
                  <p className="font-bold mb-1">同步引擎運作原理：</p>
                  <ul className="list-disc pl-4 space-y-1 text-blue-700">
                      <li><strong>Pull (拉取)：</strong>將試算表的名單抓回系統。依據 `externalId` 判斷新增或更新。</li>
                      <li><strong>Push (回推)：</strong>將系統內最新名單與「每一場次的座位代號」覆寫回試算表。</li>
                  </ul>
              </div>
           </div>

           <div className="bg-slate-900 text-green-400 font-mono text-xs p-4 rounded-lg h-48 overflow-y-auto shadow-inner">
               {syncLog.length === 0 ? (
                   <span className="text-slate-500">等待執行同步指令...</span>
               ) : (
                   syncLog.map((l, i) => <div key={i} className="mb-1">{`> ${l}`}</div>)
               )}
               {isSyncing && <div className="animate-pulse mt-2">&gt; 處理中，請勿關閉視窗...</div>}
           </div>
        </div>

        <div className="p-4 border-t border-slate-200 flex justify-end gap-2 bg-slate-50 rounded-b-xl">
            <button onClick={handleSyncProcess} disabled={isSyncing} className="w-full py-3 font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50">
               {isSyncing ? <RefreshCw className="animate-spin"/> : <><UploadCloud size={18}/><DownloadCloud size={18}/></>}
               {isSyncing ? '同步進行中...' : '選擇試算表並開始雙向同步'}
            </button>
        </div>
      </div>
    </div>
  );
};