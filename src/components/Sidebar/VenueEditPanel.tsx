// src/components/Sidebar/VenueEditPanel.tsx
import React, { useRef, useState } from 'react';
import { useVenueStore } from '../../store/useVenueStore';
import { useSystemStore } from '../../store/useSystemStore';
import { FileDown, Upload, Hash, Star, LayoutTemplate, Layers } from 'lucide-react';
import { exportVenueJSON, importVenueJSON } from '../../utils/venueIO';

export const VenueEditPanel: React.FC = () => {
  const { 
    seats, backgroundImage, selectedSeatIds,
    autoNumberSeats, startNumberSequence, stopNumberSequence, isNumbering,
    autoPrioritySeats, startRankSequence, stopRankSequence, isSequencing,
    setSeatZone
  } = useVenueStore();
  const { categories } = useSystemStore();
  
  const venueInputRef = useRef<HTMLInputElement>(null);

  // 編號與優先度設定狀態
  const [numMode, setNumMode] = useState<'center' | 'top-left' | 'distance'>('center');
  const [numFormat, setNumFormat] = useState<'row-col' | 'sequence'>('row-col');
  const [priMode, setPriMode] = useState<'center' | 'top-left' | 'distance'>('center');

  const handleImportVenue = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (window.confirm('匯入新場地圖將會清空目前所有座位與人員排位，確定嗎？')) {
      try {
        const config = await importVenueJSON(file);
        useVenueStore.setState({
          seats: config.seats.map(s => ({ ...s, assignedPersonId: null })),
          backgroundImage: config.backgroundImage || null, history: []
        });
      } catch (err: any) { alert(err.message); }
    }
    if (venueInputRef.current) venueInputRef.current.value = '';
  };

  return (
    <div className="bg-blue-50 flex-1 overflow-y-auto animate-in slide-in-from-top-2 duration-300">
      
      {/* 1. 場地匯入匯出 */}
      <div className="p-4 border-b border-blue-100">
        <h3 className="text-xs font-bold text-blue-800 mb-2 flex items-center gap-1"><LayoutTemplate size={14}/> 場地檔案</h3>
        <div className="flex gap-2">
          <button onClick={() => exportVenueJSON(seats, backgroundImage)} className="flex-1 bg-slate-700 text-white text-xs py-2 rounded hover:bg-slate-600 flex items-center justify-center gap-1">
            <FileDown size={14}/> 匯出
          </button>
          <button onClick={() => venueInputRef.current?.click()} className="flex-1 bg-white border border-slate-300 text-slate-700 text-xs py-2 rounded hover:bg-slate-50 flex items-center justify-center gap-1">
            <Upload size={14}/> 載入
          </button>
          <input type="file" ref={venueInputRef} onChange={handleImportVenue} className="hidden" accept=".json" />
        </div>
      </div>

      {/* 2. 座位編號 */}
      <div className="p-4 border-b border-blue-100 bg-white/50">
        <h3 className="text-xs font-bold text-blue-800 mb-2 flex items-center gap-1"><Hash size={14}/> 座位編號</h3>
        <div className="flex gap-2 mb-2 text-xs">
           <select className="flex-1 border p-1 rounded" value={numMode} onChange={(e: any) => setNumMode(e.target.value)}>
               <option value="center">前/中優先</option>
               <option value="top-left">左上優先</option>
               <option value="distance">距離優先</option>
           </select>
           <select className="flex-1 border p-1 rounded" value={numFormat} onChange={(e: any) => setNumFormat(e.target.value)}>
               <option value="row-col">行-列 (Row-Col)</option>
               <option value="sequence">單一序號</option>
           </select>
        </div>
        <div className="flex gap-2">
            <button onClick={() => autoNumberSeats(numMode, numFormat)} className="flex-1 bg-blue-100 text-blue-700 border border-blue-200 text-xs py-1.5 rounded hover:bg-blue-200 transition">自動編號</button>
            <button 
                onClick={() => isNumbering ? stopNumberSequence() : startNumberSequence(1)}
                className={`flex-1 text-xs py-1.5 rounded transition border ${isNumbering ? 'bg-red-500 text-white border-red-600 animate-pulse' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
            >
                {isNumbering ? '🛑 停止手動點選' : '👆 手動點選編號'}
            </button>
        </div>
      </div>

      {/* 3. 座位優先度 */}
      <div className="p-4 border-b border-blue-100">
        <h3 className="text-xs font-bold text-blue-800 mb-2 flex items-center gap-1"><Star size={14}/> 座位優先度</h3>
        <div className="flex gap-2 mb-2 text-xs">
           <select className="flex-1 border p-1 rounded" value={priMode} onChange={(e: any) => setPriMode(e.target.value)}>
               <option value="center">前/中優先</option>
               <option value="top-left">左上優先</option>
               <option value="distance">距離優先</option>
           </select>
           <button onClick={() => autoPrioritySeats(priMode)} className="flex-1 bg-amber-100 text-amber-700 border border-amber-200 text-xs py-1.5 rounded hover:bg-amber-200 transition">自動設定</button>
        </div>
        <button 
            onClick={() => isSequencing ? stopRankSequence() : startRankSequence(1)} 
            className={`w-full text-xs py-1.5 rounded transition border ${isSequencing ? 'bg-red-500 text-white border-red-600 animate-pulse' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
        >
            {isSequencing ? '🛑 停止手動點選' : '👆 依序點選排序'}
        </button>
      </div>

      {/* 4. 區塊配置 */}
      <div className="p-4">
        <div className="flex justify-between items-end mb-2">
            <h3 className="text-xs font-bold text-blue-800 flex items-center gap-1"><Layers size={14}/> 區塊配置</h3>
            <span className="text-[10px] text-slate-500">已選: {selectedSeatIds.length} 個座位</span>
        </div>
        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
             <button 
                 onClick={() => setSeatZone(selectedSeatIds, '')}
                 disabled={selectedSeatIds.length === 0}
                 className="flex items-center text-left border rounded p-1.5 text-xs hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed bg-slate-50 transition"
             >
                 <span className="w-3 h-3 rounded-full bg-slate-300 mr-2 shrink-0 border border-slate-400"></span>
                 <span className="truncate flex-1">清除區塊</span>
                 <span className="text-slate-400 text-[10px] ml-1">{seats.filter(s => !s.zoneCategory && s.type === 'seat').length}</span>
             </button>
             {categories.map(cat => {
                 const count = seats.filter(s => s.zoneCategory === cat.label).length;
                 return (
                     <button 
                         key={cat.id} 
                         onClick={() => setSeatZone(selectedSeatIds, cat.label)}
                         disabled={selectedSeatIds.length === 0}
                         className="flex items-center text-left border rounded p-1.5 text-xs bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                         title={cat.label}
                     >
                         <span className="w-3 h-3 rounded-full mr-2 shrink-0 border border-slate-200" style={{backgroundColor: cat.color}}></span>
                         <span className="truncate flex-1">{cat.label}</span>
                         <span className="font-mono text-[10px] text-slate-400 ml-1">{count}</span>
                     </button>
                 );
             })}
        </div>
      </div>

    </div>
  );
};