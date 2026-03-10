// src/components/Modals/ExportOptionsModal.tsx
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckSquare, Square, Download } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: ExportOptions) => void;
  title: string;
}

export interface ExportOptions {
  includeSerialNumber: boolean;
  includePhotoBadges: boolean;
  fontScale: number;
}

const FONT_SCALE_OPTIONS = [
  { label: '標準 (1x)', value: 1 },
  { label: '放大 (1.25x) - 建議長官用', value: 1.25 },
  { label: '特大 (1.5x)', value: 1.5 },
  { label: '超大 (2x)', value: 2 },
];

export const ExportOptionsModal: React.FC<Props> = ({ isOpen, onClose, onConfirm, title }) => {
  const [options, setOptions] = useState<ExportOptions>({
    includeSerialNumber: true,
    includePhotoBadges: false, // 🟢 預設關閉附註小標籤 (拍照徽章)，不放進輸出圖中
    fontScale: 1.25, 
  });

  if (!isOpen) return null;

  const toggleOption = (key: keyof Omit<ExportOptions, 'fontScale'>) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden border border-slate-100 animate-in fade-in-0 zoom-in-95 duration-200">
        
        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
          <h2 className="font-bold text-lg text-slate-800">匯出高解析度圖表 ({title})</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-full text-slate-500 transition"><X size={20}/></button>
        </div>

        <div className="p-6 space-y-5">
            <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">內容選項</h3>
                <button onClick={() => toggleOption('includeSerialNumber')} className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-xl border hover:border-blue-300 transition hover:bg-blue-50/50">
                    {options.includeSerialNumber ? <CheckSquare className="text-blue-600"/> : <Square className="text-slate-300"/>}
                    <div className="text-left">
                        <div className="font-bold text-slate-700 text-sm">匯出人員序號</div>
                        <div className="text-xs text-slate-500">若需保護個資可關閉此項</div>
                    </div>
                </button>
                <button onClick={() => toggleOption('includePhotoBadges')} className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-xl border hover:border-blue-300 transition hover:bg-blue-50/50">
                    {options.includePhotoBadges ? <CheckSquare className="text-blue-600"/> : <Square className="text-slate-300"/>}
                    <div className="text-left">
                        <div className="font-bold text-slate-700 text-sm">匯出拍照梯次徽章 (小標籤)</div>
                        <div className="text-xs text-slate-500">預設不顯示，以保持畫面乾淨</div>
                    </div>
                </button>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">🟢 給長官的貼心設定</h3>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                    <label className="text-sm font-bold text-slate-700 block">名牌文字放大倍率</label>
                    <select 
                        value={options.fontScale}
                        onChange={(e) => setOptions(prev => ({...prev, fontScale: Number(e.target.value)}))}
                        className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                    >
                        {FONT_SCALE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <p className="text-xs text-emerald-700 font-medium pt-1">💡 提示：字體放大時，系統會自動處理「行-列」編號模式下的斷行，確保不遮擋。</p>
                </div>
            </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-200 transition">取消</button>
          <button 
            onClick={() => { onConfirm(options); onClose(); }} 
            className="flex items-center gap-2 bg-blue-600 text-white px-8 py-2.5 rounded-lg font-bold hover:bg-blue-700 shadow-sm transition"
          >
              <Download size={18}/> 開始匯出 SVG
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};