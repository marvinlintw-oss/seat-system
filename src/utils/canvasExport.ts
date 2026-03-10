// src/utils/canvasExport.ts
import Konva from 'konva';
import { useProjectStore } from '../store/useProjectStore';
import type { ExportOptions } from '../components/Modals/ExportOptionsModal';
import type { Seat } from '../types';

export const exportCanvas = () => {};

export const exportHighResChart = (stageWidth: number, stageHeight: number, options: ExportOptions, format: 'svg' | 'png' | 'pdf') => {
  void stageWidth;
  void stageHeight;

  const stage = Konva.stages[0];
  if (!stage) {
      alert('找不到畫布元件，請確認畫面已載入。');
      return;
  }

  const { projectName, sessions, activeSessionId, activeViewMode, activePhotoBatchId } = useProjectStore.getState();
  const activeSession = sessions.find(s => s.id === activeSessionId);
  if (!activeSession) return;

  let seats: Seat[] = [];
  if (activeViewMode === 'photo') {
      const batch = activeSession.photoBatches?.find(b => b.id === activePhotoBatchId);
      seats = batch ? batch.spots : [];
  } else {
      seats = activeSession.venue.seats || [];
  }

  let titleText = `${projectName} - ${activeSession.name}`;
  let modeStr = '座位圖';
  let batchNameStr = '';

  if (activeViewMode === 'photo') {
      modeStr = '拍照動線圖';
      const batch = activeSession.photoBatches?.find(b => b.id === activePhotoBatchId);
      if (batch) {
          titleText += ` 【拍照模式：${batch.name}】`;
          batchNameStr = `_${batch.name}`;
      }
  } else {
      titleText += ` 【座位模式】`;
  }

  const now = new Date();
  const yyyy = now.getFullYear();
  const MM = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const HH = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const timestamp = `${yyyy}${MM}${dd}_${HH}${mm}`;
  const displayTime = `${yyyy}/${MM}/${dd} ${HH}:${mm}`;
  const fileName = `${projectName}_${activeSession.name}_${modeStr}${batchNameStr}_${timestamp}`;

  const oldWidth = stage.width();
  const oldHeight = stage.height();
  const oldScale = stage.scaleX();
  const oldPos = stage.position();

  let maxSeatX = 1000;
  let maxSeatY = 800;
  if (seats.length > 0) {
      maxSeatX = Math.max(...seats.map(s => s.x + (s.width || 100)));
      maxSeatY = Math.max(...seats.map(s => s.y + (s.height || 150)));
  }

  const EXPORT_WIDTH = Math.max(1200, maxSeatX + 150); 
  const CONTENT_Y_OFFSET = 240; 
  const EXPORT_HEIGHT = maxSeatY + CONTENT_Y_OFFSET + 150; 

  const mainLayer = stage.getLayers()[0];
  const oldMainLayerY = mainLayer.y();
  
  const bgRects = stage.find('.venue-background') as Konva.Rect[];
  const oldBgAttrs: { node: Konva.Rect, y: number, width: number, height: number }[] = [];

  const originalTextAttrs: { node: Konva.Text, fill: string, fontFamily: string }[] = [];
  const hiddenNodes = stage.find('.hide-on-export');
  
  const serialNodes = stage.find('.serial-number-group');
  const badgeNodes = stage.find('.photo-badge-group');

  try {
      hiddenNodes.forEach(node => node.hide());
      
      if (options.includeSerialNumber === false) serialNodes.forEach(n => n.hide());
      if (options.includePhotoBadges === false) badgeNodes.forEach(n => n.hide());

      mainLayer.y(CONTENT_Y_OFFSET);

      bgRects.forEach(rect => {
          oldBgAttrs.push({ node: rect, y: rect.y(), width: rect.width(), height: rect.height() });
          rect.y(-CONTENT_Y_OFFSET);
          rect.width(EXPORT_WIDTH);
          rect.height(EXPORT_HEIGHT);
      });

      const titleLayer = new Konva.Layer();
      const showTitle = options.exportTitle !== false; 
      const showTime = options.exportTime !== false;

      let currentY = 160; 

      if (showTitle) {
          const titleNode = new Konva.Text({
              x: 150, y: currentY, 
              text: titleText,
              fontSize: 60, 
              fontFamily: 'sans-serif',
              fontStyle: 'bold',
              fill: '#0F172A',
          });
          titleLayer.add(titleNode);
          currentY += 80; 
      }

      if (showTime) {
          const timeNode = new Konva.Text({
              x: 150, y: currentY, 
              text: `匯出時間：${displayTime}`,
              fontSize: 32, 
              fontFamily: 'sans-serif',
              fill: '#64748B',
          });
          titleLayer.add(timeNode);
      }
      
      stage.add(titleLayer);

      stage.width(EXPORT_WIDTH);
      stage.height(EXPORT_HEIGHT);
      stage.scale({ x: 1, y: 1 });
      stage.position({ x: 0, y: 0 });

      const textNodes = stage.find('Text') as Konva.Text[];

      textNodes.forEach(node => {
          if (node.getParent()?.name() === 'hide-on-export') return;
          if (node.getLayer() === titleLayer) return; 

          originalTextAttrs.push({
              node: node,
              fill: node.fill() as string,
              fontFamily: node.fontFamily()
          });

          const currentFill = node.fill() as string;
          const isWhite = currentFill === '#ffffff' || currentFill === 'white' || currentFill === 'rgba(255,255,255,1)';
          
          let newFill = currentFill;
          if (!isWhite) newFill = '#0F172A'; 

          node.setAttrs({
              fill: newFill,
              fontFamily: '"Microsoft JhengHei", "PingFang TC", sans-serif'
          });
      });

      stage.draw();

      const userScale = options.fontScale || 1;
      const exportPixelRatio = Math.max(2, userScale * 2);

      const dataURL = stage.toDataURL({ 
          pixelRatio: exportPixelRatio,
          mimeType: 'image/png' 
      });

      const link = document.createElement('a');
      link.download = `${fileName}.png`;
      link.href = dataURL;
      link.click();

      // 🟢 漏貼的這段補回來了！專屬 PDF / SVG 匯出時的提醒視窗
      if (format === 'pdf' || format === 'svg') {
          setTimeout(() => {
              alert(`💡 【高畫質無損匯出成功】\n\n系統已為您統一輸出 ${exportPixelRatio} 倍畫質的完美 PNG 圖檔！\n\n📄 若需 PDF 格式：請開啟剛下載的圖片，按 [Ctrl+P] 列印並選擇「另存為 PDF」。`);
          }, 500);
      }

  } catch (err) {
      console.error('匯出失敗:', err);
      alert('匯出時發生錯誤');
  } finally {
      hiddenNodes.forEach(node => node.show());
      
      serialNodes.forEach(n => n.show());
      badgeNodes.forEach(n => n.show());

      originalTextAttrs.forEach(attr => {
          attr.node.setAttrs({
              fill: attr.fill,
              fontFamily: attr.fontFamily
          });
      });

      oldBgAttrs.forEach(attr => {
          attr.node.setAttrs({
              y: attr.y,
              width: attr.width,
              height: attr.height
          });
      });

      mainLayer.y(oldMainLayerY);

      const layers = stage.getLayers();
      const lastLayer = layers[layers.length - 1];
      if (lastLayer && lastLayer !== mainLayer) {
          lastLayer.destroy(); 
      }
      
      stage.width(oldWidth);
      stage.height(oldHeight);
      stage.scale({ x: oldScale, y: oldScale });
      stage.position(oldPos);
      stage.draw();
  }
};