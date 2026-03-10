// src/components/Modals/CategoryModal.tsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useProjectStore } from '../../store/useProjectStore';
import { DEFAULT_COLORS } from '../../utils/constants'; 
import { X, Plus, Trash2, Info, GripVertical } from 'lucide-react';
import type { Category } from '../../types';

interface Props { isOpen: boolean; onClose: () => void; }

export const CategoryModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { categories, setCategories, personnel, setPersonnel, sessions } = useProjectStore();
  const [localCategories, setLocalCategories] = useState<Category[]>([]);
  
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
        setLocalCategories(JSON.parse(JSON.stringify(categories)));
    }
  }, [isOpen, categories]);

  if (!isOpen) return null;

  const handleAdd = () => {
    const nextColor = DEFAULT_COLORS[localCategories.length % DEFAULT_COLORS.length];
    const newCat: Category = {
        id: `cat-${Date.now()}`,
        label: `新類別 ${localCategories.length + 1}`,
        weight: 50,
        color: nextColor,
        personColor: nextColor
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

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  // 🟢 修復提示：移除了沒有用到的 index 參數
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newList = [...localCategories];
    const [movedItem] = newList.splice(draggedIndex, 1);
    newList.splice(index, 0, movedItem);

    setLocalCategories(newList);
    setDraggedIndex(null);
  };

  const handleSave = () => {
    const updatedPersonnel = [...personnel];
    const updatedSessions = JSON.parse(JSON.stringify(sessions));

    localCategories.forEach(localCat => {
        const oldCat = categories.find(c => c.id === localCat.id);
        const newLabel = localCat.label.trim();
        
        if (oldCat && oldCat.label !== newLabel && newLabel !== '') {
            updatedPersonnel.forEach(p => {
                if (p.category === oldCat.label) p.category = newLabel;
            });
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

    const finalCategories = localCategories
        .filter(c => c.label.trim() !== '')
        .map(c => ({ ...c, label: c.label.trim() }));

    setPersonnel(updatedPersonnel);
    useProjectStore.setState({ sessions: updatedSessions });
    setCategories(finalCategories);
    
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh]">
         
         <div className="p-4 border-b flex justify-between items-center shrink-0 bg-slate-50 rounded-t-xl">
           <h2 className="font-bold text-lg text-slate-800">類別與顏色設定 (支援拖曳排序)</h2>
           <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full text-slate-500 transition"><X size={20}/></button>
         </div>
         
         <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/50">
           
           <div className="flex items-center gap-2 px-2 pb-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
               <div className="w-6"></div>
               <div className="flex-1 pl-1">類別名稱</div>
               <div className="w-20 text-center">排位權重</div>
               <div className="w-14 text-center">區塊色</div>
               <div className="w-14 text-center">名牌色</div>
               <div className="w-8"></div>
           </div>

           <div className="space-y-1.5">
             {localCategories.map((cat, index) => (
               <div 
                  key={cat.id} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  // 🟢 呼叫時也不需要傳 index 了
                  onDragOver={(e) => handleDragOver(e)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={() => setDraggedIndex(null)}
                  className={`flex items-center gap-2 bg-white p-1.5 rounded-lg border transition-all ${draggedIndex === index ? 'opacity-40 border-blue-400 shadow-md scale-[0.99]' : 'border-slate-200 shadow-sm hover:border-blue-300'}`}
               >
                  <div className="w-6 flex justify-center cursor-grab active:cursor-grabbing hover:bg-slate-100 p-1 rounded transition">
                     <GripVertical size={16} className="text-slate-400" />
                  </div>
                  
                  <div className="flex-1">
                    <input 
                        type="text" 
                        value={cat.label} 
                        onChange={e => handleUpdate(cat.id, 'label', e.target.value)} 
                        className="w-full outline-none font-bold text-slate-700 bg-transparent px-2 py-1.5 focus:ring-2 focus:ring-blue-100 rounded text-sm" 
                        placeholder="輸入類別名稱"
                    />
                  </div>
                  
                  <div className="w-20">
                    <input 
                        type="number" 
                        value={cat.weight} 
                        onChange={e => handleUpdate(cat.id, 'weight', Number(e.target.value))} 
                        className="w-full border border-slate-200 rounded px-2 py-1.5 text-center text-sm outline-none focus:border-blue-400 font-mono" 
                        title="數字越大越前排"
                    />
                  </div>
                  
                  <div className="w-14 flex justify-center">
                    <div className="w-7 h-7 rounded border border-slate-200 overflow-hidden shadow-inner cursor-pointer relative" title="畫布區塊的底色">
                      <input type="color" value={cat.color} onChange={e => handleUpdate(cat.id, 'color', e.target.value)} className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer"/>
                    </div>
                  </div>

                  <div className="w-14 flex justify-center">
                    <div className="w-7 h-7 rounded border border-slate-200 overflow-hidden shadow-inner cursor-pointer relative" title="人員名牌的底色">
                      <input type="color" value={cat.personColor || cat.color} onChange={e => handleUpdate(cat.id, 'personColor', e.target.value)} className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer"/>
                    </div>
                  </div>
                  
                  <button onClick={() => handleRemove(cat.id)} className="w-8 flex justify-center p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition">
                    <Trash2 size={16}/>
                  </button>
               </div>
             ))}
           </div>
           
           <button onClick={handleAdd} className="w-full py-3 mt-3 border-2 border-dashed border-slate-300 text-slate-500 rounded-lg font-bold hover:bg-slate-100 hover:border-slate-400 transition flex items-center justify-center gap-2 text-sm">
             <Plus size={16}/> 新增類別
           </button>
         </div>

         <div className="p-4 border-t border-slate-200 bg-white flex justify-between items-center shrink-0 rounded-b-xl">
           <div className="text-xs text-blue-700 flex items-center gap-1.5 font-bold bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
             <Info size={14} className="text-blue-500 shrink-0"/> 提示：按住最左側把手可拖曳排序。修改名稱會自動同步畫布與名單。
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