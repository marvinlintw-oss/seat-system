// src/components/VenueCanvas/VenueCanvas.tsx
import React, { useRef, useState, useEffect, useCallback } from 'react';
import Konva from 'konva';
import { Stage, Layer, Rect, Group, Line, Image as KonvaImage, Transformer } from 'react-konva';
import { useVenueStore, VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from '../../store/useVenueStore';
import { usePersonnelStore } from '../../store/usePersonnelStore';
import { useProjectStore } from '../../store/useProjectStore';
import { useCanvasControls } from '../../hooks/useCanvasControls';
import { SeatNode, SEAT_WIDTH, SEAT_HEIGHT } from './SeatNode';
import { GridGenerateModal } from '../Modals/GridGenerateModal'; 
import { Minus, Plus, Grid3X3, Eraser, RotateCcw, HelpCircle, X, Maximize } from 'lucide-react';
import type { Seat } from '../../types';

const GRID_SIZE = 10;

interface VenueCanvasProps {
    forcedViewMode?: 'seat' | 'photo';
    isReadOnly?: boolean;
}

export const VenueCanvas: React.FC<VenueCanvasProps> = ({ forcedViewMode, isReadOnly = false }) => {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const dragStartPosRef = useRef<{ [seatId: string]: { x: number, y: number } }>({});

  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, seatId: string } | null>(null);
  const [batchEditData, setBatchEditData] = useState<{ label?: string, rankWeight?: number, zone?: string }>({});
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [bgImageObj, setBgImageObj] = useState<HTMLImageElement | null>(null);

  const [placingBatch, setPlacingBatch] = useState<{ rows: number, cols: number } | null>(null);
  const [mouseGridPos, setMouseGridPos] = useState<{ x: number, y: number } | null>(null);
  const [selectionRect, setSelectionRect] = useState<{x:number, y:number, w:number, h:number} | null>(null);

  const [localScale, setLocalScale] = useState(0.4);
  const [localPos, setLocalPos] = useState({ x: 0, y: 50 });

  const { 
    isEditMode, selectedSeatIds, selectedPersonForAssign, setSelectedPersonForAssign,
    isSequencing, rankSequenceCounter, isNumbering, numberSequenceCounter,
    addSeat, updateSeatPosition, unassignSeat, undo, moveSeatsBatch,
    setSelection, addToSelection, clearSelection, copySelection, pasteSelection, deleteSelectedSeats,
    updateSeatAssignment, toggleMainStage,
    saveHistory, clearHistory
  } = useVenueStore();

  const { syncSeatingStatus } = usePersonnelStore();
  const { activeSessionId, sessions, categories, activeViewMode, activePhotoBatchId } = useProjectStore();
  
  const currentViewMode = forcedViewMode || activeViewMode;
  const activeSession = sessions.find(s => s.id === activeSessionId);
  
  let seats: Seat[] = [];
  if (currentViewMode === 'photo') {
      const batch = activeSession?.photoBatches?.find(b => b.id === activePhotoBatchId);
      seats = batch ? batch.spots : [];
  } else {
      seats = activeSession?.venue.seats || [];
  }

  useEffect(() => {
      if(!isReadOnly) clearHistory();
      setLocalScale(activeSession?.venue.stageScale || 0.4);
      setLocalPos(activeSession?.venue.stagePosition || { x: 0, y: 50 });
  }, [activeSessionId, currentViewMode, activePhotoBatchId, clearHistory, isReadOnly, activeSession?.venue.stageScale, activeSession?.venue.stagePosition]);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setSize({ width: containerRef.current.offsetWidth, height: containerRef.current.offsetHeight });
      }
    };
    window.addEventListener('resize', updateSize);
    updateSize();
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (size.width > 0 && localPos.x === 0 && localPos.y === 50) {
        setLocalScale(0.4);
        setLocalPos({ x: (size.width - VIRTUAL_WIDTH * 0.4) / 2, y: 50 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width]);

  const backgroundImage = activeSession?.venue.backgroundImage || null;

  const updateSessionVenue = (updates: Record<string, any>) => {
    if (!activeSessionId) return;
    useProjectStore.setState(state => ({
      sessions: state.sessions.map(s => s.id === activeSessionId ? { ...s, venue: { ...s.venue, ...updates } } : s)
    }));
  };

  const setBackgroundImage = (val: string | null) => updateSessionVenue({ backgroundImage: val });

  const { handleWheel, handleStageMouseDown, handleStageMouseMove, handleStageMouseUp } = useCanvasControls({
    containerRef, placingBatch, setMouseGridPos,
    setSelectionRect, selectionRect, clearContextMenu: () => setContextMenu(null), GRID_SIZE,
    setStageScale: setLocalScale,
    setStagePosition: setLocalPos,
    currentViewMode
  });

  useEffect(() => {
      if (isEditMode && !isReadOnly && transformerRef.current && stageRef.current) {
         const selectedNodes = stageRef.current.find('.shape-stage');
         const stageNode = selectedNodes.find(n => selectedSeatIds.includes(n.id()));
         if (stageNode) {
             transformerRef.current.nodes([stageNode]);
             transformerRef.current.getLayer()?.batchDraw();
         } else {
             transformerRef.current.nodes([]);
         }
      }
  
      const handleKeyDown = (e: KeyboardEvent) => {
        if (!isEditMode || isReadOnly) return;
        if (e.key === 'Delete') { deleteSelectedSeats(); syncSeatingStatus(); }
        if (e.ctrlKey || e.metaKey) {
          if (e.key === 'c') copySelection();
          if (e.key === 'v') { pasteSelection(20, 20); syncSeatingStatus(); }
          if (e.key === 'z') { e.preventDefault(); undo(); syncSeatingStatus(); }
        }
        if (e.key === 'Escape') {
          if (placingBatch) setPlacingBatch(null);
          clearSelection();
          setContextMenu(null);
          setSelectedPersonForAssign(null); 
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditMode, isReadOnly, selectedSeatIds, deleteSelectedSeats, syncSeatingStatus, copySelection, pasteSelection, undo, placingBatch, clearSelection, setSelectedPersonForAssign]);

  useEffect(() => {
    if (backgroundImage) {
      const img = new window.Image();
      img.src = backgroundImage;
      img.onload = () => setBgImageObj(img);
    } else setBgImageObj(null);
  }, [backgroundImage]);

  const snapToGrid = (val: number) => Math.round(val / GRID_SIZE) * GRID_SIZE;

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.evt.button === 2 || isReadOnly) return;
      if (isEditMode && !placingBatch) {
         const isBackground = e.target === e.target.getStage() || e.target.name() === 'venue-background';
         if (isBackground && e.evt.ctrlKey) {
             const ptr = stageRef.current?.getRelativePointerPosition();
             if (ptr) addSeat(snapToGrid(ptr.x), snapToGrid(ptr.y), currentViewMode);
         }
      }
      
      if (placingBatch && mouseGridPos) {
         saveHistory(); 
         useProjectStore.setState(state => {
             const currSession = state.sessions.find(s => s.id === activeSessionId);
             if (!currSession) return state;

             let currentSpots = currentViewMode === 'photo' 
                 ? currSession.photoBatches?.find(b => b.id === activePhotoBatchId)?.spots || [] 
                 : currSession.venue.seats;

             let counter = currentSpots.length + 1;
             const newSeats: Seat[] = [];

             for (let r = 0; r < placingBatch.rows; r++) {
                 for (let c = 0; c < placingBatch.cols; c++) {
                     newSeats.push({
                         id: `seat-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                         x: mouseGridPos.x + c * 110, y: mouseGridPos.y + r * 160,
                         width: SEAT_WIDTH, height: SEAT_HEIGHT, label: `${counter++}`,
                         type: currentViewMode === 'photo' ? 'photo' : 'seat',
                         assignedPersonId: null, rankWeight: 50, isPinned: false, isVisible: true
                     });
                 }
             }

             return {
                 sessions: state.sessions.map(s => {
                     if (s.id !== activeSessionId) return s;
                     if (currentViewMode === 'photo') {
                         return { ...s, photoBatches: s.photoBatches?.map(b => b.id === activePhotoBatchId ? { ...b, spots: [...b.spots, ...newSeats] } : b) || [] };
                     }
                     return { ...s, venue: { ...s.venue, seats: [...s.venue.seats, ...newSeats] } };
                 })
             };
         });
         setPlacingBatch(null);
      }
  };

  const handleSeatContextMenu = useCallback((e: Konva.KonvaEventObject<PointerEvent>, seat: Seat) => {
      e.evt.preventDefault();
      e.cancelBubble = true;
      if(isReadOnly) return;
      if (!selectedSeatIds.includes(seat.id)) setSelection([seat.id]);
      const stage = e.target.getStage();
      const ptr = stage?.getPointerPosition();
      if(ptr) { setContextMenu({ x: ptr.x, y: ptr.y, seatId: seat.id }); setBatchEditData({}); }
  }, [selectedSeatIds, setSelection, isReadOnly]);

  const handleBatchUpdate = () => {
      saveHistory(); 
      useProjectStore.setState(state => ({
          sessions: state.sessions.map(s => {
              if (s.id !== activeSessionId) return s;
              const updater = (sts: Seat[]) => sts.map(st => {
                  if (!selectedSeatIds.includes(st.id)) return st;
                  return {
                      ...st,
                      ...(batchEditData.label !== undefined && { label: batchEditData.label }),
                      ...(batchEditData.rankWeight !== undefined && { rankWeight: Math.max(0, Math.min(100, batchEditData.rankWeight)) }),
                      ...(batchEditData.zone !== undefined && { zoneCategory: batchEditData.zone === '' ? undefined : batchEditData.zone })
                  };
              });

              if (currentViewMode === 'photo') {
                  return { ...s, photoBatches: s.photoBatches?.map(b => b.id === activePhotoBatchId ? { ...b, spots: updater(b.spots) } : b) || [] };
              }
              return { ...s, venue: { ...s.venue, seats: updater(s.venue.seats) } };
          })
      }));
      setContextMenu(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isEditMode || isReadOnly) return;
    const personId = e.dataTransfer.getData('personId');
    if (!personId || !stageRef.current) return;
    const stage = stageRef.current;
    stage.setPointersPositions(e);
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const rawX = (pointer.x - stage.x()) / localScale;
    const rawY = (pointer.y - stage.y()) / localScale;
    const closestSeat = seats.find(seat => 
      seat.isVisible !== false && seat.type !== 'shape' && 
      rawX >= seat.x && rawX <= seat.x + SEAT_WIDTH && rawY >= seat.y && rawY <= seat.y + SEAT_HEIGHT
    );
    if (closestSeat) { 
        saveHistory(); 
        updateSeatAssignment(closestSeat.id, personId); 
        syncSeatingStatus(); 
    }
  };

  const handleSeatDragStart = useCallback((e: Konva.KonvaEventObject<DragEvent>, seatId: string) => {
      if (isEditMode && !isReadOnly) {
          let currentSelection = selectedSeatIds;
          if (!selectedSeatIds.includes(seatId)) {
              if (!e.evt.shiftKey) { setSelection([seatId]); currentSelection = [seatId]; } 
              else { addToSelection([seatId]); currentSelection = [...selectedSeatIds, seatId]; }
          }
          const startPositions: Record<string, {x: number, y: number}> = {};
          currentSelection.forEach(id => {
              const s = seats.find(seat => seat.id === id);
              if (s) startPositions[id] = { x: s.x, y: s.y };
          });
          dragStartPosRef.current = startPositions;
      }
  }, [isEditMode, isReadOnly, selectedSeatIds, seats, addToSelection, setSelection]);

  const handleSeatDragMove = useCallback((e: Konva.KonvaEventObject<DragEvent>, seat: Seat) => {
      if (!isEditMode || isReadOnly) return;
      const targetX = e.evt.shiftKey ? e.target.x() : Math.round(e.target.x() / 10) * 10;
      const targetY = e.evt.shiftKey ? e.target.y() : Math.round(e.target.y() / 10) * 10;
      e.target.x(targetX); e.target.y(targetY);

      const startPos = dragStartPosRef.current[seat.id];
      if (startPos) {
          const deltaX = targetX - startPos.x;
          const deltaY = targetY - startPos.y;
          selectedSeatIds.forEach(id => {
              if (id !== seat.id) {
                  const otherNode = stageRef.current?.findOne(`#${id}`);
                  const otherStartPos = dragStartPosRef.current[id];
                  if (otherNode && otherStartPos) {
                      otherNode.x(otherStartPos.x + deltaX);
                      otherNode.y(otherStartPos.y + deltaY);
                  }
              }
          });
      }
  }, [isEditMode, isReadOnly, selectedSeatIds]);

  const handleSeatDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>, seat: Seat) => {
      if(isReadOnly) return;
      if (isEditMode) {
          const targetX = e.evt.shiftKey ? e.target.x() : Math.round(e.target.x() / 10) * 10;
          const targetY = e.evt.shiftKey ? e.target.y() : Math.round(e.target.y() / 10) * 10;
          e.target.x(targetX); e.target.y(targetY);

          const startPos = dragStartPosRef.current[seat.id];
          if (startPos) {
              const deltaX = targetX - startPos.x;
              const deltaY = targetY - startPos.y;
              if (deltaX !== 0 || deltaY !== 0) {
                  saveHistory();
                  const otherSelectedIds = selectedSeatIds.filter(id => id !== seat.id);
                  if (otherSelectedIds.length > 0) moveSeatsBatch(otherSelectedIds, deltaX, deltaY);
                  updateSeatPosition(seat.id, targetX, targetY);
              }
          }
          dragStartPosRef.current = {};
      } else {
          const stage = stageRef.current;
          const pointer = stage?.getPointerPosition();
          if (pointer && stage) {
              const rawX = (pointer.x - stage.x()) / localScale;
              const rawY = (pointer.y - stage.y()) / localScale;
              const targetSeat = seats.find(s => 
                  s.isVisible !== false && s.type !== 'shape' && 
                  rawX >= s.x && rawX <= s.x + SEAT_WIDTH && rawY >= s.y && rawY <= s.y + SEAT_HEIGHT
              );
              if (targetSeat && targetSeat.id !== seat.id) {
                  saveHistory();
                  const tempPersonId = targetSeat.assignedPersonId;
                  updateSeatAssignment(targetSeat.id, seat.assignedPersonId);
                  updateSeatAssignment(seat.id, tempPersonId);
                  syncSeatingStatus();
              }
          }
          e.target.to({ x: seat.x, y: seat.y, duration: 0.1 });
      }
  }, [isEditMode, isReadOnly, seats, selectedSeatIds, moveSeatsBatch, updateSeatPosition, updateSeatAssignment, syncSeatingStatus, saveHistory, localScale]);

  const handleSeatClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>, seat: Seat) => {
      // 在下方的座位區(唯讀)點擊某個人，把它「抓」起來
      if (isReadOnly) {
          if (seat.assignedPersonId) {
              e.cancelBubble = true;
              const isSame = selectedPersonForAssign === seat.assignedPersonId;
              setSelectedPersonForAssign(isSame ? null : seat.assignedPersonId);
          }
          return;
      }

      // 🟢 核心修復：在上方的拍照區，把「抓著的人」點擊放入空位
      if (!isReadOnly && !isEditMode && currentViewMode === 'photo') {
          const state = useProjectStore.getState();
          // 防呆：確認這個位子是不是被死掉的幽靈 ID 佔據
          const isOccupied = seat.assignedPersonId && state.personnel.some(p => p.id === seat.assignedPersonId);
          
          if (selectedPersonForAssign && !isOccupied && seat.type !== 'shape') {
              e.cancelBubble = true;
              saveHistory();

              // 🟢 進階優化：如果長官已經在這一拍的別的座位上，先把它拔掉 (實現無縫移動)
              const activeSession = state.sessions.find(s => s.id === activeSessionId);
              if (activeSession) {
                  const batch = activeSession.photoBatches?.find(b => b.id === activePhotoBatchId);
                  if (batch) {
                      const oldSeat = batch.spots.find(s => s.assignedPersonId === selectedPersonForAssign);
                      if (oldSeat) {
                          unassignSeat(oldSeat.id);
                      }
                  }
              }

              updateSeatAssignment(seat.id, selectedPersonForAssign);
              setSelectedPersonForAssign(null); 
              syncSeatingStatus();
              return;
          }
      }

      if(isSequencing) {
          e.cancelBubble = true; saveHistory();
          useProjectStore.setState(state => ({
              sessions: state.sessions.map(s => {
                  if (s.id !== activeSessionId) return s;
                  const updater = (sts: Seat[]) => sts.map(st => st.id === seat.id ? { ...st, rankWeight: Math.max(0, Math.min(100, rankSequenceCounter)) } : st);
                  if (currentViewMode === 'photo') return { ...s, photoBatches: s.photoBatches?.map(b => b.id === activePhotoBatchId ? { ...b, spots: updater(b.spots) } : b) || [] };
                  return { ...s, venue: { ...s.venue, seats: updater(s.venue.seats) } };
              })
          }));
          useVenueStore.setState({ rankSequenceCounter: rankSequenceCounter + 1 });
          return;
      }
      if(isNumbering) {
          e.cancelBubble = true; saveHistory();
          useProjectStore.setState(state => ({
              sessions: state.sessions.map(s => {
                  if (s.id !== activeSessionId) return s;
                  const updater = (sts: Seat[]) => sts.map(st => st.id === seat.id ? { ...st, label: String(numberSequenceCounter) } : st);
                  if (currentViewMode === 'photo') return { ...s, photoBatches: s.photoBatches?.map(b => b.id === activePhotoBatchId ? { ...b, spots: updater(b.spots) } : b) || [] };
                  return { ...s, venue: { ...s.venue, seats: updater(s.venue.seats) } };
              })
          }));
          useVenueStore.setState({ numberSequenceCounter: numberSequenceCounter + 1 });
          return;
      }
      if(isEditMode) {
          e.cancelBubble = true;
          if(e.evt.shiftKey || e.evt.ctrlKey) addToSelection([seat.id]);
          else setSelection([seat.id]);
      }
  }, [isReadOnly, selectedPersonForAssign, setSelectedPersonForAssign, currentViewMode, isEditMode, isSequencing, isNumbering, rankSequenceCounter, numberSequenceCounter, addToSelection, setSelection, activeSessionId, activePhotoBatchId, saveHistory, updateSeatAssignment, syncSeatingStatus, unassignSeat]);

  const handleSeatUnassign = useCallback((seatId: string) => { 
      saveHistory(); 
      unassignSeat(seatId); 
      syncSeatingStatus(); 
  }, [unassignSeat, syncSeatingStatus, saveHistory]);

  const handleSeatTransformEnd = useCallback((e: Konva.KonvaEventObject<Event>, seatToTransform: Seat) => {
      if (seatToTransform.type === 'shape') {
          const node = e.target;
          const scaleX = node.scaleX(); const scaleY = node.scaleY();
          node.scaleX(1); node.scaleY(1);
          const newWidth = Math.round((seatToTransform.width || 600) * scaleX);
          const newHeight = Math.round((seatToTransform.height || 150) * scaleY);
          const newX = Math.round(node.x() / 10) * 10;
          const newY = Math.round(node.y() / 10) * 10;
          
          saveHistory(); 
          const state = useProjectStore.getState();
          useProjectStore.setState({
              sessions: state.sessions.map(s => {
                  if (s.id !== activeSessionId) return s;
                  if (currentViewMode === 'photo') {
                      return { ...s, photoBatches: s.photoBatches?.map(b => b.id === activePhotoBatchId ? { ...b, spots: b.spots.map(st => st.id === seatToTransform.id ? { ...st, x: newX, y: newY, width: newWidth, height: newHeight } : st) } : b) }
                  }
                  return { ...s, venue: { ...s.venue, seats: s.venue.seats.map(st => st.id === seatToTransform.id ? { ...st, x: newX, y: newY, width: newWidth, height: newHeight } : st) } }
              })
          });
      }
  }, [activeSessionId, currentViewMode, activePhotoBatchId, saveHistory]);

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full h-full bg-slate-200 overflow-hidden ${isEditMode && !isReadOnly ? 'cursor-crosshair' : 'cursor-default'}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onContextMenu={(e) => e.preventDefault()}
    >
      <input type="file" ref={fileInputRef} onChange={(e) => {
          const file = e.target.files?.[0];
          if(file) { const reader = new FileReader(); reader.onload = () => setBackgroundImage(reader.result as string); reader.readAsDataURL(file); }
      }} className="hidden" accept="image/*" />

      {contextMenu && !isReadOnly && (
        <div className="absolute z-50 bg-white shadow-xl rounded-lg p-3 border border-slate-200 w-64" style={{ top: contextMenu.y, left: contextMenu.x }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2 border-b pb-2">
                <span className="font-bold text-sm">設定 ({selectedSeatIds.length} 個)</span>
                <button onClick={() => setContextMenu(null)}><X size={14}/></button>
            </div>
            <div className="space-y-3">
                <div className="flex gap-2 items-center">
                    <label className="text-xs w-12 text-slate-500">編號</label>
                    <input type="text" placeholder="輸入編號" className="border rounded px-2 py-1 text-sm flex-1" onChange={(e) => setBatchEditData(prev => ({...prev, label: e.target.value}))}/>
                </div>
                <div className="flex gap-2 items-center">
                    <label className="text-xs w-12 text-slate-500">優先度</label>
                    <input type="number" placeholder="0-100" className="border rounded px-2 py-1 text-sm flex-1" onChange={(e) => setBatchEditData(prev => ({...prev, rankWeight: Number(e.target.value)}))}/>
                </div>
                <div className="space-y-1">
                    <span className="text-xs text-slate-500 block mb-1">區塊屬性</span>
                    <div className="max-h-32 overflow-y-auto border rounded p-1 space-y-1">
                         <button onClick={() => setBatchEditData(prev => ({...prev, zone: ''}))} className={`w-full text-left px-2 py-1 text-xs rounded hover:bg-slate-100 ${batchEditData.zone === '' ? 'bg-blue-50 ring-1 ring-blue-200' : ''}`}>
                            <span className="inline-block w-3 h-3 rounded-full bg-slate-200 mr-2 align-middle"></span>無屬性
                         </button>
                         {categories.map((cat: any) => (
                             <button key={cat.id} onClick={() => setBatchEditData(prev => ({...prev, zone: cat.label}))} className={`w-full text-left px-2 py-1 text-xs rounded hover:bg-slate-100 ${batchEditData.zone === cat.label ? 'bg-blue-50 ring-1 ring-blue-200' : ''}`}>
                                <span className="inline-block w-3 h-3 rounded-full mr-2 align-middle border border-slate-300" style={{backgroundColor: cat.color}}></span>{cat.label}
                             </button>
                         ))}
                    </div>
                </div>
                <button onClick={handleBatchUpdate} className="w-full bg-blue-600 text-white text-xs py-2 rounded font-bold mt-2">套用變更</button>
            </div>
        </div>
      )}

      {!isReadOnly && (
        <>
          <div className="absolute top-4 right-4 z-10">
            <button onClick={() => setShowHelp(!showHelp)} className="bg-white p-2 rounded-full shadow-md text-slate-600 hover:text-blue-600 transition"><HelpCircle size={24} /></button>
          </div>
          
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur px-6 py-3 rounded-full shadow-2xl z-10 flex items-center gap-6 border border-slate-200">
            <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
              <button onClick={() => setLocalScale(Math.max(0.1, localScale - 0.1))} className="p-2 hover:bg-slate-100 rounded-full"><Minus size={18}/></button>
              <span className="text-sm font-mono w-12 text-center font-bold text-slate-700">{(localScale * 100).toFixed(0)}%</span>
              <button onClick={() => setLocalScale(Math.min(5, localScale + 0.1))} className="p-2 hover:bg-slate-100 rounded-full"><Plus size={18}/></button>
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
        </>
      )}

      {showHelp && (
        <div className="absolute top-16 right-4 bg-white p-5 rounded-xl shadow-2xl w-80 md:w-96 z-50 border border-slate-200 text-sm max-h-[80vh] overflow-y-auto custom-scrollbar">
          <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
              <h2 className="font-bold text-slate-800 text-base">操作快捷鍵指南 (v4.0)</h2>
              <button onClick={() => setShowHelp(false)} className="p-1 hover:bg-slate-100 rounded-full text-slate-500 transition"><X size={18}/></button>
          </div>
          <div className="space-y-4 text-slate-600">
            <div>
                <strong className="text-slate-800 flex items-center gap-1 mb-1">🔍 視角控制</strong>
                <ul className="list-disc pl-5 space-y-1.5 text-xs">
                    <li><strong>平移畫布：</strong>在空白處按住「左鍵」拖曳</li>
                    <li><strong>縮放畫布：</strong>滑鼠滾輪，或使用下方 <kbd className="bg-slate-100 border border-slate-300 shadow-sm px-1.5 rounded font-mono">+</kbd></li>
                </ul>
            </div>
          </div>
        </div>
      )}

      {showBatchModal && (
        <GridGenerateModal onClose={() => setShowBatchModal(false)} onConfirm={(rows, cols) => { setPlacingBatch({rows, cols}); setShowBatchModal(false); }} />
      )}

      {size.width > 0 && size.height > 0 && (
        <Stage 
          width={size.width} height={size.height} 
          ref={stageRef}
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleStageMouseMove}
          onMouseUp={handleStageMouseUp}
          onClick={handleStageClick}
          onWheel={handleWheel}
          
          scaleX={localScale} scaleY={localScale} x={localPos.x} y={localPos.y}
          
          onContextMenu={(e) => e.evt.preventDefault()}
        >
          <Layer>
            <Rect name="venue-background" x={0} y={0} width={VIRTUAL_WIDTH} height={VIRTUAL_HEIGHT} fill={isReadOnly ? "#f8fafc" : "white"} shadowBlur={isReadOnly ? 0 : 20} shadowOpacity={0.1}/>
            {bgImageObj && <KonvaImage image={bgImageObj} width={VIRTUAL_WIDTH} height={VIRTUAL_HEIGHT} opacity={0.5} />}
            
            {isEditMode && !isReadOnly && (
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
               <SeatNode
                  key={seat.id}
                  seat={seat}
                  isSelected={selectedSeatIds.includes(seat.id)}
                  isEditMode={isEditMode}
                  isSequencing={isSequencing}
                  rankSequenceCounter={rankSequenceCounter}
                  isNumbering={isNumbering}
                  numberSequenceCounter={numberSequenceCounter}
                  isReadOnly={isReadOnly}
                  isPickedUp={seat.assignedPersonId === selectedPersonForAssign && selectedPersonForAssign !== null}
                  onDragStart={handleSeatDragStart}
                  onDragMove={handleSeatDragMove}
                  onDragEnd={handleSeatDragEnd}
                  onClick={handleSeatClick}
                  onContextMenu={handleSeatContextMenu}
                  onUnassign={handleSeatUnassign}
                  onTransformEnd={handleSeatTransformEnd}
               />
            ))}

            <Transformer ref={transformerRef} boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 50 || newBox.height < 50) return oldBox;
                return newBox;
            }}/>
          </Layer>
        </Stage>
      )}
    </div>
  );
};