// src/components/Modals/CategoryModal.tsx
import React from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { X, Plus, Trash2 } from 'lucide-react';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({ isOpen, onClose }) => {
  const { categories, updateCategory, addCategory, removeCategory, personnel, setPersonnel } = useProjectStore();

  if (!isOpen) return null;

  // 【核心邏輯 1】連動更新：當改了類別名稱，必須把已經套用該類別的人員和座位一起改掉！
  const handleLabelChange = (id: string, oldLabel: string, newLabel: string) => {
    const trimmed = newLabel.trim();
    if (!trimmed || trimmed === oldLabel) return;
    
    // 1. 更新類別本身
    updateCategory(id, { label: trimmed });
    
    // 2. 更新所有人員身上的類別
    const updatedPersonnel = personnel.map(p => 
       p.category === oldLabel ? { ...p, category: trimmed } : p
    );
    setPersonnel(updatedPersonnel);
    
    // 3. 更新所有場次的座位區塊屬性 (直接對大水庫發號施令)
    const state = useProjectStore.getState();
    useProjectStore.setState({
        sessions: state.sessions.map(s => ({
            ...s,
            venue: {
                ...s.venue,
                seats: s.venue.seats.map(seat => 
                    seat.zoneCategory === oldLabel ? { ...seat, zoneCategory: trimmed } : seat
                )
            }
        }))
    });
  };

  // 【核心邏輯 2】顏色連動：改區塊顏色時，名牌顏色自動跟上 (除非後來手動改名牌顏色)
  const handleColorChange = (id: string, newColor: string, isZone: boolean) => {
      if (isZone) {
          // 改區塊顏色，順便把預設的名牌顏色也設為一樣
          updateCategory(id, { color: newColor, personColor: newColor });
      } else {
          // 獨立改名牌顏色
          updateCategory(id, { personColor: newColor });
      }
  };

  const handleAdd = () => {
      const newId = `cat-${Date.now()}`;
      addCategory({ id: newId, label: '新類別', color: '#cbd5e1', personColor: '#cbd5e1', weight: 0 });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-[700px] max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800">類別與顏色設定</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500"><X size={20}/></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
           {/* 標題列 */}
           <div className="flex gap-3 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <div className="flex-1">類別名稱 (可點擊修改)</div>
              <div className="w-20 text-center">優先權重</div>
              <div className="w-24 text-center">區塊顏色</div>
              <div className="w-24 text-center">名牌顏色</div>
              <div className="w-10"></div>
           </div>

           {/* 類別列表 */}
           {categories.sort((a,b) => b.weight - a.weight).map(cat => (
              <div key={cat.id} className="flex gap-3 items-center bg-slate-50 p-2 rounded border border-slate-200 hover:border-blue-300 transition focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                  {/* 名稱編輯 */}
                  <input 
                     type="text" 
                     defaultValue={cat.label} 
                     onBlur={(e) => handleLabelChange(cat.id, cat.label, e.target.value)}
                     onKeyDown={(e) => { 
                         if(e.nativeEvent.isComposing) return; // 防範中文選字衝突
                         if(e.key === 'Enter') e.currentTarget.blur(); 
                     }}
                     className="flex-1 bg-transparent border-0 px-2 py-1.5 text-sm font-bold text-slate-700 outline-none"
                  />
                  
                  {/* 權重編輯 */}
                  <input 
                     type="number" 
                     value={cat.weight} 
                     onChange={(e) => updateCategory(cat.id, { weight: Number(e.target.value) })}
                     className="w-20 bg-white border border-slate-300 rounded px-2 py-1 text-sm text-center outline-none focus:border-blue-500"
                  />
                  
                  {/* 區塊顏色 */}
                  <div className="w-24 flex justify-center">
                      <input 
                         type="color" 
                         value={cat.color} 
                         onChange={(e) => handleColorChange(cat.id, e.target.value, true)}
                         className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                         title="區塊底色"
                      />
                  </div>

                  {/* 名牌顏色 (預設等同區塊顏色) */}
                  <div className="w-24 flex justify-center">
                      <input 
                         type="color" 
                         value={cat.personColor || cat.color} 
                         onChange={(e) => handleColorChange(cat.id, e.target.value, false)}
                         className="w-8 h-8 rounded cursor-pointer border-0 p-0 shadow-sm"
                         title="座位上的名牌顏色"
                      />
                  </div>

                  {/* 刪除按鈕 */}
                  <div className="w-10 flex justify-center">
                      <button onClick={() => { if(window.confirm('確定刪除此類別？')) removeCategory(cat.id); }} className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition">
                          <Trash2 size={16}/>
                      </button>
                  </div>
              </div>
           ))}
           
           <button onClick={handleAdd} className="w-full mt-4 py-3 border-2 border-dashed border-slate-300 text-slate-500 font-bold rounded-lg hover:bg-slate-50 hover:border-blue-400 hover:text-blue-500 transition flex items-center justify-center gap-2">
              <Plus size={18}/> 新增類別
           </button>
        </div>
        
        <div className="p-4 border-t border-slate-200 bg-blue-50 rounded-b-xl flex justify-between items-center text-xs text-blue-700">
           <span>💡 提示：點擊名稱即可修改。修改名稱會自動同步更新畫布與人員名單。</span>
           <button onClick={onClose} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded shadow transition">
              完成
           </button>
        </div>
      </div>
    </div>
  );
};