// src/components/Modals/GridGenerateModal.tsx
import React, { useState } from 'react';

interface GridGenerateModalProps {
  onClose: () => void;
  onConfirm: (rows: number, cols: number) => void;
}

export const GridGenerateModal: React.FC<GridGenerateModalProps> = ({ onClose, onConfirm }) => {
  const [batchRows, setBatchRows] = useState(3);
  const [batchCols, setBatchCols] = useState(5);

  return (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl w-80">
        <h3 className="text-lg font-bold mb-4">矩陣生成座位</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-600">排數 (1-10)</label>
            <input type="number" min="1" max="10" value={batchRows} onChange={(e) => setBatchRows(Number(e.target.value))} className="w-full border rounded px-3 py-2"/>
          </div>
          <div>
            <label className="text-sm text-slate-600">列數 (1-20)</label>
            <input type="number" min="1" max="20" value={batchCols} onChange={(e) => setBatchCols(Number(e.target.value))} className="w-full border rounded px-3 py-2"/>
          </div>
          <div className="flex gap-2 pt-2">
              <button onClick={onClose} className="flex-1 py-2 bg-slate-100 rounded hover:bg-slate-200">取消</button>
              <button onClick={() => onConfirm(batchRows, batchCols)} className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">開始放置</button>
          </div>
        </div>
      </div>
    </div>
  );
};