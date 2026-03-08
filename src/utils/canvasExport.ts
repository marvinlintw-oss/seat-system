// src/utils/canvasExport.ts
import jsPDF from 'jspdf';
import { useProjectStore } from '../store/useProjectStore';
import type { Seat, Person, Category } from '../types';

// 【核心新增】SVG 專用中文斷行引擊 (模擬 wrap="char" 與 ellipsis)
const renderSVGText = (text: string, startY: number, maxLines: number, fontSize: number, fill: string, isBold: boolean = false) => {
    if (!text) return '';
    let lines = [];
    let currentLine = '';
    let currentLen = 0;
    const maxLen = 14; // 100px 寬度大約可容納的半形字元數

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const isFullWidth = char.charCodeAt(0) > 255;
        const charLen = isFullWidth ? 2 : 1.1; 
        
        if (currentLen + charLen > maxLen) {
            lines.push(currentLine);
            currentLine = char;
            currentLen = charLen;
        } else {
            currentLine += char;
            currentLen += charLen;
        }
    }
    if (currentLine) lines.push(currentLine);

    if (lines.length > maxLines) {
        lines = lines.slice(0, maxLines);
        lines[maxLines - 1] = lines[maxLines - 1].slice(0, -1) + '…';
    }

    return lines.map((line, idx) => {
        const y = startY + (idx * fontSize * 1.2);
        return `<text x="50" y="${y}" text-anchor="middle" font-size="${fontSize}" fill="${fill}" font-weight="${isBold ? 'bold' : 'normal'}" font-family="sans-serif">${line}</text>`;
    }).join('');
};

const getSVGString = (
  seats: Seat[], personnel: Person[], categories: Category[],
  virtualWidth: number, virtualHeight: number, bgImageBase64: string | null,
  includeSerialNumber: boolean, includePhotoBadge: boolean, activeSessionId: string 
) => {
  const getCategoryByLabel = (label: string) => categories.find(c => c.label === label);
  const state = useProjectStore.getState();
  const activeSession = state.sessions.find(s => s.id === activeSessionId);

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
    let photoBadgeSvg = ''; 
    let hasPhotoBadge = false;

    if (occupant && includePhotoBadge) {
        const participatingBatches = (activeSession?.photoBatches || []).filter(batch =>
            batch.spots.some(spot => spot.assignedPersonId === occupant.id)
        );
        if (participatingBatches.length > 0) {
            hasPhotoBadge = true;
            const batchNumbers = participatingBatches.map(b => {
                const match = b.name.match(/\d+/);
                return match ? match[0] : b.name;
            });
            const photoText = `📷 參與 ${batchNumbers.join(', ')} 拍`;
            const badgeColor = participatingBatches.length === 1 ? participatingBatches[0].color : '#475569';
            photoBadgeSvg = `
              <g transform="translate(0, 128)">
                <rect width="100" height="22" fill="${badgeColor}" />
                <text x="50" y="15" text-anchor="middle" font-size="11" fill="white" font-weight="bold" font-family="sans-serif">${photoText}</text>
              </g>
            `;
        }
    }

    if (includeSerialNumber && occupant?.serialNumber) {
        serialNumberSvg = `<rect width="28" height="25" fill="rgba(255,255,255,0.6)" /><text x="14" y="17" text-anchor="middle" font-size="11" fill="#334155" font-weight="bold" font-family="sans-serif">${occupant.serialNumber}</text>`;
        labelX = 64; 
    }

    if (occupant) {
      // 套用全新的斷行引擎
      const orgSvg = renderSVGText(occupant.organization, 42, 2, 11, '#1e293b', true);
      const nameSvg = renderSVGText(occupant.name, 72, 2, 18, '#0f172a', true);
      const titleSvg = renderSVGText(occupant.title, 108, hasPhotoBadge ? 1 : 2, 12, '#334155', false);

      content = `
        ${orgSvg}
        ${nameSvg}
        ${titleSvg}
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
          <defs><clipPath id="clip-${seat.id}"><rect width="100" height="150" rx="4" /></clipPath></defs>
          <g clip-path="url(#clip-${seat.id})">
              <rect width="100" height="150" fill="${zoneColor}" />
              <rect x="0" y="0" width="100" height="25" fill="rgba(0,0,0,0.1)" />
              <rect x="0" y="25" width="100" height="125" fill="${personBg}" />
              ${serialNumberSvg}
              ${photoBadgeSvg}
          </g>
          <rect width="100" height="150" fill="none" stroke="${stroke}" stroke-width="2" rx="4" />
          <text x="${labelX}" y="17" text-anchor="middle" font-size="12" font-weight="bold" fill="#1e293b" font-family="sans-serif">${seat.label}</text>
          ${content}
      </g>
    `;
  }).join('\n');

  return `<svg width="${virtualWidth}" height="${virtualHeight}" viewBox="0 0 ${virtualWidth} ${virtualHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="white"/>${bgImageBase64 ? `<image href="${bgImageBase64}" width="100%" height="100%" opacity="0.5" />` : ''}${seatNodes}</svg>`;
};

