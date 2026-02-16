// src/components/VenueCanvas.tsx
import React, { useRef, useState, useEffect } from 'react';
import Konva from 'konva';
import { Stage, Layer, Rect, Text, Group, Circle, Line, Image as KonvaImage, Transformer } from 'react-konva';
import { useVenueStore, type Seat, VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from '../store/useVenueStore';
import { usePersonnelStore } from '../store/usePersonnelStore';
import { useSystemStore } from '../store/useSystemStore'; // 引用新 store
import { Minus, Plus, Grid3X3, Eraser, RotateCcw, HelpCircle, X, Maximize} from 'lucide-react';

const SEAT_WIDTH = 100;
const SEAT_HEIGHT = 150;
const GRID_SIZE = 20;

export const VenueCanvas: React.FC = () => {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 右鍵選單狀態
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, seatId: string } | null>(null);
  const [editSeatData, setEditSeatData] = useState<{ label: string, weight: number } | null>(null);

  // 1.1 長按平移狀態
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const panTimer = useRef<NodeJS.Timeout | null>(null);

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchRows, setBatchRows] = useState(3);
  const [batchCols, setBatchCols] = useState(5);
  
  const [showHelp, setShowHelp] = useState(false);
  const [bgImageObj, setBgImageObj] = useState<HTMLImageElement | null>(null);

  const { 
    seats, stageScale, stagePosition, backgroundImage, isEditMode, isSequencing, selectedSeatIds, rankSequenceCounter,
    setStageScale, setStagePosition, setBackgroundImage,
    addSeat, updateSeatPosition, unassignSeat,
    addSeatBatch, undo, moveSeatsBatch,
    setSelection, addToSelection, clearSelection, copySelection, pasteSelection, deleteSelectedSeats,
    applyRankToSeat, updateSeatProperties, setSeatZone, updateSeatAssignment, toggleMainStage
  } = useVenueStore();

  const { personnel, syncSeatingStatus } = usePersonnelStore();
  const { categories, getCategoryByLabel } = useSystemStore();

  // Selection Box
  const [selectionRect, setSelectionRect] = useState<{x:number, y:number, w:number, h:number} | null>(null);
  const isSelecting = useRef(false);
  const selectStartPos = useRef({x:0, y:0});

  // Batch Place
  const [placingBatch, setPlacingBatch] = useState<{ rows: number, cols: number } | null>(null);
  const [mouseGridPos, setMouseGridPos] = useState<{ x: number, y: number } | null>(null);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setSize({ width: containerRef.current.offsetWidth, height: containerRef.current.offsetHeight });
        // 初始化置中
        if (stagePosition.x === 0 && stagePosition.y === 0) {
            setStageScale(0.4);
            setStagePosition({ x: (containerRef.current.offsetWidth - VIRTUAL_WIDTH * 0.4)/2, y: 50 });
        }
      }
    };
    window.addEventListener('resize', updateSize);
    updateSize();
    
    // 處理 Transformer (舞台形狀調整)
    if (isEditMode && transformerRef.current && stageRef.current) {
       const selectedNodes = stageRef.current.find('.shape-stage'); // 只選取舞台
       const stageNode = selectedNodes.find(n => selectedSeatIds.includes(n.id()));
       if (stageNode) {
           transformerRef.current.nodes([stageNode]);
           transformerRef.current.getLayer()?.batchDraw();
       } else {
           transformerRef.current.nodes([]);
       }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isEditMode) return;
      if (e.key === 'Delete') { deleteSelectedSeats(); syncSeatingStatus(); }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'c') copySelection();
        if (e.key === 'v') { pasteSelection(100, 100); syncSeatingStatus(); }
        if (e.key === 'z') { e.preventDefault(); undo(); syncSeatingStatus(); }
      }
      if (e.key === 'Escape') {
        if (placingBatch) setPlacingBatch(null);
        clearSelection();
        setContextMenu(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', updateSize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEditMode, selectedSeatIds]);

  useEffect(() => {
    if (backgroundImage) {
      const img = new window.Image();
      img.src = backgroundImage;
      img.onload = () => setBgImageObj(img);
    } else setBgImageObj(null);
  }, [backgroundImage]);

  // 1.1 滾輪縮放
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const scaleBy = 1.05;
    const stage = e.target.getStage();
    if (!stage) return;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    let newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    newScale = Math.max(0.1, Math.min(newScale, 5)); // 限制縮放

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    setStageScale(newScale);
    setStagePosition(newPos);
  };

  // 1.1 長按平移邏輯
  const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    setContextMenu(null);
    const isBackground = e.target === e.target.getStage() || e.target.name() === 'venue-background';
    
    if (e.evt.button === 0 && isBackground) { // 左鍵
        panTimer.current = setTimeout(() => {
             setIsPanning(true);
             if(containerRef.current) containerRef.current.style.cursor = 'grab';
        }, 300); // 長按300ms觸發
        setLastMousePos({ x: e.evt.clientX, y: e.evt.clientY });
        
        // 同時準備框選
        if (!isPanning && isEditMode && !placingBatch) {
             const stage = e.target.getStage();
             const ptr = stage?.getRelativePointerPosition();
             if(ptr) {
                selectStartPos.current = ptr;
                isSelecting.current = true;
                if (!e.evt.shiftKey && !e.evt.ctrlKey) clearSelection();
             }
        }
    }
  };

  const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // 1.1 平移處理
    if (isPanning) {
        const stage = e.target.getStage();
        if(!stage) return;
        const dx = e.evt.clientX - lastMousePos.x;
        const dy = e.evt.clientY - lastMousePos.y;
        setStagePosition({ x: stage.x() + dx, y: stage.y() + dy });
        setLastMousePos({ x: e.evt.clientX, y: e.evt.clientY });
        return; 
    }

    // 矩陣預覽
    if (placingBatch && stageRef.current) {
        const stage = stageRef.current;
        const pointer = stage.getRelativePointerPosition();
        if (pointer) {
          const totalW = placingBatch.cols * 110;
          const totalH = placingBatch.rows * 160;
          setMouseGridPos({
            x: Math.round((pointer.x - totalW/2) / GRID_SIZE) * GRID_SIZE,
            y: Math.round((pointer.y - totalH/2) / GRID_SIZE) * GRID_SIZE
          });
        }
        return;
    }

    // 框選
    if (isSelecting.current && selectStartPos.current && isEditMode) {
        if (panTimer.current) clearTimeout(panTimer.current); // 取消平移
        const stage = e.target.getStage();
        const ptr = stage?.getRelativePointerPosition();
        if (ptr) {
            setSelectionRect({
                x: Math.min(selectStartPos.current.x, ptr.x),
                y: Math.min(selectStartPos.current.y, ptr.y),
                w: Math.abs(ptr.x - selectStartPos.current.x),
                h: Math.abs(ptr.y - selectStartPos.current.y)
            });
        }
    }
  };

  const handleStageMouseUp = () => {
    if (panTimer.current) clearTimeout(panTimer.current);
    setIsPanning(false);
    if (containerRef.current) containerRef.current.style.cursor = isEditMode ? 'crosshair' : 'default';

    if (isSelecting.current && selectionRect) {
       const selected = seats.filter(s => 
          s.isVisible !== false &&
          s.x < selectionRect.x + selectionRect.w &&
          s.x + (s.width||100) > selectionRect.x &&
          s.y < selectionRect.y + selectionRect.h &&
          s.y + (s.height||150) > selectionRect.y
       );
       addToSelection(selected.map(s => s.id));
    }
    isSelecting.current = false;
    setSelectionRect(null);
  };

  // 1.3 多選拖曳邏輯
  const handleDragStart = (e: Konva.KonvaEventObject<DragEvent>, seatId: string) => {
      if (!selectedSeatIds.includes(seatId)) {
          if (!e.evt.shiftKey) setSelection([seatId]);
      }
  };

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>, seat: Seat) => {
      // 找到目前拖曳的座位的新位置
      const newX = Math.round(e.target.x() / GRID_SIZE) * GRID_SIZE;
      const newY = Math.round(e.target.y() / GRID_SIZE) * GRID_SIZE;
      
      const deltaX = newX - seat.x;
      const deltaY = newY - seat.y;

      // 移動所有選取的座位 (除了目前這個，因為 Konva 會自己動它)
      const otherSelectedIds = selectedSeatIds.filter(id => id !== seat.id);
      if (otherSelectedIds.length > 0) {
          moveSeatsBatch(otherSelectedIds, deltaX, deltaY);
      }
      // 更新自己的 Store 位置
      updateSeatPosition(seat.id, newX, newY);
  };

  // 1.8 & 2.2 右鍵選單
  const handleContextMenu = (e: Konva.KonvaEventObject<PointerEvent>, seat: Seat) => {
      e.evt.preventDefault();
      // 如果未選取，先選取
      if (!selectedSeatIds.includes(seat.id)) {
          setSelection([seat.id]);
      }
      
      const stage = e.target.getStage();
      const ptr = stage?.getPointerPosition();
      if(ptr) {
         setContextMenu({ x: ptr.x, y: ptr.y, seatId: seat.id });
         setEditSeatData({ label: seat.label, weight: seat.rankWeight });
      }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isEditMode) return;
    const personId = e.dataTransfer.getData('personId');
    if (!personId || !stageRef.current) return;

    const stage = stageRef.current;
    stage.setPointersPositions(e);
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const rawX = (pointer.x - stage.x()) / stage.scaleX();
    const rawY = (pointer.y - stage.y()) / stage.scaleY();
    
    const virtualPos = { x: rawX, y: rawY };

    const closestSeat = seats.find(seat => 
      seat.isVisible !== false && seat.type !== 'shape' && 
      virtualPos.x >= seat.x && virtualPos.x <= seat.x + SEAT_WIDTH && 
      virtualPos.y >= seat.y && virtualPos.y <= seat.y + SEAT_HEIGHT
    );
    if (closestSeat) { 
        updateSeatAssignment(closestSeat.id, personId); 
        syncSeatingStatus(); 
    }
  };

  // 雙色塊渲染
  const renderSeatContent = (seat: Seat) => {
     const occupant = personnel.find(p => p.id === seat.assignedPersonId);
     const isSelected = selectedSeatIds.includes(seat.id);
     
     // 獲取顏色
     const zoneCat = getCategoryByLabel(seat.zoneCategory || '');
     const zoneColor = zoneCat ? zoneCat.color : '#cbd5e1'; // 預設灰
     
     const personCat = occupant ? getCategoryByLabel(occupant.category) : null;
     const personBg = personCat ? personCat.personColor : '#ffffff';

     const stroke = seat.isPinned ? '#ef4444' : (isSelected ? '#2563eb' : '#94a3b8');
     const strokeWidth = isSelected ? 3 : 2;

     return (
        <Group>
           {/* 2.5 座位本體 - 雙色塊 */}
           <Rect 
             width={SEAT_WIDTH} height={SEAT_HEIGHT} 
             fill="white"
             stroke={stroke} strokeWidth={strokeWidth} 
             cornerRadius={4} 
             shadowColor="black" shadowOpacity={0.1} shadowBlur={5}
           />
           
           {/* 頂部：座位代碼區塊 (跟隨座位分區顏色) */}
           <Rect x={0} y={0} width={SEAT_WIDTH} height={25} fill={zoneColor} cornerRadius={[4,4,0,0]} stroke={stroke} strokeWidth={0}/>
           <Text 
             text={seat.label} 
             x={0} y={6} width={SEAT_WIDTH} align="center" 
             fontSize={12} fontStyle="bold" fill="#334155"
           />

           {/* 底部：人員資訊 (跟隨人員類別顏色) */}
           <Rect x={0} y={25} width={SEAT_WIDTH} height={SEAT_HEIGHT-25} fill={personBg} cornerRadius={[0,0,4,4]} />

           {occupant ? (
               <>
                 <Text text={occupant.organization} x={4} y={35} width={SEAT_WIDTH-8} align="center" fontSize={11} fill="#64748b" wrap="none" ellipsis/>
                 <Text text={occupant.name} x={2} y={65} width={SEAT_WIDTH-4} align="center" fontSize={18} fontStyle="bold" fill="#1e293b" wrap="none" ellipsis/>
                 <Text text={occupant.title} x={4} y={95} width={SEAT_WIDTH-8} align="center" fontSize={12} fill="#334155" wrap="none" ellipsis/>
                 
                 {!isEditMode && (
                   <Group x={80} y={20} onClick={(e) => { e.cancelBubble=true; unassignSeat(seat.id); syncSeatingStatus(); }}>
                      <Circle radius={8} fill="#ef4444" />
                      <Text text="×" x={-3} y={-4} fontSize={10} fill="white" fontStyle="bold"/>
                   </Group>
                 )}
               </>
           ) : (
               <Text text="空位" x={0} y={80} width={SEAT_WIDTH} align="center" fontSize={14} fill="#cbd5e1"/>
           )}

           {/* 1.6 編輯模式：重要度顯示 (右下角紅底白字) */}
           {isEditMode && (
               <Group x={SEAT_WIDTH-25} y={SEAT_HEIGHT-25}>
                   <Rect width={25} height={20} fill="#ef4444" cornerRadius={4} />
                   <Text text={String(seat.rankWeight)} x={0} y={4} width={25} align="center" fill="white" fontSize={10} fontStyle="bold"/>
               </Group>
           )}

           {/* 序列排序提示 */}
           {isSequencing && (
               <Group x={SEAT_WIDTH/2} y={SEAT_HEIGHT/2}>
                   <Circle radius={15} fill="rgba(37, 99, 235, 0.9)" />
                   <Text text={String(rankSequenceCounter)} x={-5} y={-5} fill="white" fontSize={12}/>
               </Group>
           )}
        </Group>
     );
  };

  const snapToGrid = (val: number) => Math.round(val / GRID_SIZE) * GRID_SIZE;

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full h-full bg-slate-200 overflow-hidden ${isEditMode ? 'cursor-crosshair' : 'cursor-default'}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <input type="file" ref={fileInputRef} onChange={(e) => {
          const file = e.target.files?.[0];
          if(file) {
              const reader = new FileReader();
              reader.onload = () => setBackgroundImage(reader.result as string);
              reader.readAsDataURL(file);
          }
      }} className="hidden" accept="image/*" />

      {/* 右鍵選單 */}
      {contextMenu && (
        <div 
            className="absolute z-50 bg-white shadow-xl rounded-lg p-3 border border-slate-200 w-64"
            style={{ top: contextMenu.y, left: contextMenu.x }}
        >
            <div className="flex justify-between items-center mb-2 border-b pb-2">
                <span className="font-bold text-sm">座位設定 ({selectedSeatIds.length} 個)</span>
                <button onClick={() => setContextMenu(null)}><X size={14}/></button>
            </div>
            
            {/* 1.8 編輯代碼與重要度 */}
            {selectedSeatIds.length === 1 && editSeatData && (
                <div className="space-y-2 mb-3">
                    <div className="flex gap-2 items-center">
                        <label className="text-xs w-12">代碼</label>
                        <input className="border rounded px-2 py-1 text-sm flex-1" value={editSeatData.label} onChange={(e) => setEditSeatData({...editSeatData, label: e.target.value})}/>
                    </div>
                    <div className="flex gap-2 items-center">
                        <label className="text-xs w-12">重要度</label>
                        <input type="number" className="border rounded px-2 py-1 text-sm flex-1" value={editSeatData.weight} onChange={(e) => setEditSeatData({...editSeatData, weight: Number(e.target.value)})}/>
                    </div>
                    <button 
                        onClick={() => { updateSeatProperties(contextMenu.seatId, editSeatData.label, editSeatData.weight); setContextMenu(null); }}
                        className="w-full bg-blue-600 text-white text-xs py-1 rounded"
                    >
                        更新單一座位
                    </button>
                </div>
            )}

            {/* 2.2 設定座位分區 (多選) */}
            <div className="space-y-1">
                <span className="text-xs text-slate-500 block mb-1">設定區塊屬性 (顏色)</span>
                <div className="grid grid-cols-4 gap-1">
                    {categories.map(cat => (
                        <button 
                            key={cat.id} 
                            onClick={() => { setSeatZone(selectedSeatIds, cat.label); setContextMenu(null); }}
                            className="w-full h-6 rounded border border-slate-300 shadow-sm"
                            style={{ backgroundColor: cat.color }}
                            title={cat.label}
                        />
                    ))}
                    <button 
                        onClick={() => { setSeatZone(selectedSeatIds, ''); setContextMenu(null); }}
                        className="w-full h-6 rounded border border-slate-300 bg-slate-100 text-[10px] flex items-center justify-center"
                        title="清除"
                    >
                        無
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* 工具列與提示 */}
      <div className="absolute top-4 left-4 z-20">
        <button onClick={() => setShowHelp(!showHelp)} className="bg-white p-2 rounded-full shadow-md text-slate-600 hover:text-blue-600 transition"><HelpCircle size={24} /></button>
      </div>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur px-4 py-1 rounded-full text-xs text-slate-600 shadow border z-10 pointer-events-none">
          滾輪縮放 • 長按左鍵平移 • Shift+拖曳多選
      </div>

      {isSequencing && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-2 rounded-full shadow-xl z-30 flex items-center gap-2 animate-pulse">
              <span className="font-bold">序列排序模式中</span>
              <span className="text-sm">請依照順序點擊座位 (目前: {rankSequenceCounter})</span>
          </div>
      )}

      {isEditMode && !isSequencing && (
          <div className="absolute top-4 right-4 bg-blue-600 text-white px-4 py-1.5 rounded shadow z-20 text-sm font-bold opacity-80 pointer-events-none">編輯模式 ON</div>
      )}

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur px-6 py-3 rounded-full shadow-2xl z-10 flex items-center gap-6 border border-slate-200">
        <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
          <button onClick={() => setStageScale(Math.max(0.1, stageScale - 0.1))} className="p-2 hover:bg-slate-100 rounded-full"><Minus size={18}/></button>
          <span className="text-sm font-mono w-12 text-center font-bold text-slate-700">{(stageScale * 100).toFixed(0)}%</span>
          <button onClick={() => setStageScale(Math.min(5, stageScale + 0.1))} className="p-2 hover:bg-slate-100 rounded-full"><Plus size={18}/></button>
        </div>
        
        {isEditMode && (
          <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
             <button onClick={undo} className="p-2 hover:bg-slate-100 rounded" title="復原 (Ctrl+Z)"><RotateCcw size={18} /></button>
             <button onClick={() => setShowBatchModal(true)} className="p-2 hover:bg-slate-100 rounded text-blue-600" title="矩陣生成"><Grid3X3 size={18} /></button>
             <button onClick={deleteSelectedSeats} className="p-2 hover:bg-red-50 rounded text-red-600" title="刪除選取 (Del)"><Eraser size={18} /></button>
             <button onClick={toggleMainStage} className="p-2 hover:bg-slate-100 rounded text-purple-600" title="切換主舞台"><Maximize size={18}/></button>
          </div>
        )}
      </div>

      {showHelp && (
        <div className="absolute top-16 left-4 bg-white p-5 rounded-xl shadow-xl w-80 z-50 border border-slate-200 text-sm">
          <div className="flex justify-between items-center mb-2"><h2 className="font-bold text-slate-800">操作說明 (Gen 2.1)</h2><button onClick={() => setShowHelp(false)}><X size={18}/></button></div>
          <div className="space-y-3 text-slate-600">
            <div><strong className="text-blue-600 block mb-1">一般：</strong><ul><li>滾輪：縮放畫布</li><li>長按左鍵：平移畫布</li></ul></div>
            <div><strong className="text-red-600 block mb-1">編輯模式：</strong><ul><li><strong>多選：</strong>Shift+拖曳 / 框選</li><li><strong>移動：</strong>選取後可整批拖曳</li><li><strong>右鍵：</strong>編輯屬性與顏色</li></ul></div>
          </div>
        </div>
      )}

      {showBatchModal && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-80">
            <h3 className="text-lg font-bold mb-4">矩陣生成座位</h3>
            <div className="space-y-4">
              <div><label className="text-sm text-slate-600">排數 (Rows)</label><input type="number" value={batchRows} onChange={(e) => setBatchRows(Number(e.target.value))} className="w-full border rounded px-3 py-2"/></div>
              <div><label className="text-sm text-slate-600">列數 (Cols)</label><input type="number" value={batchCols} onChange={(e) => setBatchCols(Number(e.target.value))} className="w-full border rounded px-3 py-2"/></div>
              <div className="flex gap-2 pt-2">
                  <button onClick={() => setShowBatchModal(false)} className="flex-1 py-2 bg-slate-100 rounded hover:bg-slate-200">取消</button>
                  <button onClick={() => { setPlacingBatch({rows: batchRows, cols: batchCols}); setShowBatchModal(false); }} className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">開始放置</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Stage 
        width={size.width} height={size.height} 
        ref={stageRef}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onWheel={handleWheel}
        onClick={(e) => {
             // 雙擊背景新增
             if (isEditMode && !placingBatch) {
                const targetName = e.target.name();
                if (e.target === stageRef.current || targetName === 'venue-background') {
                   // 這裡做點擊處理，雙擊由 Konva 的 onDblClick 處理
                }
             }
             if (placingBatch && mouseGridPos) {
                 addSeatBatch(mouseGridPos.x, mouseGridPos.y, placingBatch.rows, placingBatch.cols);
                 setPlacingBatch(null);
             }
        }}
        onDblClick={() => {
             if (isEditMode && !placingBatch) {
                const ptr = stageRef.current?.getRelativePointerPosition();
                if (ptr) addSeat(snapToGrid(ptr.x), snapToGrid(ptr.y));
             }
        }}
        scaleX={stageScale} scaleY={stageScale} x={stagePosition.x} y={stagePosition.y}
        onContextMenu={(e) => e.evt.preventDefault()}
      >
        <Layer>
          <Rect name="venue-background" x={0} y={0} width={VIRTUAL_WIDTH} height={VIRTUAL_HEIGHT} fill="white" shadowBlur={20} shadowOpacity={0.1}/>
          {bgImageObj && <KonvaImage image={bgImageObj} width={VIRTUAL_WIDTH} height={VIRTUAL_HEIGHT} opacity={0.5} />}
          
          {isEditMode && (
              <Group opacity={0.3}>
                 {Array.from({ length: 40 }).map((_, i) => <Line key={`gx-${i}`} points={[i*100,0, i*100,VIRTUAL_HEIGHT]} stroke="#cbd5e1" strokeWidth={1} />)}
                 {Array.from({ length: 30 }).map((_, i) => <Line key={`gy-${i}`} points={[0,i*100, VIRTUAL_WIDTH,i*100]} stroke="#cbd5e1" strokeWidth={1} />)}
              </Group>
          )}

          {selectionRect && <Rect x={selectionRect.x} y={selectionRect.y} width={selectionRect.w} height={selectionRect.h} fill="rgba(59, 130, 246, 0.2)" stroke="#2563eb" dash={[4,4]} />}

          {placingBatch && mouseGridPos && (
             <Group>
               {Array.from({ length: placingBatch.rows }).map((_, r) => 
                 Array.from({ length: placingBatch.cols }).map((_, c) => (
                    <Rect key={`ghost-${r}-${c}`} x={mouseGridPos.x + c * 110} y={mouseGridPos.y + r * 160} width={SEAT_WIDTH} height={SEAT_HEIGHT} fill="blue" opacity={0.3} cornerRadius={4} />
                 ))
               )}
             </Group>
          )}

          {seats.map((seat) => (
             <Group 
                key={seat.id} id={seat.id}
                x={seat.x} y={seat.y}
                name={seat.type === 'shape' ? 'shape-stage' : 'seat-node'}
                draggable={isEditMode && !seat.isPinned && !isSequencing} 
                onDragStart={(e) => handleDragStart(e, seat.id)}
                onDragMove={(e) => handleDragMove(e, seat)}
                onDragEnd={(e) => {
                    const newX = snapToGrid(e.target.x());
                    const newY = snapToGrid(e.target.y());
                    updateSeatPosition(seat.id, newX, newY);
                    e.target.to({ x: newX, y: newY, duration: 0.1 });
                }}
                onClick={(e) => {
                    if(isSequencing) { e.cancelBubble = true; applyRankToSeat(seat.id); return; }
                    if(isEditMode) {
                        e.cancelBubble = true;
                        if(e.evt.shiftKey || e.evt.ctrlKey) addToSelection([seat.id]);
                        else setSelection([seat.id]);
                    }
                }}
                onContextMenu={(e) => handleContextMenu(e, seat)}
             >
                {seat.type === 'shape' ? (
                    <Group>
                         <Rect width={seat.width} height={seat.height} fill="#e2e8f0" stroke="#94a3b8" cornerRadius={4} />
                         <Text text={seat.label} width={seat.width} align="center" y={(seat.height||0)/2 - 10} fontSize={24} fill="#64748b"/>
                    </Group>
                ) : ( renderSeatContent(seat) )}
             </Group>
          ))}

          <Transformer ref={transformerRef} boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 50 || newBox.height < 50) return oldBox;
              return newBox;
          }}/>
        </Layer>
      </Stage>
    </div>
  );
};