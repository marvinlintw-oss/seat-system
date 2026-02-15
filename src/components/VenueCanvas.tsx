import React, { useRef, useState, useEffect } from 'react';
import Konva from 'konva';
import { Stage, Layer, Rect, Text, Group, Circle, Line, Image as KonvaImage } from 'react-konva';
import { useVenueStore } from '../store/useVenueStore';
import { usePersonnelStore } from '../store/usePersonnelStore';
import { Minus, Plus, Save, Download, Image as ImageIcon, Grid3X3, MonitorStop, Eraser, Trash2, Unlock, Lock, RotateCcw, Edit, HelpCircle, X } from 'lucide-react';

const VIRTUAL_WIDTH = 3000;
const VIRTUAL_HEIGHT = 2000;
const SEAT_WIDTH = 100;
const SEAT_HEIGHT = 150;
const GRID_SIZE = 20;

export const VenueCanvas: React.FC = () => {
  const stageRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hoveredSeatId, setHoveredSeatId] = useState<string | null>(null);
  const [bgImageObj, setBgImageObj] = useState<HTMLImageElement | null>(null);

  // Modal 與模式狀態
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchRows, setBatchRows] = useState(3);
  const [batchCols, setBatchCols] = useState(5);
  const [isEraserMode, setIsEraserMode] = useState(false);
  
  // 矩陣放置模式狀態
  const [placingBatch, setPlacingBatch] = useState<{ rows: number, cols: number } | null>(null);
  const [mouseGridPos, setMouseGridPos] = useState<{ x: number, y: number } | null>(null);
  
  // 輸出模式狀態 (控制隱藏物件的渲染)
  const [isExporting, setIsExporting] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // 編輯座位 Modal 狀態
  const [editingSeat, setEditingSeat] = useState<{ id: string, label: string, rankWeight: number } | null>(null);

  // 右鍵選單狀態
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

  // 1. 初始化與事件監聽 (Resize, Keydown)
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setSize({ width: containerRef.current.offsetWidth, height: containerRef.current.offsetHeight });
      }
    };
    window.addEventListener('resize', updateSize);
    updateSize();
    loadFromStorage();
    
    const timer = setTimeout(() => syncSeatingStatus(), 100);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
        syncSeatingStatus();
      }
      if (e.key === 'Escape') {
        if (placingBatch) {
          setPlacingBatch(null);
        }
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
  }, [placingBatch, contextMenu]);

  useEffect(() => {
    if (backgroundImage) {
      const img = new window.Image();
      img.src = backgroundImage;
      img.onload = () => setBgImageObj(img);
    } else {
      setBgImageObj(null);
    }
  }, [backgroundImage]);

  // 關閉右鍵選單
  useEffect(() => {
    const handleClickOutside = () => setContextMenu({ ...contextMenu, visible: false });
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [contextMenu]);

  // 監聽 export 狀態，當變為 true 時執行截圖，然後變回 false
  useEffect(() => {
    if (isExporting && stageRef.current) {
      setTimeout(() => {
        const oldScale = stageRef.current.scaleX();
        const oldPos = stageRef.current.position();
        
        stageRef.current.scale({ x: 0.5, y: 0.5 });
        stageRef.current.position({ x: 0, y: 0 });
        
        const uri = stageRef.current.toDataURL({ pixelRatio: 2 });
        
        stageRef.current.scale({ x: oldScale, y: oldScale });
        stageRef.current.position(oldPos);
        
        const link = document.createElement('a');
        link.download = `seat-chart-${new Date().toISOString().slice(0,10)}.png`;
        link.href = uri;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setIsExporting(false);
      }, 100);
    }
  }, [isExporting]);

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

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (placingBatch && mouseGridPos) {
      const isOverlap = checkBatchOverlap(mouseGridPos.x, mouseGridPos.y, placingBatch.rows, placingBatch.cols);
      
      if (!isOverlap) {
        addSeatBatch(mouseGridPos.x, mouseGridPos.y, placingBatch.rows, placingBatch.cols);
        setPlacingBatch(null);
      } else {
        alert('此位置與現有座位或舞台重疊，請移動到空曠處');
      }
    }
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (placingBatch) {
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
    const pointer = stageRef.current.getPointerPosition();
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

  const handleExport = () => {
    setIsExporting(true);
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
    if (!personId) return;

    const stage = stageRef.current;
    stage.setPointersPositions(e);
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const virtualPos = {
      x: (pointer.x - stage.x()) / stage.scaleX(),
      y: (pointer.y - stage.y()) / stage.scaleY()
    };

    const closestSeat = seats.find(seat => 
      seat.isVisible !== false &&
      seat.type !== 'shape' && 
      virtualPos.x >= seat.x && virtualPos.x <= seat.x + SEAT_WIDTH && 
      virtualPos.y >= seat.y && virtualPos.y <= seat.y + SEAT_HEIGHT
    );

    if (closestSeat) {
      updateSeatAssignment(closestSeat.id, personId);
      syncSeatingStatus();
    }
  };

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full bg-slate-200 overflow-hidden"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />

      {/* 左上角 Help 按鈕 */}
      <div className="absolute top-4 left-4 z-20">
        <button 
          onClick={() => setShowHelp(!showHelp)}
          className="bg-white p-2 rounded-full shadow-md text-slate-600 hover:text-blue-600 transition"
          title="操作說明"
        >
          <HelpCircle size={24} />
        </button>
      </div>

      {/* 底部工具列 */}
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
           <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-slate-100 rounded text-slate-600"><ImageIcon size={20} /></button>
           <button onClick={saveToStorage} className="p-2 hover:bg-slate-100 rounded text-slate-600"><Save size={20} /></button>
           <button onClick={handleExport} className="p-2 hover:bg-slate-100 rounded text-slate-600"><Download size={20} /></button>
        </div>
      </div>

      {isEraserMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-full shadow-lg z-20 animate-pulse pointer-events-none">
          ⚠️ 橡皮擦模式：點擊座位刪除
        </div>
      )}
      {placingBatch && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg z-20 pointer-events-none">
          🖱️ 移動滑鼠選擇位置，點擊左鍵放置 (ESC 取消)
        </div>
      )}
      {isExporting && (
        <div className="absolute inset-0 bg-white/50 z-50 flex items-center justify-center font-bold text-slate-700">
          正在輸出圖片...
        </div>
      )}

      {/* 說明視窗 */}
      {showHelp && (
        <div className="absolute top-16 left-4 bg-white p-5 rounded-xl shadow-xl w-80 z-50 border border-slate-200">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-bold text-slate-800">操作說明</h2>
            <button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
          </div>
          <ul className="text-sm text-slate-600 list-disc list-inside space-y-2">
            <li><b>左鍵拖曳：</b> 移動畫布視角</li>
            <li><b>滾輪：</b> 縮放畫布</li>
            <li><b>雙擊背景：</b> 新增單一座位</li>
            <li><b>拖曳座位：</b> 調整位置或交換人員</li>
            <li><b>右鍵點擊：</b> 編輯座位資訊、刪除、鎖定</li>
            <li><b>矩陣工具：</b> 快速生成大量座位</li>
            <li><b>Ctrl + Z：</b> 復原上一步</li>
          </ul>
        </div>
      )}

      {/* 批量生成 Modal */}
      {showBatchModal && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
          <div className="bg-white p-6 rounded-xl shadow-xl w-80">
            <h3 className="text-lg font-bold mb-4 text-slate-800">批量生成座位</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">排數 (Rows)</label>
                <input type="number" value={batchRows} onChange={(e) => setBatchRows(Number(e.target.value))} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">列數 (Columns)</label>
                <input type="number" value={batchCols} onChange={(e) => setBatchCols(Number(e.target.value))} className="w-full border rounded px-3 py-2" />
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowBatchModal(false)} className="flex-1 py-2 text-slate-500 hover:bg-slate-50 rounded">取消</button>
                <button onClick={handleBatchStart} className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">開始放置</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 編輯座位 Modal */}
      {editingSeat && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-80">
            <h3 className="text-lg font-bold mb-4 text-slate-800">編輯座位資訊</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">顯示代號 (Label)</label>
                <input 
                  type="text" 
                  value={editingSeat.label} 
                  onChange={(e) => setEditingSeat({...editingSeat, label: e.target.value})} 
                  className="w-full border rounded px-3 py-2" 
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">排位權重 (1=最優先)</label>
                <input 
                  type="number" 
                  value={editingSeat.rankWeight} 
                  onChange={(e) => setEditingSeat({...editingSeat, rankWeight: Number(e.target.value)})} 
                  className="w-full border rounded px-3 py-2" 
                />
                <p className="text-xs text-slate-400 mt-1">自動排位時，數字越小越優先入座</p>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setEditingSeat(null)} className="flex-1 py-2 text-slate-500 hover:bg-slate-50 rounded">取消</button>
                <button onClick={handleEditConfirm} className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">確認修改</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 右鍵選單 */}
      {contextMenu.visible && (
        <div 
          className="fixed bg-white shadow-xl rounded-lg border border-slate-200 py-1 z-50 w-44"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button onClick={() => handleMenuAction('edit')} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm text-slate-700 flex items-center gap-2">
            <Edit size={14}/> 編輯資訊
          </button>
          <button onClick={() => handleMenuAction('pin')} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm text-slate-700 flex items-center gap-2">
            {seats.find(s => s.id === contextMenu.seatId)?.isPinned ? <><Unlock size={14}/> 解鎖位置</> : <><Lock size={14}/> 鎖定位置</>}
          </button>
          <button onClick={() => handleMenuAction('unassign')} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm text-orange-600 flex items-center gap-2">
            <Minus size={14}/> 清空人員
          </button>
          <div className="h-[1px] bg-slate-100 my-1"></div>
          <button onClick={() => handleMenuAction('delete')} className="w-full text-left px-4 py-2 hover:bg-red-50 text-sm text-red-600 flex items-center gap-2">
            <Trash2 size={14}/> 刪除物件
          </button>
        </div>
      )}

      <Stage
        width={size.width}
        height={size.height}
        draggable={!isEraserMode && !placingBatch}
        onWheel={(e) => {
           e.evt.preventDefault();
           const stage = stageRef.current;
           const oldScale = stage.scaleX();
           const pointer = stage.getPointerPosition();
           if (!pointer) return;
           const scaleBy = 1.05;
           const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
           if (newScale < 0.1 || newScale > 5) return;
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
                const ptr = stageRef.current.getRelativePointerPosition();
                if (ptr) addSeat(snapToGrid(ptr.x), snapToGrid(ptr.y));
              }
            }
        }}
        scaleX={stageScale} scaleY={stageScale} x={stagePosition.x} y={stagePosition.y} ref={stageRef}
      >
        <Layer>
          <Rect name="venue-background" x={0} y={0} width={VIRTUAL_WIDTH} height={VIRTUAL_HEIGHT} fill="white" shadowBlur={20} shadowOpacity={0.1} />
          
          {bgImageObj && <KonvaImage name="custom-bg-image" image={bgImageObj} width={VIRTUAL_WIDTH} height={VIRTUAL_HEIGHT} opacity={0.8} />}

          {Array.from({ length: 30 }).map((_, i) => <Line key={`gx-${i}`} points={[i*100,0, i*100,VIRTUAL_HEIGHT]} stroke="#f1f5f9" strokeWidth={1} />)}
          {Array.from({ length: 20 }).map((_, i) => <Line key={`gy-${i}`} points={[0,i*100, VIRTUAL_WIDTH,i*100]} stroke="#f1f5f9" strokeWidth={1} />)}

          {placingBatch && mouseGridPos && (
             <Group>
               {Array.from({ length: placingBatch.rows }).map((_, r) => 
                 Array.from({ length: placingBatch.cols }).map((_, c) => {
                    const x = mouseGridPos.x + c * (SEAT_WIDTH + 10);
                    const y = mouseGridPos.y + r * (SEAT_HEIGHT + 10);
                    const isOverlap = checkBatchOverlap(mouseGridPos.x, mouseGridPos.y, placingBatch.rows, placingBatch.cols);
                    return (
                       <Rect 
                          key={`ghost-${r}-${c}`}
                          x={x} y={y}
                          width={SEAT_WIDTH} height={SEAT_HEIGHT}
                          fill={isOverlap ? 'red' : 'blue'} 
                          opacity={0.3} 
                          cornerRadius={4}
                       />
                    );
                 })
               )}
             </Group>
          )}

          {seats.map((seat) => {
            const isHidden = seat.isVisible === false;
            
            if (isExporting && isHidden) return null;

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
                     <Rect 
                       width={seat.width || 400} height={seat.height || 150} 
                       fill={isHidden ? "transparent" : ghostColor} 
                       stroke={seat.isPinned ? "#ef4444" : "#64748b"} 
                       strokeWidth={2} cornerRadius={4} dash={dashStyle} 
                     />
                     <Text 
                       text={seat.label} width={seat.width || 400} align="center" 
                       y={(seat.height || 150) / 2 - 10} fontSize={20} fontStyle="bold" 
                       fill={isHidden ? "#94a3b8" : "white"} 
                     />
                   </Group>
                ) : (
                   <Group opacity={ghostOpacity}>
                     <Rect 
                       width={SEAT_WIDTH} height={SEAT_HEIGHT} 
                       fill={isHidden ? "transparent" : bgColor} 
                       stroke={seat.isPinned ? '#ef4444' : '#94a3b8'} 
                       strokeWidth={2} cornerRadius={4} shadowBlur={seat.isPinned ? 0 : 4} dash={dashStyle} 
                     />
                     <Rect x={0} y={0} width={SEAT_WIDTH} height={24} fill={isHidden ? "transparent" : (seat.isPinned ? '#ef4444' : '#e2e8f0')} cornerRadius={[4,4,0,0]} />
                     <Text x={0} y={6} width={SEAT_WIDTH} text={seat.label} align="center" fontSize={12} fontStyle="bold" fill={isHidden ? "#cbd5e1" : (seat.isPinned ? 'white' : '#475569')} />
                     {!isHidden && seat.isPinned && <Circle x={SEAT_WIDTH - 10} y={12} radius={4} fill="white" />}
                     {!isHidden && occupant ? (
                       <>
                         <Text x={5} y={35} width={SEAT_WIDTH-10} text={occupant.category} align="center" fontSize={11} fill="#64748b" />
                         <Text x={0} y={55} width={SEAT_WIDTH} text={occupant.name} align="center" fontSize={18} fontStyle="bold" fill="#1e293b" />
                         <Text x={5} y={85} width={SEAT_WIDTH-10} text={occupant.title} align="center" fontSize={12} fill="#334155" lineHeight={1.2} />
                         <Text x={5} y={125} width={SEAT_WIDTH-10} text={occupant.organization} align="center" fontSize={10} fill="#94a3b8" />
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