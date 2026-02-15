import React, { useState, useRef } from 'react';
import { usePersonnelStore, type Person } from '../store/usePersonnelStore'; // [修正] 加入 type
import { useVenueStore, type Seat } from '../store/useVenueStore'; // [修正] 加入 type
import { User, CheckCircle2, ArrowDownAZ, Plus, X, Upload, Printer, ArrowRightLeft, FileJson, FolderOpen } from 'lucide-react';
import Papa from 'papaparse';
import { ReportModal } from './ReportModal';

interface ProjectData {
  version: string;
  timestamp: string;
  personnel: Person[];
  venue: {
    seats: Seat[];
    backgroundImage: string | null;
    stageScale: number;
    stagePosition: { x: number; y: number };
  };
}

export const PersonnelSidebar: React.FC = () => {
  const { personnel, autoArrange, autoArrangeProtocol, resetSeating, addNewPerson } = usePersonnelStore();
  const unseated = personnel.filter(p => !p.isSeated);
  const seated = personnel.filter(p => p.isSeated);
  
  const csvInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [showReport, setShowReport] = useState(false);
  
  const [newName, setNewName] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newOrg, setNewOrg] = useState('');
  const [newCategory, setNewCategory] = useState('貴賓'); 
  const [newRank, setNewRank] = useState<number>(50);

  const handleDragStart = (e: React.DragEvent, personId: string) => {
    e.dataTransfer.setData('personId', personId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName && newTitle) {
      addNewPerson(newName, newTitle, newOrg || '未指定', newCategory, newRank);
      setNewName(''); setNewTitle(''); setNewOrg(''); setNewCategory('貴賓'); setNewRank(50);
      setIsAdding(false);
    }
  };

  const handleSaveProject = () => {
    const currentPersonnel = usePersonnelStore.getState().personnel;
    const venueState = useVenueStore.getState();

    const projectData: ProjectData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      personnel: currentPersonnel,
      venue: {
        seats: venueState.seats,
        backgroundImage: venueState.backgroundImage,
        stageScale: venueState.stageScale,
        stagePosition: venueState.stagePosition
      }
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(projectData));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `seating-project-${new Date().toISOString().slice(0, 10)}.json`);
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
        const json = JSON.parse(event.target?.result as string) as ProjectData;
        
        if (!json.personnel || !json.venue) {
          alert('錯誤：這似乎不是正確的專案檔案格式');
          return;
        }

        if (window.confirm('讀取專案將會覆蓋目前所有進度，確定要繼續嗎？')) {
          usePersonnelStore.setState({ personnel: json.personnel });
          
          useVenueStore.setState({
            seats: json.venue.seats,
            backgroundImage: json.venue.backgroundImage,
            stageScale: json.venue.stageScale || 1,
            stagePosition: json.venue.stagePosition || { x: 0, y: 0 },
            history: [] 
          });

          usePersonnelStore.getState().syncSeatingStatus();
          alert('專案讀取成功！');
        }
      } catch (err) {
        console.error(err);
        alert('讀取失敗：檔案可能已損毀');
      }
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
          const name = row['Name'] || row['姓名'] || row[0];
          const title = row['Title'] || row['職稱'] || row[1] || '貴賓';
          const org = row['Org'] || row['單位'] || row[2] || '';
          const rank = parseInt(row['Rank'] || row['權重'] || row[3]) || 50;
          const category = row['Category'] || row['類別'] || row[4] || '匯入';
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
      <div className="w-96 bg-white border-l border-slate-200 h-full flex flex-col shadow-xl z-20 shrink-0">
        <input type="file" ref={csvInputRef} onChange={handleCSVUpload} className="hidden" accept=".csv" />
        <input type="file" ref={projectInputRef} onChange={handleLoadProject} className="hidden" accept=".json" />

        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex justify-between items-center mb-4">
             <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
               <User className="text-blue-600" />
               人員管理區
             </h2>
             <button onClick={() => setShowReport(true)} className="text-slate-500 hover:text-blue-600 hover:bg-blue-50 p-2 rounded transition" title="列印座位清單">
               <Printer size={20} />
             </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <button onClick={handleSaveProject} className="flex items-center justify-center gap-2 bg-slate-800 text-white text-xs py-2 rounded hover:bg-slate-700 transition" title="將目前的場地與人員存成檔案">
              <FileJson size={14} /> 儲存專案
            </button>
            <button onClick={() => projectInputRef.current?.click()} className="flex items-center justify-center gap-2 bg-white border border-slate-300 text-slate-700 text-xs py-2 rounded hover:bg-slate-100 transition" title="讀取 .json 專案檔">
              <FolderOpen size={14} /> 讀取專案
            </button>
          </div>
          
          <hr className="border-slate-200 mb-4" />

          <div className="grid grid-cols-2 gap-2">
            <button onClick={autoArrange} className="bg-blue-50 text-blue-700 text-xs py-2 rounded hover:bg-blue-100 transition flex items-center justify-center gap-1 font-medium">
              <ArrowDownAZ size={14} /> 順序排位
            </button>
            <button onClick={autoArrangeProtocol} className="bg-indigo-50 text-indigo-700 text-xs py-2 rounded hover:bg-indigo-100 transition flex items-center justify-center gap-1 font-medium">
              <ArrowRightLeft size={14} /> 禮賓排位
            </button>
          </div>
          <button onClick={resetSeating} className="w-full mt-2 border border-slate-300 text-slate-600 text-xs py-1.5 rounded hover:bg-slate-50 transition">
              重置所有排位 (人)
          </button>

          {!isAdding ? (
            <div className="flex gap-2 mt-3">
              <button onClick={() => setIsAdding(true)} className="flex-1 flex items-center justify-center gap-1 text-sm text-slate-500 hover:text-blue-600 border border-dashed border-slate-300 rounded p-2 hover:bg-blue-50 transition">
                <Plus size={16} /> 新增人員
              </button>
              <button onClick={() => csvInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-1 text-sm text-slate-500 hover:text-green-600 border border-dashed border-slate-300 rounded p-2 hover:bg-green-50 transition">
                <Upload size={16} /> 匯入 CSV
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-3 bg-white p-3 rounded border border-blue-200 shadow-sm text-sm">
               <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-blue-600">新增貴賓資料</span>
                <button type="button" onClick={() => setIsAdding(false)}><X size={14} className="text-slate-400" /></button>
              </div>
              <div className="space-y-2">
                <input placeholder="姓名 (必填)" value={newName} onChange={e => setNewName(e.target.value)} className="w-full border rounded px-2 py-1" autoFocus />
                <input placeholder="職稱 (必填)" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full border rounded px-2 py-1" />
                <input placeholder="單位 (選填)" value={newOrg} onChange={e => setNewOrg(e.target.value)} className="w-full border rounded px-2 py-1" />
                <div className="flex gap-2">
                  <div className="flex-1"><input placeholder="類別" value={newCategory} onChange={e => setNewCategory(e.target.value)} className="w-full border rounded px-2 py-1" /></div>
                  <div className="w-20"><input type="number" min="0" max="100" value={newRank} onChange={e => setNewRank(Number(e.target.value))} className="w-full border rounded px-2 py-1 text-center font-mono" /></div>
                </div>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white text-xs py-1.5 rounded hover:bg-blue-700 mt-3 font-bold">確認新增</button>
            </form>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex justify-between">待安排 ({unseated.length})</h3>
            <div className="space-y-2">
              {unseated.map(person => (
                <div key={person.id} draggable onDragStart={(e) => handleDragStart(e, person.id)} className="bg-white border border-slate-200 p-3 rounded-lg shadow-sm hover:border-blue-400 hover:shadow-md transition cursor-grab active:cursor-grabbing flex items-center gap-3 relative">
                  <div className="bg-yellow-100 p-2 rounded-full"><User className="text-yellow-600 fill-yellow-400" size={20} /></div>
                  <div className="flex-1 min-w-0"><div className="font-bold text-slate-800 truncate">{person.name}</div><div className="text-xs text-slate-500 truncate">{person.organization} | {person.title}</div></div>
                  <div className="flex flex-col items-end gap-1"><div className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{person.rankScore}</div><div className="text-[10px] text-slate-400 border border-slate-200 px-1 rounded">{person.category}</div></div>
                </div>
              ))}
            </div>
          </div>
          <hr className="border-slate-100" />
          <div>
             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">已排座 ({seated.length})</h3>
             <div className="space-y-2 opacity-60">
              {seated.map(person => (
                <div key={person.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded border border-transparent">
                  <CheckCircle2 className="text-green-500" size={18} />
                  <span className="text-sm font-medium text-slate-600">{person.name}</span>
                  <span className="text-xs text-slate-400 ml-auto">{person.rankScore}分</span>
                </div>
              ))}
             </div>
          </div>
        </div>
      </div>

      {showReport && <ReportModal onClose={() => setShowReport(false)} />}
    </>
  );
};