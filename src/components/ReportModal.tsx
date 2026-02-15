// src/components/ReportModal.tsx
import React from 'react';
import { useVenueStore } from '../store/useVenueStore';
import { usePersonnelStore } from '../store/usePersonnelStore';
import { X, Printer } from 'lucide-react';

interface ReportModalProps {
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ onClose }) => {
  const { seats } = useVenueStore();
  const { personnel } = usePersonnelStore();

  // 整理資料：只列出「已入座」的座位
  const assignedSeats = seats
    .filter(seat => seat.assignedPersonId)
    .map(seat => {
      const person = personnel.find(p => p.id === seat.assignedPersonId);
      return {
        seatLabel: seat.label,
        personName: person?.name || '未知',
        personTitle: person?.title || '',
        personOrg: person?.organization || '',
        category: person?.category || '',
      };
    })
    // 依照座號排序
    .sort((a, b) => parseInt(a.seatLabel) - parseInt(b.seatLabel));

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-auto py-10 print:p-0 print:bg-white print:static">
      <div className="bg-white w-[800px] min-h-[500px] rounded-xl shadow-2xl flex flex-col print:shadow-none print:w-full">
        
        {/* Header (螢幕顯示，列印時隱藏工具列) */}
        <div className="p-4 border-b border-slate-200 flex justify-between items-center print:hidden">
          <h2 className="text-xl font-bold text-slate-800">座位分配清單</h2>
          <div className="flex gap-2">
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            >
              <Printer size={18} /> 列印 / 存為 PDF
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded text-slate-500">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* 報表內容 (Printable Area) */}
        <div className="p-8 print:p-0">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">活動座位安排表</h1>
            <p className="text-sm text-slate-500">列印時間：{new Date().toLocaleString()}</p>
          </div>

          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 border-b-2 border-slate-300 print:bg-slate-100">
                <th className="py-3 px-4 text-left w-24">座位號</th>
                <th className="py-3 px-4 text-left">姓名</th>
                <th className="py-3 px-4 text-left">職稱</th>
                <th className="py-3 px-4 text-left">單位</th>
                <th className="py-3 px-4 text-left">類別</th>
              </tr>
            </thead>
            <tbody>
              {assignedSeats.map((item, idx) => (
                <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50 print:border-slate-300">
                  <td className="py-3 px-4 font-bold text-blue-800">{item.seatLabel}</td>
                  <td className="py-3 px-4 font-bold text-lg">{item.personName}</td>
                  <td className="py-3 px-4 text-slate-600">{item.personTitle}</td>
                  <td className="py-3 px-4 text-slate-600">{item.personOrg}</td>
                  <td className="py-3 px-4">
                    <span className="bg-slate-100 border border-slate-200 px-2 py-1 rounded text-xs">
                      {item.category}
                    </span>
                  </td>
                </tr>
              ))}
              {assignedSeats.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">目前尚無排位資料</td>
                </tr>
              )}
            </tbody>
          </table>
          
          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-slate-200 text-center text-xs text-slate-400 hidden print:block">
             系統產生報表 | 政府活動排位管理系統
          </div>
        </div>
      </div>
    </div>
  );
};