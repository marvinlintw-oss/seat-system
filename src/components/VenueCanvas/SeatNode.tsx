// src/components/VenueCanvas/SeatNode.tsx
import React from 'react';
import { Group, Rect, Text, Circle } from 'react-konva';
import { useProjectStore } from '../../store/useProjectStore'; // 【修復】只留這一個大水庫
import type { Seat, Person } from '../../types'; // 【修復】引入 Person 型別解決 any 報錯
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

export const SeatNode: React.FC<SeatNodeProps> = ({
  seat, isSelected, isEditMode, isSequencing, rankSequenceCounter,
  isNumbering, numberSequenceCounter,
  onDragStart, onDragMove, onDragEnd, onClick, onContextMenu, onUnassign, onTransformEnd
}) => {
  // 從大水庫取得資料
  const { personnel, categories } = useProjectStore();

  // 【修復】明確宣告 p 的型別為 Person，消除 any 報錯
  const occupant = personnel.find((p: Person) => p.id === seat.assignedPersonId);
  
  const zoneCat = categories.find(c => c.label === seat.zoneCategory);
  const zoneColor = zoneCat ? zoneCat.color : '#ffffff'; 
  const personCat = occupant ? categories.find(c => c.label === occupant.category) : null;
  // 【修復】優先讀取獨立的名牌顏色 (personColor)，若無則退回使用區塊顏色 (color)
  const personBg = personCat ? (personCat.personColor || personCat.color) : '#ffffff';

  const stroke = seat.isPinned ? '#ef4444' : (isSelected ? '#2563eb' : '#94a3b8');
  const strokeWidth = isSelected ? 3 : 2;

  const isDraggable = (isEditMode && !seat.isPinned && !isSequencing && !isNumbering) || (!isEditMode && !!occupant);

  const shapeW = Math.max(10, seat.width || 600);
  const shapeH = Math.max(10, seat.height || 150);

  return (
    <Group 
      id={seat.id} x={seat.x} y={seat.y}
      name={seat.type === 'shape' ? 'shape-stage' : 'seat-node'}
      draggable={isDraggable} 
      onDragStart={(e) => onDragStart(e, seat.id)}
      onDragMove={(e) => onDragMove(e, seat)}
      onDragEnd={(e) => onDragEnd(e, seat)}
      onClick={(e) => onClick(e, seat)}
      onContextMenu={(e) => onContextMenu(e, seat)}
      onTransformEnd={(e) => onTransformEnd && onTransformEnd(e, seat)}
    >
      {seat.type === 'shape' ? (
        <Group>
          <Rect width={shapeW} height={shapeH} fill="#e2e8f0" stroke="#94a3b8" cornerRadius={4} />
          <Text text={seat.label} width={shapeW} align="center" y={shapeH/2 - 10} fontSize={24} fill="#64748b"/>
        </Group>
      ) : (
        <Group>
          <Rect width={SEAT_WIDTH} height={SEAT_HEIGHT} fill={zoneColor} stroke={stroke} strokeWidth={strokeWidth} cornerRadius={4} shadowColor="black" shadowOpacity={0.1} shadowBlur={5} />
          <Rect x={0} y={0} width={SEAT_WIDTH} height={25} fill="rgba(0,0,0,0.1)" cornerRadius={[4,4,0,0]} stroke={stroke} strokeWidth={0}/>
          <Text text={seat.label} x={0} y={6} width={SEAT_WIDTH} align="center" fontSize={12} fontStyle="bold" fill="#1e293b"/>
          <Rect x={0} y={25} width={SEAT_WIDTH} height={SEAT_HEIGHT-25} fill={personBg} cornerRadius={[0,0,4,4]} />
          
          {occupant ? (
            <>
              <Text text={occupant.organization} x={4} y={35} width={SEAT_WIDTH-8} align="center" fontSize={11} fill="#1e293b" fontStyle="bold" wrap="word" height={28} ellipsis={true} />
              <Text text={occupant.name} x={2} y={65} width={SEAT_WIDTH-4} align="center" fontSize={18} fill="#0f172a" fontStyle="bold" wrap="word" height={44} ellipsis={true} />
              <Text text={occupant.title} x={4} y={110} width={SEAT_WIDTH-8} align="center" fontSize={12} fill="#334155" wrap="word" height={32} ellipsis={true} />
              {!isEditMode && (
                <Group x={80} y={20} onClick={(e) => { e.cancelBubble=true; onUnassign(seat.id); }}>
                  <Circle radius={8} fill="#ef4444" />
                  <Text text="×" x={-3} y={-4} fontSize={10} fill="white" fontStyle="bold"/>
                </Group>
              )}
            </>
          ) : (
            <Text text="空位" x={0} y={80} width={SEAT_WIDTH} align="center" fontSize={14} fill="rgba(0,0,0,0.3)"/>
          )}

          {isEditMode && (
            <Group x={SEAT_WIDTH-25} y={SEAT_HEIGHT-25}>
              <Rect width={25} height={20} fill="#ef4444" cornerRadius={4} />
              <Text text={String(seat.rankWeight)} x={0} y={4} width={25} align="center" fill="white" fontSize={10} fontStyle="bold"/>
            </Group>
          )}

          {isSequencing && (
            <Group x={SEAT_WIDTH/2} y={SEAT_HEIGHT/2} listening={false}>
              <Circle radius={15} fill="rgba(37, 99, 235, 0.9)" />
              <Text text={String(rankSequenceCounter)} x={-5} y={-5} fill="white" fontSize={12}/>
            </Group>
          )}

          {isNumbering && (
            <Group x={SEAT_WIDTH/2} y={SEAT_HEIGHT/2} listening={false}>
              <Circle radius={15} fill="rgba(34, 197, 94, 0.9)" />
              <Text text={String(numberSequenceCounter)} x={-5} y={-5} fill="white" fontSize={12}/>
            </Group>
          )}
        </Group>
      )}
    </Group>
  );
};