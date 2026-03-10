// src/components/Modals/ExportOptionsModal.tsx
import React, { useState } from 'react';
import { X, Download, Image as ImageIcon } from 'lucide-react';

export interface ExportOptions {
  fontScale: number;
  exportTitle: boolean;
  exportTime: boolean;
  includeSerialNumber: boolean; // 🟢 新增：是否匯出序號
  includePhotoBadges: boolean;  // 🟢 新增：是否匯出拍照徽章
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: ExportOptions) => void;
  title?: string;
}

export const ExportOptionsModal: React.FC<Props> = ({ isOpen, onClose, onConfirm, title }) => {
  const [fontScale, setFontScale] = useState(1);
  const [exportTitle, setExportTitle] = useState(true);
  const [exportTime, setExportTime] = useState(true);
  
  // 🟢 預設都勾選
  const [includeSerialNumber, setIncludeSerialNumber] = useState(true);
  const [includePhotoBadges, setIncludePhotoBadges] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <ImageIcon size={20} className="text-blue-600" /> {title || '匯出高畫質圖檔'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-full text-slate-500 transition"><X size={18} /></button>
        </div>
        
        <div className="p-6 space-y-6 bg-white">
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-700">選擇畫質解析度</label>
            <div className="grid grid-cols-3 gap-3">
               {[1, 1.5, 2].map(scale => (
                 <button
                   key={scale}
                   onClick={() => setFontScale(scale)}
                   className={`py-2 rounded-lg border font-bold text-sm transition-colors ${fontScale === scale ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                 >
                   {scale}x {scale === 2 ? '(極清)' : ''}
                 </button>
               ))}
            </div>
          </div>

          <div className="space-y-3">
             <label className="text-sm font-bold text-slate-700">版面顯示設定</label>
             <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                   <input type="checkbox" checked={exportTitle} onChange={e => setExportTitle(e.target.checked)} className="w-4 h-4 accent-blue-600" />
                   <span className="text-sm font-medium text-slate-700">顯示左上角活動標題 (加大字體)</span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                   <input type="checkbox" checked={exportTime} onChange={e => setExportTime(e.target.checked)} className="w-4 h-4 accent-blue-600" />
                   <span className="text-sm font-medium text-slate-700">顯示出圖時間</span>
                </label>
                
                {/* 🟢 補回來的兩個選項 */}
                <div className="h-px bg-slate-100 my-2"></div>
                <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                   <input type="checkbox" checked={includeSerialNumber} onChange={e => setIncludeSerialNumber(e.target.checked)} className="w-4 h-4 accent-blue-600" />
                   <span className="text-sm font-medium text-slate-700">顯示座位左上角序號</span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                   <input type="checkbox" checked={includePhotoBadges} onChange={e => setIncludePhotoBadges(e.target.checked)} className="w-4 h-4 accent-blue-600" />
                   <span className="text-sm font-medium text-slate-700">顯示下方拍照參與情形徽章</span>
                </label>
             </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition">取消</button>
          
          <button onClick={() => { 
              onConfirm({ fontScale, exportTitle, exportTime, includeSerialNumber, includePhotoBadges }); 
              onClose(); 
          }} className="px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition flex items-center gap-2">
            <Download size={18}/> 確認匯出
          </button>
        </div>
      </div>
    </div>
  );
};