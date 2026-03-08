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
  const { personnel, categories, activeSessionId, sessions } = useProjectStore();
  const [showTooltip, setShowTooltip] = useState(false);

  const occupant = personnel.find((p: Person) => p.id === seat.assignedPersonId);
  const zoneCat = categories.find(c => c.label === seat.zoneCategory);
  const zoneColor = zoneCat ? zoneCat.color : '#ffffff'; 
  const personCat = occupant ? categories.find(c => c.label === occupant.category) : null;
  const personBg = personCat ? (personCat.personColor || personCat.color) : '#ffffff';

  const activeSession = sessions.find(s => s.id === activeSessionId);
  let participatingBatches: any[] = [];
  if (occupant) {
      participatingBatches = (activeSession?.photoBatches || []).filter(batch =>
          batch.spots.some(spot => spot.assignedPersonId === occupant.id)
      );
  }
  
  const hasPhoto = participatingBatches.length > 0;
  const batchNumbers = participatingBatches.map(b => {
      const match = b.name.match(/\d+/);
      return match ? match[0] : b.name;
  });
  const photoText = hasPhoto ? `📷 參與 ${batchNumbers.join(', ')} 拍` : '';
  const badgeColor = participatingBatches.length === 1 ? participatingBatches[0].color : '#475569';

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
      id={seat.id} x={seat.x} y={seat.y} name={seat.type === 'shape' ? 'shape-stage' : 'seat-node'}
      draggable={isDraggable} onDragStart={handleDragStartLocal} onDragMove={(e) => onDragMove(e, seat)} onDragEnd={handleDragEndLocal}
      onClick={(e) => onClick(e, seat)} onContextMenu={(e) => onContextMenu(e, seat)} onTransformEnd={(e) => onTransformEnd && onTransformEnd(e, seat)}
      onMouseEnter={() => (occupant?.remarks || occupant?.serialNumber) && setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}
    >
      {seat.type === 'shape' ? (
        <Group>
          <Rect width={shapeW} height={shapeH} fill="#e2e8f0" stroke="#94a3b8" cornerRadius={4} perfectDrawEnabled={false} />
          <Text text={seat.label} width={shapeW} align="center" y={shapeH/2 - 10} fontSize={24} fill="#64748b" listening={false} wrap="char" />
        </Group>
      ) : (
        <Group>
          <Rect name="seat-bg" width={SEAT_WIDTH} height={SEAT_HEIGHT} fill={zoneColor} stroke={stroke} strokeWidth={strokeWidth} cornerRadius={4} shadowColor="black" shadowOpacity={0.1} shadowBlur={5} perfectDrawEnabled={false} />
          <Rect x={0} y={0} width={SEAT_WIDTH} height={25} fill="rgba(0,0,0,0.1)" cornerRadius={[4,4,0,0]} stroke={stroke} strokeWidth={0} perfectDrawEnabled={false} />
          
          {occupant?.serialNumber && (
            <Group x={0} y={0} listening={false}>
              <Rect width={28} height={25} fill="rgba(255,255,255,0.6)" cornerRadius={[4,0,0,0]} perfectDrawEnabled={false} />
              <Text text={occupant.serialNumber} x={0} y={7} width={28} align="center" fontSize={11} fill="#334155" fontStyle="bold" wrap="none" />
            </Group>
          )}

          <Text text={seat.label} x={occupant?.serialNumber ? 28 : 0} y={7} width={occupant?.serialNumber ? SEAT_WIDTH - 28 : SEAT_WIDTH} align="center" fontSize={12} fontStyle="bold" fill="#1e293b" listening={false} wrap="none" />
          <Rect x={0} y={25} width={SEAT_WIDTH} height={SEAT_HEIGHT-25} fill={personBg} cornerRadius={[0,0,4,4]} perfectDrawEnabled={false} />
          
          {occupant ? (
            <Group listening={false}>
              {/* 【修正重點】全部改為 wrap="char" */}
              <Text text={occupant.organization} x={4} y={35} width={SEAT_WIDTH-8} align="center" fontSize={11} fill="#1e293b" fontStyle="bold" wrap="char" height={28} ellipsis={true} />
              <Text text={occupant.name} x={2} y={65} width={SEAT_WIDTH-4} align="center" fontSize={18} fill="#0f172a" fontStyle="bold" wrap="char" height={44} ellipsis={true} />
              <Text text={occupant.title} x={4} y={105} width={SEAT_WIDTH-8} align="center" fontSize={12} fill="#334155" wrap="char" height={hasPhoto ? 20 : 32} ellipsis={true} />
              {occupant.remarks && <Text text="📝" x={SEAT_WIDTH - 20} y={30} fontSize={12} />}
            </Group>
          ) : (
            <>
              {seat.zoneCategory ? (
                <Text text={seat.zoneCategory} x={2} y={65} width={SEAT_WIDTH-4} align="center" fontSize={18} fill={zoneColor} fontStyle="bold" wrap="char" height={44} ellipsis={true} listening={false} />
              ) : (
                <Text text="空位" x={0} y={80} width={SEAT_WIDTH} align="center" fontSize={14} fill="rgba(0,0,0,0.3)" listening={false} wrap="char"/>
              )}
            </>
          )}

          {hasPhoto && (
             <Group x={0} y={SEAT_HEIGHT - 22} listening={false}>
               <Rect width={SEAT_WIDTH} height={22} fill={badgeColor} cornerRadius={[0,0,4,4]} perfectDrawEnabled={false}/>
               <Text text={photoText} x={0} y={5} width={SEAT_WIDTH} align="center" fontSize={11} fill="white" fontStyle="bold" wrap="none" ellipsis={true} />
             </Group>
          )}

          {showTooltip && (
            <Label x={SEAT_WIDTH / 2} y={-10} listening={false}>
              <Tag fill="#fffbeb" stroke="#f59e0b" pointerDirection="down" pointerWidth={10} pointerHeight={10} lineJoin="round" shadowColor="black" shadowBlur={10} shadowOpacity={0.2} />
              <Text text={`${occupant?.serialNumber ? '#' + occupant.serialNumber + ' ' : ''}${occupant?.remarks || '無備註'}`} padding={8} fill="#92400e" fontSize={12} fontStyle="bold" wrap="char" width={150} />
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