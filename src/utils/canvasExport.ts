// src/utils/canvasExport.ts
import jsPDF from 'jspdf';
import { useProjectStore } from '../store/useProjectStore';
import type { Seat, Person, Category } from '../types';

/**
 * 核心引擎：手動生成 SVG 向量字串 
 */
const getSVGString = (
  seats: Seat[], personnel: Person[], categories: Category[],
  virtualWidth: number, virtualHeight: number, bgImageBase64: string | null,
  includeSerialNumber: boolean // 【新增】是否包含序號的參數
) => {
  const getCategoryByLabel = (label: string) => categories.find(c => c.label === label);

  const seatNodes = seats.map(seat => {
    if (seat.isVisible === false) return '';
    const occupant = personnel.find(p => p.id === seat.assignedPersonId);
    
    const zoneCat = getCategoryByLabel(seat.zoneCategory || '');
    const zoneColor = zoneCat ? zoneCat.color : '#ffffff'; 

    const personCat = occupant ? getCategoryByLabel(occupant.category) : null;
    const personBg = personCat ? (personCat.personColor || personCat.color) : '#ffffff';
    
    const stroke = '#94a3b8';

    if (seat.type === 'shape') {
      return `<g transform="translate(${seat.x}, ${seat.y})">
          <rect width="${seat.width}" height="${seat.height}" fill="#e2e8f0" stroke="#94a3b8" rx="4" />
          <text x="${(seat.width || 600) / 2}" y="${(seat.height || 150) / 2 + 8}" text-anchor="middle" font-size="24" fill="#64748b" font-family="sans-serif">${seat.label}</text>
      </g>`;
    }

    let content = '';
    let serialNumberSvg = '';
    let labelX = 50;

    // 【修改】透過 includeSerialNumber 參數決定是否要繪製序號
    if (includeSerialNumber && occupant?.serialNumber) {
        serialNumberSvg = `
            <rect width="28" height="25" fill="rgba(255,255,255,0.6)" />
            <text x="14" y="17" text-anchor="middle" font-size="11" fill="#334155" font-weight="bold" font-family="sans-serif">${occupant.serialNumber}</text>
        `;
        labelX = 64; 
    }

    if (occupant) {
      content = `
        <text x="50" y="45" text-anchor="middle" font-size="11" fill="#1e293b" font-weight="bold" font-family="sans-serif">${occupant.organization.substring(0, 10)}</text>
        <text x="50" y="70" text-anchor="middle" font-size="18" fill="#0f172a" font-weight="bold" font-family="sans-serif">${occupant.name.substring(0, 6)}</text>
        <text x="50" y="105" text-anchor="middle" font-size="12" fill="#334155" font-family="sans-serif">${occupant.title.substring(0, 10)}</text>
        ${occupant.remarks ? `<text x="80" y="30" font-size="12">📝</text>` : ''}
      `;
    } else {
      if (seat.zoneCategory) {
          content = `<text x="50" y="70" text-anchor="middle" font-size="18" fill="${zoneColor}" font-weight="bold" font-family="sans-serif">${seat.zoneCategory}</text>`;
      } else {
          content = `<text x="50" y="80" text-anchor="middle" font-size="14" fill="rgba(0,0,0,0.3)" font-family="sans-serif">空位</text>`;
      }
    }

    return `
      <g transform="translate(${seat.x}, ${seat.y})">
          <defs>
              <clipPath id="clip-${seat.id}">
                  <rect width="100" height="150" rx="4" />
              </clipPath>
          </defs>
          <g clip-path="url(#clip-${seat.id})">
              <rect width="100" height="150" fill="${zoneColor}" />
              <rect x="0" y="0" width="100" height="25" fill="rgba(0,0,0,0.1)" />
              <rect x="0" y="25" width="100" height="125" fill="${personBg}" />
              ${serialNumberSvg}
          </g>
          <rect width="100" height="150" fill="none" stroke="${stroke}" stroke-width="2" rx="4" />
          <text x="${labelX}" y="17" text-anchor="middle" font-size="12" font-weight="bold" fill="#1e293b" font-family="sans-serif">${seat.label}</text>
          ${content}
      </g>
    `;
  }).join('\n');

  return `
    <svg width="${virtualWidth}" height="${virtualHeight}" viewBox="0 0 ${virtualWidth} ${virtualHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="white"/>
        ${bgImageBase64 ? `<image href="${bgImageBase64}" width="100%" height="100%" opacity="0.5" />` : ''}
        ${seatNodes}
    </svg>
  `;
};

export const exportCanvas = (format: 'svg' | 'png' | 'pdf') => {
  const state = useProjectStore.getState();
  const activeSession = state.sessions.find(s => s.id === state.activeSessionId);
  
  if (!activeSession) {
      alert('找不到場次資料！');
      return;
  }

  // 【新增】匯出前，彈出視窗詢問是否包含序號
  const includeSerialNumber = window.confirm('請問匯出的圖表中，是否要顯示人員的「序號」？\n\n(按「確定」顯示，按「取消」則會隱藏序號保護隱私)');

  const { seats, backgroundImage } = activeSession.venue;
  const { personnel, categories, projectName } = state;

  let maxX = 1600;
  let maxY = 900;
  if (seats.length > 0) {
      maxX = Math.max(...seats.map(s => s.x + (s.width || 100)));
      maxY = Math.max(...seats.map(s => s.y + (s.height || 150)));
  }

  const virtualWidth = Math.max(1200, maxX + 200);
  const virtualHeight = Math.max(800, maxY + 200);

  const filenamePrefix = `${projectName}_${activeSession.name}_座位圖`;

  // 將 includeSerialNumber 參數傳入
  const svgString = getSVGString(seats, personnel, categories, virtualWidth, virtualHeight, backgroundImage, includeSerialNumber);
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  if (format === 'svg') {
      const link = document.createElement('a');
      link.download = `${filenamePrefix}.svg`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
  } else if (format === 'png' || format === 'pdf') {
      const img = new Image();
      img.onload = () => {
          const canvas = document.createElement('canvas');
          const scale = 2; 
          canvas.width = virtualWidth * scale; 
          canvas.height = virtualHeight * scale;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
              ctx.scale(scale, scale);
              ctx.fillStyle = 'white'; 
              ctx.fillRect(0, 0, virtualWidth, virtualHeight);
              ctx.drawImage(img, 0, 0);
              
              if (format === 'png') {
                  const link = document.createElement('a');
                  link.download = `${filenamePrefix}.png`;
                  link.href = canvas.toDataURL('image/png', 1.0);
                  link.click();
              } else if (format === 'pdf') {
                  const orientation = virtualWidth > virtualHeight ? 'l' : 'p'; 
                  const pdf = new jsPDF(orientation, 'px', [virtualWidth, virtualHeight]);
                  pdf.addImage(canvas.toDataURL('image/jpeg', 1.0), 'JPEG', 0, 0, virtualWidth, virtualHeight);
                  pdf.save(`${filenamePrefix}.pdf`);
              }
          }
          URL.revokeObjectURL(url);
      };
      img.src = url;
  }
};