const promptExportOptions = (): Promise<{ serial: boolean, badge: boolean } | null> => {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
        
        const dialog = document.createElement('div');
        dialog.style.cssText = 'background:white;padding:24px;border-radius:12px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);width:320px;font-family:sans-serif;';
        
        dialog.innerHTML = `
            <h3 style="margin:0 0 16px 0;font-size:18px;color:#0f172a;">匯出圖表設定</h3>
            <label style="display:flex;align-items:center;margin-bottom:12px;cursor:pointer;">
                <input type="checkbox" id="chk-serial" checked style="margin-right:8px;width:16px;height:16px;accent-color:#2563eb;">
                <span style="color:#334155;font-size:14px;">匯出人員序號 (隱私考量可關閉)</span>
            </label>
            <label style="display:flex;align-items:center;margin-bottom:24px;cursor:pointer;">
                <input type="checkbox" id="chk-badge" checked style="margin-right:8px;width:16px;height:16px;accent-color:#2563eb;">
                <span style="color:#334155;font-size:14px;">匯出跨梯次拍照徽章</span>
            </label>
            <div style="display:flex;justify-content:flex-end;gap:8px;">
                <button id="btn-cancel" style="padding:8px 16px;border:none;background:#f1f5f9;color:#64748b;border-radius:6px;cursor:pointer;font-weight:bold;">取消</button>
                <button id="btn-confirm" style="padding:8px 16px;border:none;background:#2563eb;color:white;border-radius:6px;cursor:pointer;font-weight:bold;">確認匯出</button>
            </div>
        `;
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        const cleanUp = () => document.body.removeChild(overlay);

        document.getElementById('btn-cancel')!.onclick = () => { cleanUp(); resolve(null); };
        document.getElementById('btn-confirm')!.onclick = () => {
            const serial = (document.getElementById('chk-serial') as HTMLInputElement).checked;
            const badge = (document.getElementById('chk-badge') as HTMLInputElement).checked;
            cleanUp();
            resolve({ serial, badge });
        };
    });
};

export const exportCanvas = async (format: 'svg' | 'png' | 'pdf') => {
  const state = useProjectStore.getState();
  const activeSession = state.sessions.find(s => s.id === state.activeSessionId);
  if (!activeSession) { alert('找不到場次資料！'); return; }

  const options = await promptExportOptions();
  if (!options) return; 

  let targetSeats = [];
  let modeName = '';
  if (state.activeViewMode === 'photo') {
      const batch = activeSession.photoBatches?.find(b => b.id === state.activePhotoBatchId);
      targetSeats = batch ? batch.spots : [];
      modeName = batch ? `_${batch.name}站位圖` : '_拍照站位圖';
  } else {
      targetSeats = activeSession.venue.seats;
      modeName = '_座位圖';
  }

  if (targetSeats.length === 0) { alert('目前畫布上沒有任何資料可供匯出！'); return; }

  const { backgroundImage } = activeSession.venue;
  const { personnel, categories, projectName } = state;

  let maxX = 1600; let maxY = 900;
  maxX = Math.max(...targetSeats.map(s => s.x + (s.width || 100)));
  maxY = Math.max(...targetSeats.map(s => s.y + (s.height || 150)));

  const virtualWidth = Math.max(1200, maxX + 200);
  const virtualHeight = Math.max(800, maxY + 200);
  const filenamePrefix = `${projectName}_${activeSession.name}${modeName}`;

  const svgString = getSVGString(targetSeats, personnel, categories, virtualWidth, virtualHeight, backgroundImage, options.serial, options.badge, activeSession.id);
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  if (format === 'svg') {
      const link = document.createElement('a'); link.download = `${filenamePrefix}.svg`; link.href = url; link.click(); URL.revokeObjectURL(url);
  } else if (format === 'png' || format === 'pdf') {
      const img = new Image();
      img.onload = () => {
          const canvas = document.createElement('canvas'); const scale = 2; 
          canvas.width = virtualWidth * scale; canvas.height = virtualHeight * scale;
          const ctx = canvas.getContext('2d');
          if (ctx) {
              ctx.scale(scale, scale); ctx.fillStyle = 'white'; ctx.fillRect(0, 0, virtualWidth, virtualHeight); ctx.drawImage(img, 0, 0);
              if (format === 'png') {
                  const link = document.createElement('a'); link.download = `${filenamePrefix}.png`; link.href = canvas.toDataURL('image/png', 1.0); link.click();
              } else if (format === 'pdf') {
                  const orientation = virtualWidth > virtualHeight ? 'l' : 'p'; 
                  const pdf = new jsPDF(orientation, 'px', [virtualWidth, virtualHeight]);
                  pdf.addImage(canvas.toDataURL('image/jpeg', 1.0), 'JPEG', 0, 0, virtualWidth, virtualHeight); pdf.save(`${filenamePrefix}.pdf`);
              }
          }
          URL.revokeObjectURL(url);
      };
      img.src = url;
  }
};