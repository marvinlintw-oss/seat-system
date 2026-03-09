// src/components/Modals/CategoryModal.tsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useProjectStore } from '../../store/useProjectStore';
import { X, Plus, Trash2, Info } from 'lucide-react';
import type { Category } from '../../types';

interface Props { isOpen: boolean; onClose: () => void; }

export const CategoryModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { categories, setCategories, personnel, setPersonnel, sessions } = useProjectStore();
  const [localCategories, setLocalCategories] = useState<Category[]>([]);

  // 每次打開視窗時，深拷貝一份目前的類別資料來編輯，避免直接污染大腦
  useEffect(() => {
    if (isOpen) {
        setLocalCategories(JSON.parse(JSON.stringify(categories)));
    }
  }, [isOpen, categories]);

  if (!isOpen) return null;

  const handleAdd = () => {
    const newCat: Category = {
        id: `cat-${Date.now()}`,
        label: `新類別 ${localCategories.length + 1}`,
        weight: 50,
        color: '#cbd5e1',
        personColor: '#f8fafc'
    };
    setLocalCategories([...localCategories, newCat]);
  };

  const handleUpdate = (id: string, field: keyof Category, value: any) => {
    setLocalCategories(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleRemove = (id: string) => {
    if (window.confirm('確定刪除此類別嗎？(已套用此類別的人員將會變成無類別)')) {
        setLocalCategories(prev => prev.filter(c => c.id !== id));
    }
  };

  const handleSave = () => {
    const updatedPersonnel = [...personnel];
    const updatedSessions = JSON.parse(JSON.stringify(sessions));

    // 【核心修復】全域名稱連動引擎
    localCategories.forEach(localCat => {
        const oldCat = categories.find(c => c.id === localCat.id);
        const newLabel = localCat.label.trim();
        
        // 如果類別改名了，同步更新人員名單與所有畫布區塊
        if (oldCat && oldCat.label !== newLabel && newLabel !== '') {
            // 1. 同步更新人員名單
            updatedPersonnel.forEach(p => {
                if (p.category === oldCat.label) p.category = newLabel;
            });
            // 2. 同步更新所有場次的座位與拍照站位
            updatedSessions.forEach((s: any) => {
                s.venue.seats.forEach((seat: any) => {
                    if (seat.zoneCategory === oldCat.label) seat.zoneCategory = newLabel;
                });
                s.photoBatches?.forEach((batch: any) => {
                    batch.spots.forEach((spot: any) => {
                        if (spot.zoneCategory === oldCat.label) spot.zoneCategory = newLabel;
                    });
                });
            });
        }
    });

    // 過濾掉空白標籤，避免產生無效類別
    const finalCategories = localCategories
        .filter(c => c.label.trim() !== '')
        .map(c => ({ ...c, label: c.label.trim() }));

    // 將更新後的人員、場地、與最新類別寫回大腦
    setPersonnel(updatedPersonnel);
    useProjectStore.setState({ sessions: updatedSessions });
    setCategories(finalCategories);
    
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh]">
         
         <div className="p-4 border-b flex justify-between items-center shrink-0 bg-slate-50 rounded-t-xl">
           <h2 className="font-bold text-lg text-slate-800">類別與顏色設定</h2>
           <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full text-slate-500 transition"><X size={20}/></button>
         </div>
         
         <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-50/50">
           {localCategories.map((cat) => (
             <div key={cat.id} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md transition">
                <div className="flex-1">
                  <input 
                      type="text" 
                      value={cat.label} 
                      onChange={e => handleUpdate(cat.id, 'label', e.target.value)} 
                      className="w-full outline-none font-bold text-slate-700 bg-transparent px-1 py-1 focus:ring-2 focus:ring-blue-100 rounded" 
                      placeholder="輸入類別名稱"
                  />
                </div>
                <div className="w-20 relative">
                  <span className="absolute -top-3 left-1 text-[9px] text-slate-400 bg-white px-1">權重</span>
                  <input 
                      type="number" 
                      value={cat.weight} 
                      onChange={e => handleUpdate(cat.id, 'weight', Number(e.target.value))} 
                      className="w-full border border-slate-200 rounded px-2 py-1.5 text-center text-sm outline-none focus:border-blue-400" 
                      title="自動排位權重 (數字越大越前排)"
                  />
                </div>
                
                {/* 區塊顏色 */}
                <div className="flex flex-col items-center gap-1" title="畫布區塊的底色">
                  <span className="text-[9px] text-slate-400">區塊色</span>
                  <div className="w-10 h-8 rounded border border-slate-200 overflow-hidden relative shadow-inner cursor-pointer">
                    <input type="color" value={cat.color} onChange={e => handleUpdate(cat.id, 'color', e.target.value)} className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer"/>
                  </div>
                </div>

                {/* 名牌顏色 */}
                <div className="flex flex-col items-center gap-1" title="人員名牌的底色">
                  <span className="text-[9px] text-slate-400">名牌色</span>
                  <div className="w-10 h-8 rounded border border-slate-200 overflow-hidden relative shadow-inner cursor-pointer">
                    <input type="color" value={cat.personColor || cat.color} onChange={e => handleUpdate(cat.id, 'personColor', e.target.value)} className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer"/>
                  </div>
                </div>
                
                <button onClick={() => handleRemove(cat.id)} className="p-2 mt-4 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={16}/></button>
             </div>
           ))}
           <button onClick={handleAdd} className="w-full py-4 border-2 border-dashed border-slate-300 text-slate-500 rounded-lg font-bold hover:bg-slate-100 hover:border-slate-400 transition flex items-center justify-center gap-2 mt-2">
             <Plus size={18}/> 新增類別
           </button>
         </div>

         <div className="p-4 border-t border-slate-200 bg-white flex justify-between items-center shrink-0 rounded-b-xl">
           <div className="text-xs text-blue-700 flex items-center gap-1.5 font-bold bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
             <Info size={14} className="text-blue-500"/> 提示：點擊名稱即可修改。修改名稱會自動同步更新畫布與人員名單。
           </div>
           <button onClick={handleSave} className="bg-blue-600 text-white px-8 py-2.5 rounded-lg font-bold hover:bg-blue-700 shadow-sm transition flex items-center gap-2">
               完成儲存
           </button>
         </div>
      </div>
    </div>,
    document.body
  );
};