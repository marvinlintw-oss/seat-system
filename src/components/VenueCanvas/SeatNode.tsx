// src/components/VenueCanvas/SeatNode.tsx
import React, { memo, useState } from 'react';
import { Group, Rect, Text, Circle, Label, Tag } from 'react-konva'; 
import { useProjectStore } from '../../store/useProjectStore';
import type { Seat, Person } from '../../types';
import type Konva from 'konva';

export const SEAT_WIDTH = 100;
export const SEAT_HEIGHT = 150;

interface SeatNodeProps {
  seat: Seat;
  isSelected: boolean;
  isEditMode: boolean;
  isSequencing: boolean;
  rankSequenceCounter: number;
  isNumbering: boolean;
  numberSequenceCounter: number;
  onDragStart: (e: Konva.KonvaEventObject<DragEvent>, seatId: string) => void;
  onDragMove: (e: Konva.KonvaEventObject<DragEvent>, seat: Seat) => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>, seat: Seat) => void;
  onClick: (e: Konva.KonvaEventObject<MouseEvent>, seat: Seat) => void;
  onContextMenu: (e: Konva.KonvaEventObject<PointerEvent>, seat: Seat) => void;
  onUnassign: (seatId: string) => void;
  onTransformEnd?: (e: Konva.KonvaEventObject<Event>, seat: Seat) => void;
}

