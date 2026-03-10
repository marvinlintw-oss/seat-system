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

  const handleSyncProcess = async (direction: 'pull' | 'push') => {
    // 🟢 核心修復：加入防呆確認對話框
    if (direction === 'pull') {
        const confirmMsg = '⚠️ 警告：確定要「從表單匯入」嗎？\n\n這將會以 Google 表單的資料為準，【覆寫】系統內現有的姓名、職稱、單位與備註！\n(如果您剛剛在系統內有修改名單，將會被蓋掉)';
        if (!window.confirm(confirmMsg)) return;
    } else {
        const confirmMsg = '⚠️ 警告：確定要「匯出到表單」嗎？\n\n這將會以系統目前的狀態為準，【覆寫】Google 表單上的排位紀錄與最新名單！';
        if (!window.confirm(confirmMsg)) return;
    }

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

      if (direction === 'pull') {
          log(`📥 正在從試算表匯入資料...`);
          const { values: rawData, sheetName } = await fetchSpreadsheetData(targetId, 'A:Z');
          
          if (!rawData || rawData.length === 0) {
              log('❌ 試算表是空的！請確保有資料。');
              return;
          }

          const headers = rawData[0];
          const externalIdIndex = headers.findIndex(h => h.includes('externalId') || h.includes('系統ID'));
          const serialIndex = headers.findIndex(h => h.includes('序號'));
          const nameIndex = headers.findIndex(h => h.includes('姓名'));
          const titleIndex = headers.findIndex(h => h.includes('職稱'));
          const orgIndex = headers.findIndex(h => h.includes('單位'));
          const categoryIndex = headers.findIndex(h => h.includes('類別'));
          const rankIndex = headers.findIndex(h => h.includes('權重'));
          const remarksIndex = headers.findIndex(h => h.includes('備註'));
          
          if (nameIndex === -1) {
              log('❌ 找不到「姓名」欄位，無法同步！');
              return;
          }

          let added = 0, updated = 0;
          const newPersonnelList = [...personnel];
          const generateUUID = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ext-${Date.now()}`;

          for (let i = 1; i < rawData.length; i++) {
              const row = rawData[i];
              const extId = externalIdIndex !== -1 ? row[externalIdIndex] : null;
              const name = row[nameIndex];
              if (!name) continue;

              const safeGet = (idx: number, fallback = '') => (idx !== -1 && row[idx] !== undefined) ? row[idx] : fallback;

              const r_serial = safeGet(serialIndex);
              const r_title = safeGet(titleIndex);
              const r_org = safeGet(orgIndex);
              const r_cat = safeGet(categoryIndex, '一般貴賓');
              const r_rank = rankIndex !== -1 && row[rankIndex] ? Number(row[rankIndex]) : 50;
              const r_remarks = safeGet(remarksIndex);

              const existingIdx = newPersonnelList.findIndex(p => (extId && p.externalId === extId) || (!extId && p.name === name));
              
              if (existingIdx >= 0) {
                  newPersonnelList[existingIdx].name = name;
                  if (serialIndex !== -1) newPersonnelList[existingIdx].serialNumber = r_serial;
                  if (titleIndex !== -1) newPersonnelList[existingIdx].title = r_title;
                  if (orgIndex !== -1) newPersonnelList[existingIdx].organization = r_org;
                  if (categoryIndex !== -1) newPersonnelList[existingIdx].category = r_cat;
                  if (rankIndex !== -1) newPersonnelList[existingIdx].rankScore = isNaN(r_rank) ? 50 : r_rank;
                  if (remarksIndex !== -1) newPersonnelList[existingIdx].remarks = r_remarks;
                  updated++;
              } else {
                  newPersonnelList.push({
                      id: `person-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                      externalId: extId || generateUUID(),
                      serialNumber: r_serial,
                      name: name,
                      title: r_title,
                      organization: r_org,
                      category: r_cat,
                      rankScore: isNaN(r_rank) ? 50 : r_rank,
                      remarks: r_remarks,
                      isSeated: false, 
                      attendingSessionIds: sessions.map(s => s.id)
                  });
                  added++;
              }
          }
          
          updatePersonnelList(newPersonnelList);
          log(`✅ 匯入完成：從「${sheetName}」新增 ${added} 筆，更新 ${updated} 筆本地名單。`);
      }

      if (direction === 'push') {
          log(`📤 準備將系統資料匯出至試算表...`);
          const { sheetName } = await fetchSpreadsheetData(targetId, 'A1:B1');
          
          const pushHeaders = ['系統ID (externalId)', '序號', '姓名', '職稱', '單位', '類別', '權重', '備註'];
          sessions.forEach(s => pushHeaders.push(`[座位] ${s.name}`));
          
          const pushData = [pushHeaders];

          personnel.forEach(p => {
              const rowData = [
                  p.externalId || '', 
                  p.serialNumber || '', 
                  p.name || '', 
                  p.title || '', 
                  p.organization || '', 
                  p.category || '', 
                  p.rankScore.toString(),
                  p.remarks || ''
              ];
              
              sessions.forEach(s => {
                  const seat = s.venue.seats.find(st => st.assignedPersonId === p.id);
                  rowData.push(seat ? seat.label : '未入座');
              });
              pushData.push(rowData);
          });

          await updateSpreadsheetData(targetId, `${sheetName}!A1`, pushData);
          log(`✅ 匯出完成：已將系統內最新名單與座位排位結果寫回「${sheetName}」！`);
      }

    } catch (error: any) {
        log(`❌ 錯誤發生：${error.message}`);
    } finally {
        setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-[600px] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50 rounded-t-xl">
          <h2 className="font-bold flex items-center gap-2 text-slate-800">
            <RefreshCw size={20} className="text-blue-600"/> Google Sheet 資料庫同步
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full p-1"><X size={20}/></button>
        </div>

        <div className="p-6 space-y-4">
           <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg text-sm flex gap-3">
              <AlertTriangle className="shrink-0 text-blue-500 mt-0.5"/>
              <div>
                  <p className="font-bold mb-1">為避免資料覆蓋，請明確選擇同步方向：</p>
                  <ul className="list-disc pl-4 space-y-1 text-blue-700">
                      <li><strong>📥 從表單匯入：</strong>以 Google 表單 為準，<strong>覆寫</strong>系統內的姓名、單位等基本資料。</li>
                      <li><strong>📤 匯出到表單：</strong>以 系統 為準，將最新排位結果與修改的資料<strong>覆寫</strong>回 Google 表單。</li>
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

        <div className="p-4 border-t border-slate-200 flex justify-end gap-3 bg-slate-50 rounded-b-xl">
            <button 
                onClick={() => handleSyncProcess('pull')} 
                disabled={isSyncing} 
                className="flex-1 py-3 font-bold bg-white border-2 border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 rounded-lg transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
               {isSyncing ? <RefreshCw className="animate-spin" size={18}/> : <DownloadCloud size={18}/>}
                從表單匯入 (覆寫系統📥)
            </button>
            <button 
                onClick={() => handleSyncProcess('push')} 
                disabled={isSyncing} 
                className="flex-1 py-3 font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
               {isSyncing ? <RefreshCw className="animate-spin" size={18}/> : <UploadCloud size={18}/>}
                匯出到表單 (覆寫表單📤)
            </button>
        </div>
      </div>
    </div>
  );
};