// src/components/PersonnelSidebar.tsx
import React, { useState, useRef } from 'react';
import { usePersonnelStore } from '../store/usePersonnelStore';
import { useVenueStore } from '../store/useVenueStore';
import { useSystemStore } from '../store/useSystemStore';
import { PersonnelBatchModal } from './PersonnelBatchModal'; 
import { User, CheckCircle2, Crown, LayoutGrid, Plus, Upload, Save, Settings2, Table, FileDown, Download, X, FolderOpen, Palette, Trash2 } from 'lucide-react';
import Papa from 'papaparse';

// 新增：類別管理 Modal
const CategoryManagerModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { categories, addCategory, updateCategory, removeCategory } = useSystemStore();
    const [newLabel, setNewLabel] = useState('');
    const [newWeight, setNewWeight] = useState(50);
    const [newColor, setNewColor] = useState('#e2e8f0');

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center">
            <div className="bg-white w-96 rounded-lg shadow-xl p-4 max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-700">類別與顏色管理</h3>
                    <button onClick={onClose}><X size={18}/></button>
                </div>
                
                <div className="bg-slate-50 p-3 rounded mb-4 border border-slate-200">
                    <input className="w-full border p-1 text-sm mb-2 rounded" placeholder="類別名稱" value={newLabel} onChange={e=>setNewLabel(e.target.value)} />
                    <div className="flex gap-2 mb-2">
                        <input type="number" className="w-20 border p-1 text-sm rounded" placeholder="權重" value={newWeight} onChange={e=>setNewWeight(Number(e.target.value))} />
                        <div className="flex-1 flex items-center gap-2">
                             <input type="color" className="w-8 h-8 p-0 border rounded cursor-pointer" value={newColor} onChange={e=>setNewColor(e.target.value)}/>
                             <span className="text-xs text-slate-500">區塊色</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => { if(newLabel) { addCategory(newLabel, newWeight, newColor, '#ffffff'); setNewLabel(''); }}}
                        className="w-full bg-blue-600 text-white text-xs py-1.5 rounded"
                    >
                        新增類別
                    </button>
                </div>

                <div className="space-y-2">
                    {categories.map(cat => (
                        <div key={cat.id} className="flex items-center gap-2 border-b pb-2">
                            <input type="color" className="w-6 h-6 rounded overflow-hidden border-0 cursor-pointer" value={cat.color} onChange={(e) => updateCategory(cat.id, { color: e.target.value })} title="座位區塊色" />
                            <div className="flex-1">
                                <input className="w-full text-sm font-bold bg-transparent outline-none" value={cat.label} onChange={(e) => updateCategory(cat.id, { label: e.target.value })} />
                                <div className="text-[10px] text-slate-400">權重: {cat.weight}</div>
                            </div>
                            <button onClick={() => removeCategory(cat.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export const PersonnelSidebar: React.FC = () => {
  const { personnel, autoArrangeByImportance, autoArrangeByPosition, resetSeating, addNewPerson, downloadCsvTemplate } = usePersonnelStore();
  
  const { 
      isEditMode, setEditMode, 
      startRankSequence, stopRankSequence, isSequencing, 
      autoRankSeats, exportVenueConfig, importVenueConfig, 
  } = useVenueStore();

  const { categories } = useSystemStore(); // 取得動態類別

  const unseated = personnel.filter(p => !p.isSeated);
  const seated = personnel.filter(p => p.isSeated);
  
  const csvInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);
  const venueInputRef = useRef<HTMLInputElement>(null);

  const [showExcelModal, setShowExcelModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  
  const [newName, setNewName] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newOrg, setNewOrg] = useState('');
  const [newCategory, setNewCategory] = useState(categories[0]?.label || ''); 
  const [newRank] = useState<number>(50);

  const handleDragStart = (e: React.DragEvent, personId: string) => {
    if (isEditMode) { e.preventDefault(); return; }
    e.dataTransfer.setData('personId', personId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName && newTitle) {
      addNewPerson(newName, newTitle, newOrg || '未指定', newCategory, newRank);
      setNewName(''); setNewTitle(''); setNewOrg(''); setIsAdding(false);
    }
  };

  const handleSaveProject = () => {
    const venueState = useVenueStore.getState();
    const systemState = useSystemStore.getState(); // 儲存專案也要包含類別設定
    const projectData = {
      version: '2.1',
      timestamp: new Date().toISOString(),
      personnel: usePersonnelStore.getState().personnel,
      venue: {
        seats: venueState.seats,
        backgroundImage: venueState.backgroundImage,
        stageScale: venueState.stageScale,
        stagePosition: venueState.stagePosition
      },
      categories: systemState.categories
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(projectData));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `project-full-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleLoadProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (window.confirm('讀取專案將會覆蓋目前所有進度，確定要繼續嗎？')) {
          usePersonnelStore.setState({ personnel: json.personnel });
          if(json.categories) useSystemStore.setState({ categories: json.categories });
          useVenueStore.setState({
            seats: json.venue.seats,
            backgroundImage: json.venue.backgroundImage,
            stageScale: json.venue.stageScale || 1,
            stagePosition: json.venue.stagePosition || { x: 0, y: 0 },
            history: [] 
          });
          usePersonnelStore.getState().syncSeatingStatus();
        }
      } catch (err) { alert('讀取失敗：檔案可能已損毀'); }
    };
    reader.readAsText(file);
    if (projectInputRef.current) projectInputRef.current.value = '';
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (results: any) => {
        const rows = results.data;
        let count = 0;
        rows.forEach((row: any) => {
          const name = row['Name'] || row['姓名'] || row['範例姓名'];
          const title = row['Title'] || row['職稱'] || row['範例職稱'] || '貴賓';
          const org = row['Org'] || row['單位'] || row['範例單位'] || '';
          const rank = parseInt(row['Rank'] || row['權重'] || row['權重分數'] || row['範例權重']) || 50;
          const category = row['Category'] || row['類別'] || row['範例類別'] || '匯入';
          if (name) { addNewPerson(name, title, org, category, rank); count++; }
        });
        alert(`成功匯入 ${count} 筆資料！`);
      },
      error: (err: any) => alert('CSV 解析失敗: ' + err.message)
    });
    if (csvInputRef.current) csvInputRef.current.value = '';
  };

  return (
    <>
      <div className="w-96 bg-white border-l border-slate-200 h-full flex flex-col shadow-xl z-20 shrink-0 select-none">
        <input type="file" ref={csvInputRef} onChange={handleCSVUpload} className="hidden" accept=".csv" />
        <input type="file" ref={projectInputRef} onChange={handleLoadProject} className="hidden" accept=".json" />
        <input type="file" ref={venueInputRef} onChange={(e) => {
             const file = e.target.files?.[0];
             if(file) {
                 const reader = new FileReader();
                 reader.onload = (ev) => importVenueConfig(ev.target?.result as string);
                 reader.readAsText(file);
             }
        }} className="hidden" accept=".json" />

        <div className="bg-slate-800 text-white p-3 flex justify-between items-center shadow-md">
            <div className="flex items-center gap-2">
                <Settings2 size={18} className="text-blue-400"/>
                <span className="font-bold text-sm tracking-wide">系統模式</span>
            </div>
            <div className="flex bg-slate-700 rounded p-1 border border-slate-600">
                <button 
                   onClick={() => setEditMode(false)}
                   className={`px-3 py-1 text-xs rounded transition-all font-medium ${!isEditMode ? 'bg-white text-slate-900 shadow' : 'text-slate-400 hover:text-white'}`}
                >
                   人員排位
                </button>
                <button 
                   onClick={() => setEditMode(true)}
                   className={`px-3 py-1 text-xs rounded transition-all font-medium ${isEditMode ? 'bg-blue-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                   場地編輯
                </button>
            </div>
        </div>

        {isEditMode ? (
            <div className="bg-blue-50 border-b border-blue-200 p-4 animate-in slide-in-from-top-2 duration-300">
                <h3 className="text-xs font-bold text-blue-800 mb-2 uppercase tracking-wider">場地與座位工具</h3>
                <div className="grid grid-cols-2 gap-2 mb-3">
                    <button onClick={autoRankSeats} className="bg-white border border-blue-200 text-blue-700 text-xs py-2 rounded hover:bg-blue-100 transition shadow-sm">
                        🔄 自動權重 (前至後)
                    </button>
                    <button 
                        onClick={() => isSequencing ? stopRankSequence() : startRankSequence(1)} 
                        className={`text-xs py-2 rounded transition shadow-sm font-bold border ${isSequencing ? 'bg-red-500 text-white border-red-600 animate-pulse' : 'bg-white border-blue-200 text-blue-700 hover:bg-blue-100'}`}
                    >
                        {isSequencing ? '🛑 停止排序' : '👆 序列點選排序'}
                    </button>
                </div>
                <div className="flex gap-2">
                    <button onClick={exportVenueConfig} className="flex-1 bg-slate-700 text-white text-xs py-2 rounded hover:bg-slate-600 flex items-center justify-center gap-1">
                        <FileDown size={14}/> 匯出場地檔
                    </button>
                    <button onClick={() => venueInputRef.current?.click()} className="flex-1 bg-white border border-slate-300 text-slate-700 text-xs py-2 rounded hover:bg-slate-50 flex items-center justify-center gap-1">
                        <Upload size={14}/> 載入場地檔
                    </button>
                </div>
                <div className="mt-2 text-[10px] text-slate-500 text-center">
                    提示：選取座位後按 Del 刪除，Ctrl+C/V 複製貼上
                </div>
            </div>
        ) : (
            <div className="bg-slate-50 border-b border-slate-200 p-4">
                 <h3 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">自動排位功能</h3>
                 <div className="grid grid-cols-2 gap-2 mb-2">
                    <button onClick={autoArrangeByImportance} className="bg-indigo-50 text-indigo-700 text-xs py-2 rounded hover:bg-indigo-100 transition flex items-center justify-center gap-1 font-medium border border-indigo-200">
                      <Crown size={14} /> 依重要度
                    </button>
                    <button onClick={autoArrangeByPosition} className="bg-blue-50 text-blue-700 text-xs py-2 rounded hover:bg-blue-100 transition flex items-center justify-center gap-1 font-medium border border-blue-200">
                      <LayoutGrid size={14} /> 依位置
                    </button>
                  </div>
                  <button onClick={resetSeating} className="w-full border border-slate-300 text-slate-600 text-xs py-1.5 rounded hover:bg-slate-100 transition">
                      重置所有人員排位
                  </button>
            </div>
        )}

        <div className="p-3 border-b border-slate-200 flex gap-2">
            <button onClick={handleSaveProject} className="flex-1 bg-slate-800 text-white text-xs py-2 rounded hover:bg-slate-700 transition flex items-center justify-center gap-2" title="儲存完整專案">
              <Save size={14} /> 儲存專案
            </button>
            <button onClick={() => projectInputRef.current?.click()} className="flex-1 bg-white border border-slate-300 text-slate-700 text-xs py-2 rounded hover:bg-slate-50 transition flex items-center justify-center gap-2" title="讀取 .json">
              <FolderOpen size={14} /> 讀取專案
            </button>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-white">
                <div className="flex justify-between items-center mb-3">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2">
                        <User className="text-blue-600" size={20}/> 人員名單
                    </h2>
                    <div className="flex gap-1">
                        <button onClick={() => csvInputRef.current?.click()} className="text-slate-500 hover:text-green-600 p-1" title="匯入 CSV"><Upload size={18}/></button>
                        <button onClick={downloadCsvTemplate} className="text-slate-500 hover:text-blue-600 p-1" title="下載 CSV 範本"><Download size={18}/></button>
                    </div>
                </div>

                <div className="flex gap-2 mb-2">
                  <button onClick={() => setShowExcelModal(true)} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-1.5 rounded text-xs flex justify-center items-center gap-1">
                    <Table size={14}/> Excel 編輯
                  </button>
                  <button onClick={() => setShowCategoryModal(true)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 rounded text-xs flex justify-center items-center gap-1 border border-slate-200">
                    <Palette size={14}/> 類別顏色
                  </button>
                </div>

                {!isAdding ? (
                   <button onClick={() => setIsAdding(true)} className="w-full text-xs text-slate-500 hover:text-blue-600 border border-dashed border-slate-300 rounded p-2 hover:bg-blue-50 transition flex items-center justify-center gap-1">
                     <Plus size={14} /> 快速新增單筆
                   </button>
                ) : (
                   <form onSubmit={handleSubmit} className="bg-slate-50 p-2 rounded border border-blue-200 text-xs">
                       <div className="flex justify-between mb-2"><span className="font-bold text-blue-600">新增資料</span><button type="button" onClick={() => setIsAdding(false)}><X size={14}/></button></div>
                       <input placeholder="姓名" value={newName} onChange={e => setNewName(e.target.value)} className="w-full border rounded px-2 py-1 mb-1" autoFocus />
                       <input placeholder="職稱" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full border rounded px-2 py-1 mb-1" />
                       <input placeholder="單位" value={newOrg} onChange={e => setNewOrg(e.target.value)} className="w-full border rounded px-2 py-1 mb-1" />
                       <select value={newCategory} onChange={e => setNewCategory(e.target.value)} className="w-full border rounded px-2 py-1 mb-2 bg-white">
                          {categories.map(c => <option key={c.id} value={c.label}>{c.label}</option>)}
                       </select>
                       <button type="submit" className="w-full bg-blue-600 text-white py-1 rounded">確認</button>
                   </form>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex justify-between">
                        待安排 ({unseated.length})
                    </h3>
                    <div className="space-y-2">
                        {unseated.map(person => (
                            <div 
                                key={person.id} 
                                draggable={!isEditMode} 
                                onDragStart={(e) => handleDragStart(e, person.id)} 
                                className={`bg-white border p-3 rounded-lg shadow-sm flex items-center gap-3 transition relative group
                                    ${isEditMode ? 'opacity-50 cursor-not-allowed border-slate-200' : 'cursor-grab active:cursor-grabbing hover:border-blue-400 hover:shadow-md border-slate-200'}`}
                            >
                                <div className="bg-yellow-100 p-2 rounded-full shrink-0"><User className="text-yellow-600 fill-yellow-400" size={16} /></div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-slate-800 truncate text-sm">{person.name}</div>
                                    <div className="text-xs text-slate-500 truncate">{person.organization} | {person.title}</div>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded mb-1">{person.category}</span>
                                    <span className="text-xs font-mono font-bold text-blue-600">{person.rankScore}</span>
                                </div>
                            </div>
                        ))}
                        {unseated.length === 0 && <div className="text-center text-slate-400 text-xs py-4">所有人員已入座</div>}
                    </div>
                </div>

                <div>
                     <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">已排座 ({seated.length})</h3>
                     <div className="space-y-1">
                      {seated.map(person => (
                        <div key={person.id} className="flex items-center gap-2 p-2 bg-white/50 rounded border border-transparent hover:border-slate-200">
                          <CheckCircle2 className="text-green-500 shrink-0" size={14} />
                          <span className="text-xs font-medium text-slate-600 truncate flex-1">{person.name}</span>
                          <span className="text-[10px] text-slate-400">{person.organization}</span>
                        </div>
                      ))}
                     </div>
                </div>
            </div>
        </div>
      </div>

      {showExcelModal && <PersonnelBatchModal onClose={() => setShowExcelModal(false)} />}
      {showCategoryModal && <CategoryManagerModal onClose={() => setShowCategoryModal(false)} />}
    </>
  );
};