export const SeatNode: React.FC<SeatNodeProps> = memo(({
  seat, isSelected, isEditMode, isSequencing, rankSequenceCounter, isNumbering, numberSequenceCounter,
  onDragStart, onDragMove, onDragEnd, onClick, onContextMenu, onUnassign, onTransformEnd
}) => {
  const { personnel, categories } = useProjectStore();
  const [showTooltip, setShowTooltip] = useState(false);

  const occupant = personnel.find((p: Person) => p.id === seat.assignedPersonId);
  
  const zoneCat = categories.find(c => c.label === seat.zoneCategory);
  const zoneColor = zoneCat ? zoneCat.color : '#ffffff'; 
  const personCat = occupant ? categories.find(c => c.label === occupant.category) : null;
  const personBg = personCat ? (personCat.personColor || personCat.color) : '#ffffff';

  const stroke = seat.isPinned ? '#ef4444' : (isSelected ? '#2563eb' : '#94a3b8');
  const strokeWidth = isSelected ? 3 : 2;

  const isDraggable = (isEditMode && !seat.isPinned && !isSequencing && !isNumbering) || (!isEditMode && !!occupant);

  const shapeW = Math.max(10, seat.width || 600);
  const shapeH = Math.max(10, seat.height || 150);

  const handleDragStartLocal = (e: Konva.KonvaEventObject<DragEvent>) => {
      setShowTooltip(false);
      const group = e.currentTarget as Konva.Group;
      const bg = group.findOne('.seat-bg') as Konva.Rect | undefined;
      if (bg) bg.shadowBlur(0);
      onDragStart(e, seat.id);
  };
  
  const handleDragEndLocal = (e: Konva.KonvaEventObject<DragEvent>) => {
      const group = e.currentTarget as Konva.Group;
      const bg = group.findOne('.seat-bg') as Konva.Rect | undefined;
      if (bg) bg.shadowBlur(5);
      onDragEnd(e, seat);
  };

  return (
    <Group 
      id={seat.id} x={seat.x} y={seat.y}
      name={seat.type === 'shape' ? 'shape-stage' : 'seat-node'}
      draggable={isDraggable} 
      onDragStart={handleDragStartLocal}
      onDragMove={(e) => onDragMove(e, seat)}
      onDragEnd={handleDragEndLocal}
      onClick={(e) => onClick(e, seat)}
      onContextMenu={(e) => onContextMenu(e, seat)}
      onTransformEnd={(e) => onTransformEnd && onTransformEnd(e, seat)}
      onMouseEnter={() => (occupant?.remarks || occupant?.serialNumber) && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {seat.type === 'shape' ? (
        <Group>
          <Rect width={shapeW} height={shapeH} fill="#e2e8f0" stroke="#94a3b8" cornerRadius={4} perfectDrawEnabled={false} />
          <Text text={seat.label} width={shapeW} align="center" y={shapeH/2 - 10} fontSize={24} fill="#64748b" listening={false} wrap="word" />
        </Group>
      ) : (
        <Group>
          {/* 主底色 */}
          <Rect name="seat-bg" width={SEAT_WIDTH} height={SEAT_HEIGHT} fill={zoneColor} stroke={stroke} strokeWidth={strokeWidth} cornerRadius={4} shadowColor="black" shadowOpacity={0.1} shadowBlur={5} perfectDrawEnabled={false} />
          
          {/* 頂部灰色條 */}
          <Rect x={0} y={0} width={SEAT_WIDTH} height={25} fill="rgba(0,0,0,0.1)" cornerRadius={[4,4,0,0]} stroke={stroke} strokeWidth={0} perfectDrawEnabled={false} />
          
          {/* 【完美視覺】序號標籤：整合在頂部左側，加上半透明白底自然融入區塊顏色 */}
          {occupant?.serialNumber && (
            <Group x={0} y={0} listening={false}>
              <Rect width={28} height={25} fill="rgba(255,255,255,0.6)" cornerRadius={[4,0,0,0]} perfectDrawEnabled={false} />
              <Text text={occupant.serialNumber} x={0} y={7} width={28} align="center" fontSize={11} fill="#334155" fontStyle="bold" wrap="none" />
            </Group>
          )}

          {/* 座位編號：若有序號，編號自動往右縮避免重疊 */}
          <Text text={seat.label} x={occupant?.serialNumber ? 28 : 0} y={7} width={occupant?.serialNumber ? SEAT_WIDTH - 28 : SEAT_WIDTH} align="center" fontSize={12} fontStyle="bold" fill="#1e293b" listening={false} wrap="none" />
          
          {/* 人員底色區塊 */}
          <Rect x={0} y={25} width={SEAT_WIDTH} height={SEAT_HEIGHT-25} fill={personBg} cornerRadius={[0,0,4,4]} perfectDrawEnabled={false} />
          
          {occupant ? (
            <Group listening={false}>
              <Text text={occupant.organization} x={4} y={35} width={SEAT_WIDTH-8} align="center" fontSize={11} fill="#1e293b" fontStyle="bold" wrap="word" height={28} ellipsis={true} />
              <Text text={occupant.name} x={2} y={65} width={SEAT_WIDTH-4} align="center" fontSize={18} fill="#0f172a" fontStyle="bold" wrap="word" height={44} ellipsis={true} />
              <Text text={occupant.title} x={4} y={110} width={SEAT_WIDTH-8} align="center" fontSize={12} fill="#334155" wrap="word" height={32} ellipsis={true} />
              
              {/* 備註圖示 */}
              {occupant.remarks && <Text text="📝" x={SEAT_WIDTH - 20} y={30} fontSize={12} />}
            </Group>
          ) : (
            <>
              {seat.zoneCategory ? (
                <Text text={seat.zoneCategory} x={2} y={65} width={SEAT_WIDTH-4} align="center" fontSize={18} fill={zoneColor} fontStyle="bold" wrap="word" height={44} ellipsis={true} listening={false} />
              ) : (
                <Text text="空位" x={0} y={80} width={SEAT_WIDTH} align="center" fontSize={14} fill="rgba(0,0,0,0.3)" listening={false} wrap="word"/>
              )}
            </>
          )}

          {/* Hover 浮現的 Tooltip */}
          {showTooltip && (
            <Label x={SEAT_WIDTH / 2} y={-10} listening={false}>
              <Tag fill="#fffbeb" stroke="#f59e0b" pointerDirection="down" pointerWidth={10} pointerHeight={10} lineJoin="round" shadowColor="black" shadowBlur={10} shadowOpacity={0.2} />
              <Text text={`${occupant?.serialNumber ? '#' + occupant.serialNumber + ' ' : ''}${occupant?.remarks || '無備註'}`} padding={8} fill="#92400e" fontSize={12} fontStyle="bold" wrap="word" width={150} />
            </Label>
          )}

          {!isEditMode && occupant && (
            <Group x={80} y={20} onClick={(e) => { e.cancelBubble=true; onUnassign(seat.id); }}>
              <Circle radius={8} fill="#ef4444" />
              <Text text="×" x={-3} y={-4} fontSize={10} fill="white" fontStyle="bold" listening={false}/>
            </Group>
          )}

          {isEditMode && (
            <Group x={SEAT_WIDTH-25} y={SEAT_HEIGHT-25} listening={false}>
              <Rect width={25} height={20} fill="#ef4444" cornerRadius={4} perfectDrawEnabled={false}/>
              <Text text={String(seat.rankWeight)} x={0} y={4} width={25} align="center" fill="white" fontSize={10} fontStyle="bold"/>
            </Group>
          )}

          {/* 【修正黃色報錯】明確使用這些 Counter，不再顯示 unused 警告 */}
          {isSequencing && (
            <Group x={SEAT_WIDTH/2} y={SEAT_HEIGHT/2} listening={false}>
              <Circle radius={15} fill="rgba(37, 99, 235, 0.9)" />
              <Text text={String(rankSequenceCounter)} x={-15} y={-6} width={30} align="center" fill="white" fontSize={12} fontStyle="bold" />
            </Group>
          )}

          {isNumbering && (
            <Group x={SEAT_WIDTH/2} y={SEAT_HEIGHT/2} listening={false}>
              <Circle radius={15} fill="rgba(34, 197, 94, 0.9)" />
              <Text text={String(numberSequenceCounter)} x={-15} y={-6} width={30} align="center" fill="white" fontSize={12} fontStyle="bold" />
            </Group>
          )}
        </Group>
      )}
    </Group>
  );
});