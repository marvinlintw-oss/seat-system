// src/utils/canvasExport.ts
import jsPDF from 'jspdf';
import type { Seat, Person, Category } from '../types';

/**
 * 核心引擎：手動生成 SVG 向量字串 (確保最高畫質)
 */
const getSVGString = (
  seats: Seat[], personnel: Person[], categories: Category[],
  virtualWidth: number, virtualHeight: number, bgImageBase64: string | null
) => {
  const getCategoryByLabel = (label: string) => categories.find(c => c.label === label);

  const seatNodes = seats.map(seat => {
    if (seat.isVisible === false) return '';
    const occupant = personnel.find(p => p.id === seat.assignedPersonId);
    const zoneCat = getCategoryByLabel(seat.zoneCategory || '');
    const zoneColor = zoneCat ? zoneCat.color : '#ffffff'; // 底色對應區塊顏色
    const stroke = '#94a3b8';

    if (seat.type === 'shape') {
      return `<g transform="translate(${seat.x}, ${seat.y})">
          <rect width="${seat.width}" height="${seat.height}" fill="#e2e8f0" stroke="#94a3b8" rx="4" />
          <text x="${(seat.width || 600) / 2}" y="${(seat.height || 150) / 2 + 8}" text-anchor="middle" font-size="24" fill="#64748b" font-family="sans-serif">${seat.label}</text>
      </g>`;
    }

    let content = '';
    if (occupant) {
      content = `
        <text x="50" y="45" text-anchor="middle" font-size="11" fill="#1e293b" font-weight="bold" font-family="sans-serif">${occupant.organization}</text>
        <text x="50" y="70" text-anchor="middle" font-size="18" fill="#0f172a" font-weight="bold" font-family="sans-serif">${occupant.name}</text>
        <text x="50" y="105" text-anchor="middle" font-size="12" fill="#334155" font-family="sans-serif">${occupant.title}</text>
      `;
    } else {
      content = `<text x="50" y="80" text-anchor="middle" font-size="14" fill="rgba(0,0,0,0.3)" font-family="sans-serif">空位</text>`;
    }

    return `
      <g transform="translate(${seat.x}, ${seat.y})">
          <rect width="100" height="150" fill="${zoneColor}" stroke="${stroke}" stroke-width="2" rx="4" />
          <rect x="0" y="0" width="100" height="25" fill="rgba(0,0,0,0.1)" rx="4" clip-path="inset(0 0 75% 0)" />
          <text x="50" y="17" text-anchor="middle" font-size="12" font-weight="bold" fill="#1e293b" font-family="sans-serif">${seat.label}</text>
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

/** 匯出高畫質 SVG */
export const exportCanvasToSVG = (
  seats: Seat[], personnel: Person[], categories: Category[],
  virtualWidth: number, virtualHeight: number, bgImage: string | null, filenamePrefix = 'seating-chart'
) => {
  const svgString = getSVGString(seats, personnel, categories, virtualWidth, virtualHeight, bgImage);
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `${filenamePrefix}-${Date.now()}.svg`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
};

/** 透過 SVG 轉存高畫質 PNG */
export const exportCanvasToPNG = (
  seats: Seat[], personnel: Person[], categories: Category[],
  virtualWidth: number, virtualHeight: number, bgImage: string | null, filenamePrefix = 'seating-chart'
) => {
  const svgString = getSVGString(seats, personnel, categories, virtualWidth, virtualHeight, bgImage);
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = virtualWidth; canvas.height = virtualHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
          ctx.fillStyle = 'white'; ctx.fillRect(0, 0, virtualWidth, virtualHeight);
          ctx.drawImage(img, 0, 0);
          const link = document.createElement('a');
          link.download = `${filenamePrefix}-${Date.now()}.png`;
          link.href = canvas.toDataURL('image/png', 1.0);
          link.click();
      }
      URL.revokeObjectURL(url);
  };
  img.src = url;
};

/** 透過 SVG 轉存高畫質 PDF (自動判斷直橫向) */
export const exportCanvasToPDF = (
  seats: Seat[], personnel: Person[], categories: Category[],
  virtualWidth: number, virtualHeight: number, bgImage: string | null, filenamePrefix = 'seating-chart'
) => {
  const svgString = getSVGString(seats, personnel, categories, virtualWidth, virtualHeight, bgImage);
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = virtualWidth; canvas.height = virtualHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
          ctx.fillStyle = 'white'; ctx.fillRect(0, 0, virtualWidth, virtualHeight);
          ctx.drawImage(img, 0, 0);
          const orientation = virtualWidth > virtualHeight ? 'l' : 'p'; // 自動判斷方向
          const pdf = new jsPDF(orientation, 'px', [virtualWidth, virtualHeight]);
          pdf.addImage(canvas.toDataURL('image/jpeg', 1.0), 'JPEG', 0, 0, virtualWidth, virtualHeight);
          pdf.save(`${filenamePrefix}-${Date.now()}.pdf`);
      }
      URL.revokeObjectURL(url);
  };
  img.src = url;
};