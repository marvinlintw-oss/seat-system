// src/hooks/useCanvasControls.ts
import { useState, useRef, useCallback } from 'react';
import type Konva from 'konva';
import { useVenueStore } from '../store/useVenueStore';
import type { Seat } from '../types';

interface CanvasControlsOptions {
  containerRef: React.RefObject<HTMLDivElement>;
  placingBatch: { rows: number; cols: number } | null;
  setMouseGridPos: (pos: { x: number; y: number } | null) => void;
  setSelectionRect: (rect: { x: number; y: number; w: number; h: number } | null) => void;
  selectionRect: { x: number; y: number; w: number; h: number } | null;
  clearContextMenu: () => void;
  GRID_SIZE: number;
}

export const useCanvasControls = ({
  containerRef, placingBatch, setMouseGridPos, setSelectionRect, selectionRect, clearContextMenu, GRID_SIZE
}: CanvasControlsOptions) => {
  const { isEditMode, setStageScale, setStagePosition, addToSelection, clearSelection, seats } = useVenueStore();

  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const isSelecting = useRef(false);
  const selectStartPos = useRef({ x: 0, y: 0 });

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const scaleBy = 1.05;
    const stage = e.target.getStage();
    if (!stage) return;
    
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const mousePointTo = { x: (pointer.x - stage.x()) / oldScale, y: (pointer.y - stage.y()) / oldScale };
    let newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    newScale = Math.max(0.1, Math.min(newScale, 5));

    setStageScale(newScale);
    setStagePosition({ x: pointer.x - mousePointTo.x * newScale, y: pointer.y - mousePointTo.y * newScale });
  }, [setStageScale, setStagePosition]);

  const handleStageMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    clearContextMenu();
    if (e.evt.button === 2) return; 

    const isBackground = e.target === e.target.getStage() || e.target.name() === 'venue-background';

    if (e.evt.button === 0 && isBackground) {
      if (isEditMode && !placingBatch && e.evt.shiftKey) {
        const stage = e.target.getStage();
        const ptr = stage?.getRelativePointerPosition();
        if(ptr) {
          selectStartPos.current = ptr;
          isSelecting.current = true;
          clearSelection(); 
        }
        return;
      }

      if (isEditMode && e.evt.ctrlKey) return; 

      if (!e.evt.shiftKey && !e.evt.ctrlKey) {
        clearSelection(); // 點擊空白處清空選取
        setIsPanning(true);
        setLastMousePos({ x: e.evt.clientX, y: e.evt.clientY });
        if(containerRef.current) containerRef.current.style.cursor = 'grab';
      }
    }
  }, [isEditMode, placingBatch, clearContextMenu, clearSelection, containerRef]);

  const handleStageMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;

    if (isPanning) {
      const dx = e.evt.clientX - lastMousePos.x;
      const dy = e.evt.clientY - lastMousePos.y;
      setStagePosition({ x: stage.x() + dx / 3, y: stage.y() + dy / 3 });
      setLastMousePos({ x: e.evt.clientX, y: e.evt.clientY });
      return; 
    }

    if (placingBatch && stage.getRelativePointerPosition()) {
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

    if (isSelecting.current && isEditMode) {
      const ptr = stage.getRelativePointerPosition();
      if (ptr) {
        setSelectionRect({
          x: Math.min(selectStartPos.current.x, ptr.x), y: Math.min(selectStartPos.current.y, ptr.y),
          w: Math.abs(ptr.x - selectStartPos.current.x), h: Math.abs(ptr.y - selectStartPos.current.y)
        });
      }
    }
  }, [isPanning, lastMousePos, placingBatch, isSelecting, isEditMode, GRID_SIZE, setMouseGridPos, setSelectionRect, setStagePosition]);

  const handleStageMouseUp = useCallback(() => {
    setIsPanning(false);
    if (containerRef.current) containerRef.current.style.cursor = isEditMode ? 'crosshair' : 'default';

    if (isSelecting.current && selectionRect) {
       // 全範圍覆蓋判定
       const selected = seats.filter((s: Seat) => 
          s.isVisible !== false && s.type !== 'shape' &&
          s.x >= selectionRect.x &&
          (s.x + (s.width || 100)) <= (selectionRect.x + selectionRect.w) &&
          s.y >= selectionRect.y &&
          (s.y + (s.height || 150)) <= (selectionRect.y + selectionRect.h)
       );
       addToSelection(selected.map((s: Seat) => s.id));
    }
    isSelecting.current = false;
    setSelectionRect(null);
  }, [isEditMode, selectionRect, seats, addToSelection, setSelectionRect, containerRef]);

  return { isPanning, handleWheel, handleStageMouseDown, handleStageMouseMove, handleStageMouseUp };
};