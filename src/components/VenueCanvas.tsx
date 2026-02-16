import React, { useRef, useState, useEffect } from 'react';
import Konva from 'konva';
import { Stage, Layer, Rect, Text, Group, Circle, Line, Image as KonvaImage } from 'react-konva';
import { useVenueStore } from '../store/useVenueStore';
import { usePersonnelStore } from '../store/usePersonnelStore';
import { Minus, Plus, Save, Image as ImageIcon, Grid3X3, MonitorStop, Eraser, Trash2, Unlock, Lock, RotateCcw, Edit, HelpCircle, X, Printer, FileText } from 'lucide-react';

const VIRTUAL_WIDTH = 3200;
const VIRTUAL_HEIGHT = 2400;
const SEAT_WIDTH = 100;
const SEAT_HEIGHT = 150;
const GRID_SIZE = 20;

export const VenueCanvas: React.FC = () => {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hoveredSeatId, setHoveredSeatId] = useState<string | null>(null);
  const [bgImageObj, setBgImageObj] = useState<HTMLImageElement | null>(null);

  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchRows, setBatchRows] = useState(3);
  const [batchCols, setBatchCols] = useState(5);
  const [isEraserMode, setIsEraserMode] = useState(false);
  
  const [placingBatch, setPlacingBatch] = useState<{ rows: number, cols: number } | null>(null);
  const [mouseGridPos, setMouseGridPos] = useState<{ x: number, y: number } | null>(null);
  
  const [isConverting, setIsConverting] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [editingSeat, setEditingSeat] = useState<{ id: string, label: string, rankWeight: number } | null>(null);

  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; seatId: string | null }>({
    visible: false, x: 0, y: 0, seatId: null
  });

  const { 
    seats, stageScale, stagePosition, backgroundImage,
    setStageScale, setStagePosition, 
    addSeat, updateSeatPosition, togglePinSeat, updateSeatAssignment, unassignSeat, removeSeat,
    saveToStorage, loadFromStorage, setBackgroundImage, addSeatBatch, 
    toggleMainStage, undo, updateSeatProperties
  } = useVenueStore();

  const { personnel, syncSeatingStatus } = usePersonnelStore();

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const w = containerRef.current.offsetWidth;
        const h = containerRef.current.offsetHeight;
        setSize({ width: w, height: h });

        // [修正] 初始載入時，將畫布視角置中
        if (stagePosition.x === 0 && stagePosition.y === 0) {
            const initialScale = 0.4; // 縮小一點以看到全貌
            const centerX = (w - VIRTUAL_WIDTH * initialScale) / 2;
            const centerY = (h - VIRTUAL_HEIGHT * initialScale) / 2;
            
            setStageScale(initialScale);
            setStagePosition({ x: centerX, y: centerY + 50 }); // +50 微調
        }
      }
    };
    window.addEventListener('resize', updateSize);
    updateSize();
    loadFromStorage();
    
    const timer = setTimeout(() => syncSeatingStatus(), 200);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
        syncSeatingStatus();
      }
      if (e.key === 'Escape') {
        if (placingBatch) setPlacingBatch(null);
        setContextMenu({ ...contextMenu, visible: false });
        setIsEraserMode(false);
        setEditingSeat(null);
        setShowHelp(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', updateSize);
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, []); // Empty dependency array ensures this runs once on mount

  useEffect(() => {
    if (backgroundImage) {
      const img = new window.Image();
      img.src = backgroundImage;
      img.onload = () => setBgImageObj(img);
    } else {
      setBgImageObj(null);
    }
  }, [backgroundImage]);

  useEffect(() => {
    const handleClickOutside = () => setContextMenu({ ...contextMenu, visible: false });
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [contextMenu]);

  const snapToGrid = (val: number) => Math.round(val / GRID_SIZE) * GRID_SIZE;

  const handleBatchStart = () => {
    setPlacingBatch({ rows: batchRows, cols: batchCols });
    setShowBatchModal(false);
  };

  const handleToggleStage = () => {
    toggleMainStage();
  };

  const checkBatchOverlap = (startX: number, startY: number, rows: number, cols: number) => {
    const gapX = 10;
    const gapY = 10;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = startX + c * (SEAT_WIDTH + gapX);
        const y = startY + r * (SEAT_HEIGHT + gapY);
        const isOverlapping = seats.some(seat => 
          seat.isVisible !== false &&
          Math.abs(seat.x - x) < SEAT_WIDTH && 
          Math.abs(seat.y - y) < SEAT_HEIGHT
        );
        if (isOverlapping) return true;
      }
    }
    return false;
  };


  const handleStageClick = () => {
    if (placingBatch && mouseGridPos) {
      // [修正] 邊界檢查 (Boundary Check)
      const gapX = 10;
      const gapY = 10;
      const batchWidth = placingBatch.cols * SEAT_WIDTH + (placingBatch.cols - 1) * gapX;
      const batchHeight = placingBatch.rows * SEAT_HEIGHT + (placingBatch.rows - 1) * gapY;
      
      const endX = mouseGridPos.x + batchWidth;
      const endY = mouseGridPos.y + batchHeight;

      // 檢查是否超出畫布範圍 (包含小於 0 的情況)
      if (mouseGridPos.x < 0 || mouseGridPos.y < 0 || endX > VIRTUAL_WIDTH || endY > VIRTUAL_HEIGHT) {
        alert(`無法放置：矩陣會超出畫布邊界，請往中間移動。`);
        return;
      }

      // 重疊檢查
      const isOverlap = checkBatchOverlap(mouseGridPos.x, mouseGridPos.y, placingBatch.rows, placingBatch.cols);
      
      if (!isOverlap) {
        addSeatBatch(mouseGridPos.x, mouseGridPos.y, placingBatch.rows, placingBatch.cols);
        setPlacingBatch(null);
      } else {
        alert('此位置與現有座位或舞台重疊，請移動到空曠處');
      }
    }
  };

  const handleMouseMove = () => {
    if (placingBatch && stageRef.current) {
      const stage = stageRef.current;
      const pointer = stage.getRelativePointerPosition();
      if (pointer) {
        const totalWidth = placingBatch.cols * (SEAT_WIDTH + 10);
        const totalHeight = placingBatch.rows * (SEAT_HEIGHT + 10);
        
        setMouseGridPos({
          x: snapToGrid(pointer.x - totalWidth / 2),
          y: snapToGrid(pointer.y - totalHeight / 2)
        });
      }
    }
  };

  const handleContextMenu = (e: Konva.KonvaEventObject<PointerEvent>, seatId: string) => {
    e.evt.preventDefault();
    const pointer = stageRef.current?.getPointerPosition();
    const containerRect = containerRef.current?.getBoundingClientRect();
    
    if (pointer && containerRect) {
      setContextMenu({
        visible: true,
        x: pointer.x + containerRect.left,
        y: pointer.y + containerRect.top,
        seatId: seatId
      });
    }
  };

  const handleMenuAction = (action: 'delete' | 'pin' | 'unassign' | 'edit') => {
    if (!contextMenu.seatId) return;
    
    if (action === 'delete') {
      removeSeat(contextMenu.seatId);
    } else if (action === 'pin') {
      togglePinSeat(contextMenu.seatId);
    } else if (action === 'unassign') {
      unassignSeat(contextMenu.seatId);
    } else if (action === 'edit') {
      const seat = seats.find(s => s.id === contextMenu.seatId);
      if (seat) {
        setEditingSeat({ id: seat.id, label: seat.label, rankWeight: seat.rankWeight || 0 });
      }
    }
    syncSeatingStatus();
    setContextMenu({ ...contextMenu, visible: false });
  };

  const handleEditConfirm = () => {
    if (editingSeat) {
      updateSeatProperties(editingSeat.id, editingSeat.label, editingSeat.rankWeight);
      setEditingSeat(null);
    }
  };

  const handleEraserClick = (seatId: string) => {
    removeSeat(seatId);
    syncSeatingStatus();
  };

  // 生成 SVG 字串
  const generateSVGString = () => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const visibleSeats = seats.filter(s => s.isVisible !== false);
    
    if (visibleSeats.length === 0) return null;

    visibleSeats.forEach(seat => {
      if (Number.isFinite(seat.x) && Number.isFinite(seat.y)) {
        const w = seat.width || SEAT_WIDTH;
        const h = seat.height || SEAT_HEIGHT;
        minX = Math.min(minX, seat.x);
        minY = Math.min(minY, seat.y);
        maxX = Math.max(maxX, seat.x + w);
        maxY = Math.max(maxY, seat.y + h);
      }
    });

    const padding = 50;
    const exportX = minX - padding;
    const exportY = minY - padding;
    const width = (maxX - minX) + padding * 2;
    const height = (maxY - minY) + padding * 2;

    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${exportX} ${exportY} ${width} ${height}">`;
    svgContent += `<rect x="${exportX}" y="${exportY}" width="${width}" height="${height}" fill="white" />`;

    if (backgroundImage) {
        svgContent += `<image href="${backgroundImage}" x="0" y="0" width="${VIRTUAL_WIDTH}" height="${VIRTUAL_HEIGHT}" opacity="0.8" />`;
    }

    visibleSeats.forEach(seat => {
        const sX = seat.x;
        const sY = seat.y;
        const sW = seat.width || SEAT_WIDTH;
        const sH = seat.height || SEAT_HEIGHT;
        const occupant = personnel.find(p => p.id === seat.assignedPersonId);
        
        let bgColor = '#ffffff';
        let strokeColor = '#94a3b8';
        
        if (seat.isPinned) {
            bgColor = '#fecaca';
            strokeColor = '#ef4444';
        } else if (occupant) {
            bgColor = occupant.category === 'VIP' ? '#fef08a' : '#bfdbfe';
        }

        if (seat.type === 'shape') {
             svgContent += `<rect x="${sX}" y="${sY}" width="${sW}" height="${sH}" fill="${seat.isVisible===false ? 'none' : '#d1d5db'}" stroke="#64748b" stroke-width="2" rx="4" />`;
             svgContent += `<text x="${sX + sW/2}" y="${sY + sH/2}" font-family="sans-serif" font-size="20" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">${seat.label}</text>`;
        } else {
             svgContent += `<rect x="${sX}" y="${sY}" width="${sW}" height="${sH}" fill="${bgColor}" stroke="${strokeColor}" stroke-width="2" rx="4" />`;
             svgContent += `<path d="M ${sX} ${sY} L ${sX+sW} ${sY} L ${sX+sW} ${sY+24} L ${sX} ${sY+24} Z" fill="${seat.isPinned ? '#ef4444' : '#e2e8f0'}" stroke="none" />`;
             svgContent += `<text x="${sX + sW/2}" y="${sY + 16}" font-family="sans-serif" font-size="12" font-weight="bold" fill="${seat.isPinned ? 'white' : '#475569'}" text-anchor="middle">${seat.label}</text>`;

             if (occupant) {
                 svgContent += `<text x="${sX + sW/2}" y="${sY + 45}" font-family="sans-serif" font-size="12" fill="#64748b" text-anchor="middle">${occupant.organization || ''}</text>`;
                 svgContent += `<text x="${sX + sW/2}" y="${sY + 75}" font-family="sans-serif" font-size="20" font-weight="bold" fill="#1e293b" text-anchor="middle">${occupant.name}</text>`;
                 svgContent += `<text x="${sX + sW/2}" y="${sY + 100}" font-family="sans-serif" font-size="12" fill="#334155" text-anchor="middle">${occupant.title || ''}</text>`;
             } else {
                 svgContent += `<text x="${sX + sW/2}" y="${sY + 80}" font-family="sans-serif" font-size="14" fill="#cbd5e1" text-anchor="middle">空位</text>`;
             }
        }
    });

    svgContent += `</svg>`;
    return { content: svgContent, width, height };
  };

  // 列印為 PDF
  const handlePrintPDF = () => {
    const data = generateSVGString();
    if (!data) { alert("無內容可輸出"); return; }

    const isLandscape = data.width >= data.height;
    const pageOrientation = isLandscape ? 'landscape' : 'portrait';

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>列印座位表</title>
            <style>
              @page { size: ${pageOrientation}; margin: 5mm; }
              body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: system-ui, -apple-system, sans-serif; }
              svg { max-width: 98%; max-height: 98vh; height: auto; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
              @media print { body { display: block; } svg { box-shadow: none; max-width: 100%; } }
            </style>
          </head>
          <body>
            ${data.content}
            <script>window.onload = () => { setTimeout(() => { window.print(); }, 500); };</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
        alert("瀏覽器封鎖了彈跳視窗，請允許開啟視窗以進行列印。");
    }
  };

  // SVG 轉 PNG
  const handleExportSvgToPng = () => {
    const data = generateSVGString();
    if (!data) { alert("無內容可輸出"); return; }

    setIsConverting(true);

    const img = new Image();
    const svgBlob = new Blob([data.content], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    img.onload = () => {
      const MAX_WIDTH = 4000; 
      let targetWidth = data.width;
      let targetHeight = data.height;

      if (targetWidth > MAX_WIDTH) {
        const ratio = MAX_WIDTH / targetWidth;
        targetWidth = MAX_WIDTH;
        targetHeight = data.height * ratio;
        console.warn(`圖片過大，已自動縮放至寬度 ${MAX_WIDTH}px 以確保 PNG 輸出成功`);
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        
        try {
          const pngUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = `seat-chart-view-${new Date().toISOString().slice(0,10)}.png`;
          link.href = pngUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } catch (e) {
          alert('PNG 轉換失敗：記憶體不足。請改用 PDF 列印或 SVG 輸出。');
        }
      }
      
      URL.revokeObjectURL(url);
      setIsConverting(false);
    };

    img.onerror = () => {
      alert('圖片轉換發生錯誤');
      setIsConverting(false);
    };

    img.src = url;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setBackgroundImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePerson = (e: any, seatId: string) => {
    e.cancelBubble = true;
    unassignSeat(seatId);
    syncSeatingStatus();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const personId = e.dataTransfer.getData('personId');
    if (!personId || !stageRef.current) return;

    const stage = stageRef.current;
    stage.setPointersPositions(e);
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const rawX = (pointer.x - stage.x()) / stage.scaleX();
    const rawY = (pointer.y - stage.y()) / stage.scaleY();
    
    if (!Number.isFinite(rawX) || !Number.isFinite(rawY)) return; 

    const virtualPos = { x: rawX, y: rawY };

    const closestSeat = seats.find(seat => 
      seat.isVisible !== false && seat.type !== 'shape' && 
      virtualPos.x >= seat.x && virtualPos.x <= seat.x + SEAT_WIDTH && 
      virtualPos.y >= seat.y && virtualPos.y <= seat.y + SEAT_HEIGHT
    );
    if (closestSeat) { updateSeatAssignment(closestSeat.id, personId); syncSeatingStatus(); }
  };

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full bg-slate-200 overflow-hidden"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />

      {isConverting && (
         <div className="absolute inset-0 bg-black/50 z-50 flex flex-col items-center justify-center text-white">
            <div className="text-2xl animate-bounce mb-2">🖼️</div>
            <div className="font-bold">正在將 SVG 轉繪為 PNG...</div>
            <div className="text-sm opacity-80 mt-2">若檔案過大將自動縮小以確保成功</div>
         </div>
      )}

      <div className="absolute top-4 left-4 z-20">
        <button 
          onClick={() => setShowHelp(!showHelp)}
          className="bg-white p-2 rounded-full shadow-md text-slate-600 hover:text-blue-600 transition"
          title="操作說明"
        >
          <HelpCircle size={24} />
        </button>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur px-6 py-3 rounded-full shadow-2xl z-10 flex items-center gap-6 border border-slate-200">
        <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
          <button onClick={() => setStageScale(Math.max(0.1, stageScale - 0.1))} className="p-2 hover:bg-slate-100 rounded-full text-slate-600"><Minus size={18}/></button>
          <span className="text-sm font-mono w-12 text-center font-bold text-slate-700">{(stageScale * 100).toFixed(0)}%</span>
          <button onClick={() => setStageScale(Math.min(5, stageScale + 0.1))} className="p-2 hover:bg-slate-100 rounded-full text-slate-600"><Plus size={18}/></button>
        </div>
        
        <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
           <button 
             onClick={() => { undo(); syncSeatingStatus(); }}
             className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition text-sm font-medium"
             title="復原 (Ctrl+Z)"
           >
             <RotateCcw size={18} />
           </button>
           <button 
             onClick={() => setShowBatchModal(true)}
             className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition text-sm font-medium"
             title="批量生成"
           >
             <Grid3X3 size={18} /> 矩陣
           </button>
           <button 
             onClick={handleToggleStage}
             className="flex items-center gap-2 px-3 py-2 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition text-sm font-medium"
             title="顯示/隱藏 主舞台"
           >
             <MonitorStop size={18} /> 舞台
           </button>
           <button 
             onClick={() => setIsEraserMode(!isEraserMode)} 
             className={`flex items-center gap-2 px-3 py-2 rounded-lg transition text-sm font-medium ${isEraserMode ? 'bg-red-600 text-white shadow-inner' : 'bg-slate-100 text-slate-700 hover:bg-red-50 hover:text-red-600'}`}
             title="橡皮擦模式"
           >
             <Eraser size={18} /> 刪除
           </button>
        </div>

        <div className="flex items-center gap-2">
           <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-slate-100 rounded text-slate-600" title="設定底圖"><ImageIcon size={20} /></button>
           <button onClick={saveToStorage} className="p-2 hover:bg-slate-100 rounded text-slate-600" title="快速儲存"><Save size={20} /></button>
           
           <div className="flex flex-col gap-1">
             <button onClick={handlePrintPDF} className="flex items-center gap-2 px-4 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 shadow font-bold whitespace-nowrap" title="列印為 PDF (推薦)">
               <Printer size={14} /> 預覽/列印 PDF
             </button>
             <button onClick={handleExportSvgToPng} className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 shadow font-bold whitespace-nowrap" title="輸出 PNG (自動縮放)">
               <FileText size={14} /> PNG (預覽)
             </button>
           </div>
        </div>
      </div>

      {isEraserMode && <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-full shadow-lg z-20 animate-pulse pointer-events-none">⚠️ 橡皮擦模式：點擊座位刪除</div>}
      {placingBatch && <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg z-20 pointer-events-none">🖱️ 移動滑鼠選擇位置，點擊左鍵放置 (ESC 取消)</div>}

      {showHelp && (
        <div className="absolute top-16 left-4 bg-white p-5 rounded-xl shadow-xl w-80 z-50 border border-slate-200 text-sm">
          <div className="flex justify-between items-center mb-2"><h2 className="font-bold text-slate-800">操作說明</h2><button onClick={() => setShowHelp(false)}><X size={18}/></button></div>
          <ul className="list-disc list-inside space-y-2 text-slate-600">
            <li><b>左鍵拖曳：</b> 移動畫布</li>
            <li><b>滾輪：</b> 縮放</li>
            <li><b>雙擊背景：</b> 新增座位</li>
            <li><b>拖曳座位/人員：</b> 移動或交換</li>
            <li><b>右鍵座位：</b> 編輯屬性 (代號/權重)</li>
            <li><b>輸出圖片：</b> 自動裁切並產生高解析度大圖</li>
          </ul>
        </div>
      )}

      {showBatchModal && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
          <div className="bg-white p-6 rounded-xl shadow-xl w-80">
            <h3 className="text-lg font-bold mb-4">批量生成</h3>
            <div className="space-y-4">
              <div><label className="block text-sm text-slate-600">排數</label><input type="number" value={batchRows} onChange={(e) => setBatchRows(Number(e.target.value))} className="w-full border rounded px-3 py-2" /></div>
              <div><label className="block text-sm text-slate-600">列數</label><input type="number" value={batchCols} onChange={(e) => setBatchCols(Number(e.target.value))} className="w-full border rounded px-3 py-2" /></div>
              <div className="flex gap-2 mt-4"><button onClick={() => setShowBatchModal(false)} className="flex-1 py-2 text-slate-500 hover:bg-slate-50 rounded">取消</button><button onClick={handleBatchStart} className="flex-1 py-2 bg-blue-600 text-white rounded">開始</button></div>
            </div>
          </div>
        </div>
      )}

      {editingSeat && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-80">
            <h3 className="text-lg font-bold mb-4">編輯座位</h3>
            <div className="space-y-4">
              <div><label className="block text-sm text-slate-600">代號</label><input value={editingSeat.label} onChange={(e) => setEditingSeat({...editingSeat, label: e.target.value})} className="w-full border rounded px-3 py-2" /></div>
              <div><label className="block text-sm text-slate-600">權重 (1=優先)</label><input type="number" value={editingSeat.rankWeight} onChange={(e) => setEditingSeat({...editingSeat, rankWeight: Number(e.target.value)})} className="w-full border rounded px-3 py-2" /></div>
              <div className="flex gap-2 mt-4"><button onClick={() => setEditingSeat(null)} className="flex-1 py-2 text-slate-500 hover:bg-slate-50 rounded">取消</button><button onClick={handleEditConfirm} className="flex-1 py-2 bg-blue-600 text-white rounded">確定</button></div>
            </div>
          </div>
        </div>
      )}

      {contextMenu.visible && (
        <div className="fixed bg-white shadow-xl rounded-lg border border-slate-200 py-1 z-50 w-44" style={{ top: contextMenu.y, left: contextMenu.x }}>
          <button onClick={() => handleMenuAction('edit')} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm flex gap-2"><Edit size={14}/> 編輯資訊</button>
          <button onClick={() => handleMenuAction('pin')} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm flex gap-2">{seats.find(s => s.id === contextMenu.seatId)?.isPinned ? <><Unlock size={14}/> 解鎖</> : <><Lock size={14}/> 鎖定</>}</button>
          <button onClick={() => handleMenuAction('unassign')} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm text-orange-600 flex gap-2"><Minus size={14}/> 清空人員</button>
          <hr className="my-1"/>
          <button onClick={() => handleMenuAction('delete')} className="w-full text-left px-4 py-2 hover:bg-red-50 text-sm text-red-600 flex gap-2"><Trash2 size={14}/> 刪除物件</button>
        </div>
      )}

      <Stage width={size.width} height={size.height} draggable={!isEraserMode && !placingBatch} ref={stageRef}
        onWheel={(e) => {
           e.evt.preventDefault();
           const stage = stageRef.current;
           if (!stage) return;
           const oldScale = stage.scaleX();
           const pointer = stage.getPointerPosition();
           if (!pointer) return;
           const scaleBy = 1.05;
           const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
           setStageScale(newScale);
           const mousePointTo = { x: (pointer.x - stage.x()) / oldScale, y: (pointer.y - stage.y()) / oldScale };
           setStagePosition({ x: pointer.x - mousePointTo.x * newScale, y: pointer.y - mousePointTo.y * newScale });
        }}
        onDragEnd={(e) => { if (e.target === stageRef.current) setStagePosition({ x: e.target.x(), y: e.target.y() }); }}
        onClick={handleStageClick}
        onMouseMove={handleMouseMove}
        onDblClick={(e) => {
            if (!placingBatch) {
              const targetName = e.target.name();
              if (e.target === stageRef.current || targetName === 'venue-background' || targetName === 'custom-bg-image') {
                const ptr = stageRef.current?.getRelativePointerPosition();
                if (ptr) addSeat(snapToGrid(ptr.x), snapToGrid(ptr.y));
              }
            }
        }}
        scaleX={stageScale} scaleY={stageScale} x={stagePosition.x} y={stagePosition.y}
      >
        <Layer>
          {/* 這個 name="venue-background" 對於輸出功能非常重要 */}
          <Rect name="venue-background" x={0} y={0} width={VIRTUAL_WIDTH} height={VIRTUAL_HEIGHT} fill="white" />
          {bgImageObj && <KonvaImage name="custom-bg-image" image={bgImageObj} width={VIRTUAL_WIDTH} height={VIRTUAL_HEIGHT} opacity={0.8} />}
          {Array.from({ length: 50 }).map((_, i) => <Line key={`gx-${i}`} points={[i*100,0, i*100,VIRTUAL_HEIGHT]} stroke="#f1f5f9" strokeWidth={1} />)}
          {Array.from({ length: 40 }).map((_, i) => <Line key={`gy-${i}`} points={[0,i*100, VIRTUAL_WIDTH,i*100]} stroke="#f1f5f9" strokeWidth={1} />)}

          {placingBatch && mouseGridPos && (
             <Group>
               {Array.from({ length: placingBatch.rows }).map((_, r) => 
                 Array.from({ length: placingBatch.cols }).map((_, c) => {
                    const x = mouseGridPos.x + c * (SEAT_WIDTH + 10);
                    const y = mouseGridPos.y + r * (SEAT_HEIGHT + 10);
                    const isOverlap = checkBatchOverlap(mouseGridPos.x, mouseGridPos.y, placingBatch.rows, placingBatch.cols);
                    return (<Rect key={`ghost-${r}-${c}`} x={x} y={y} width={SEAT_WIDTH} height={SEAT_HEIGHT} fill={isOverlap ? 'red' : 'blue'} opacity={0.3} cornerRadius={4} />);
                 })
               )}
             </Group>
          )}

          {seats.map((seat) => {
            const isHidden = seat.isVisible === false;
            
            const ghostOpacity = isHidden ? 0.15 : (seat.type === 'shape' ? 0.8 : 1);
            const dashStyle = isHidden ? [10, 5] : undefined;
            const ghostColor = isHidden ? "#d1d5db" : "#94a3b8"; 
            const isShape = seat.type === 'shape';
            const occupant = personnel.find(p => p.id === seat.assignedPersonId);
            const bgColor = occupant ? (occupant.category === 'VIP' ? '#fef08a' : '#bfdbfe') : (seat.isPinned ? '#fecaca' : '#ffffff');

            return (
              <Group
                key={seat.id} x={seat.x} y={seat.y}
                draggable={!seat.isPinned && !isEraserMode && !placingBatch && !isHidden}
                onMouseEnter={() => setHoveredSeatId(seat.id)}
                onMouseLeave={() => setHoveredSeatId(null)}
                onContextMenu={(e) => handleContextMenu(e, seat.id)}
                onClick={(e) => {
                  if (isEraserMode) { handleEraserClick(seat.id); } 
                  else if (placingBatch) { /* ... */ }
                  else { if (e.evt.ctrlKey || e.evt.metaKey) { togglePinSeat(seat.id); e.cancelBubble = true; } }
                }}
                onDragEnd={(e) => {
                  const newX = snapToGrid(e.target.x()); const newY = snapToGrid(e.target.y());
                  if (isShape) { updateSeatPosition(seat.id, newX, newY); return; }
                  const targetSeat = seats.find(s => s.isVisible !== false && s.id !== seat.id && s.type !== 'shape' && Math.abs(s.x - newX) < SEAT_WIDTH / 2 && Math.abs(s.y - newY) < SEAT_HEIGHT / 2);
                  if (targetSeat) {
                    const personA = seat.assignedPersonId; const personB = targetSeat.assignedPersonId;
                    updateSeatAssignment(seat.id, personB); updateSeatAssignment(targetSeat.id, personA);
                    e.target.to({ x: seat.x, y: seat.y, duration: 0.2, easing: Konva.Easings.BackEaseOut });
                    syncSeatingStatus();
                  } else {
                    const success = updateSeatPosition(seat.id, newX, newY);
                    if (success) e.target.to({ x: newX, y: newY, duration: 0.1 });
                    else e.target.to({ x: seat.x, y: seat.y, duration: 0.2, easing: Konva.Easings.ElasticEaseOut });
                  }
                }}
              >
                <Rect x={-20} y={-20} width={(seat.width||SEAT_WIDTH) + 40} height={(seat.height||SEAT_HEIGHT) + 40} fill="transparent" />
                
                {isShape ? (
                   <Group opacity={ghostOpacity}>
                     <Rect width={seat.width || 400} height={seat.height || 150} fill={isHidden ? "transparent" : ghostColor} stroke={seat.isPinned ? "#ef4444" : "#64748b"} strokeWidth={2} cornerRadius={4} dash={dashStyle} />
                     <Text text={seat.label} width={seat.width || 400} align="center" y={(seat.height || 150) / 2 - 10} fontSize={20} fontStyle="bold" fill={isHidden ? "#94a3b8" : "white"} />
                   </Group>
                ) : (
                   <Group opacity={ghostOpacity}>
                     <Rect width={SEAT_WIDTH} height={SEAT_HEIGHT} fill={isHidden ? "transparent" : bgColor} stroke={seat.isPinned ? '#ef4444' : '#94a3b8'} strokeWidth={2} cornerRadius={4} shadowBlur={seat.isPinned ? 0 : 4} dash={dashStyle} />
                     <Rect x={0} y={0} width={SEAT_WIDTH} height={24} fill={isHidden ? "transparent" : (seat.isPinned ? '#ef4444' : '#e2e8f0')} cornerRadius={[4,4,0,0]} />
                     <Text x={0} y={6} width={SEAT_WIDTH} text={seat.label} align="center" fontSize={12} fontStyle="bold" fill={isHidden ? "#cbd5e1" : (seat.isPinned ? 'white' : '#475569')} />
                     {!isHidden && seat.isPinned && <Circle x={SEAT_WIDTH - 10} y={12} radius={4} fill="white" />}
                     {!isHidden && occupant ? (
                       <>
                         <Text x={5} y={35} width={SEAT_WIDTH-10} text={occupant.organization} align="center" fontSize={12} fill="#64748b" />
                         <Text x={0} y={55} width={SEAT_WIDTH} text={occupant.name} align="center" fontSize={20} fontStyle="bold" fill="#1e293b" />
                         <Text x={5} y={85} width={SEAT_WIDTH-10} text={occupant.title} align="center" fontSize={12} fill="#334155" lineHeight={1.2} />
                         <Text x={5} y={125} width={SEAT_WIDTH-10} text={occupant.category} align="center" fontSize={10} fill="#94a3b8" />
                         {hoveredSeatId === seat.id && !isEraserMode && !placingBatch && (
                           <Group x={-10} y={-10} onClick={(e) => handleRemovePerson(e, seat.id)} onMouseEnter={(e) => { const container = e.target.getStage()?.container(); if(container) container.style.cursor = 'pointer'; }} onMouseLeave={(e) => { const container = e.target.getStage()?.container(); if(container) container.style.cursor = 'default'; }}>
                              <Circle radius={12} fill="#ef4444" shadowBlur={2} />
                              <Text text="X" fontSize={14} fill="white" x={-4} y={-5} fontStyle="bold"/>
                           </Group>
                         )}
                       </>
                     ) : (
                       <Text x={0} y={70} width={SEAT_WIDTH} text={isHidden ? "" : "空位"} align="center" fontSize={14} fill="#cbd5e1" />
                     )}
                   </Group>
                )}
              </Group>
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
};