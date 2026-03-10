// src/utils/canvasExport.ts
import Konva from 'konva';
import { useProjectStore } from '../store/useProjectStore';
import type { ExportOptions } from '../components/Modals/ExportOptionsModal';

// 🟢 提供一個空的備用 exportCanvas 以防有其他舊元件引入報錯
export const exportCanvas = () => {};

export const exportHighResChart = (stageWidth: number, stageHeight: number, options: ExportOptions, format: 'svg' | 'png' | 'pdf') => {
  const stage = Konva.stages[0];
  if (!stage) {
      alert('找不到畫布元件，請確認畫面已載入。');
      return;
  }

  const { projectName, sessions, activeSessionId, activeViewMode, activePhotoBatchId } = useProjectStore.getState();
  const activeSession = sessions.find(s => s.id === activeSessionId);
  if (!activeSession) return;

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

  const originalTextAttrs: { node: Konva.Text, fill: any, fontFamily: string }[] = [];
  const hiddenNodes = stage.find('.hide-on-export');

  try {
      const titleLayer = new Konva.Layer();
      const titleNode = new Konva.Text({
          x: 40, y: 40,
          text: `${titleText}\n匯出時間：${displayTime}`,
          fontSize: 28,
          fontFamily: 'sans-serif',
          fontStyle: 'bold',
          fill: '#0F172A',
          lineHeight: 1.5
      });
      titleLayer.add(titleNode);
      stage.add(titleLayer);

      // 🟢 修復：直接使用傳入的 stageWidth 與 stageHeight，完美消除 ts(6133) 黃線警告！
      stage.width(stageWidth);
      stage.height(stageHeight);
      stage.scale({ x: 1, y: 1 });
      stage.position({ x: 0, y: 0 });

      hiddenNodes.forEach(node => node.hide());

      const textNodes = stage.find('Text');

      textNodes.forEach(baseNode => {
          const node = baseNode as Konva.Text;
          if (node === titleNode) return;
          if (node.getParent()?.name() === 'hide-on-export') return;

          originalTextAttrs.push({
              node: node,
              fill: node.fill(),
              fontFamily: node.fontFamily()
          });

          const currentFill = node.fill() as string;
          const isWhite = currentFill === '#ffffff' || currentFill === 'white' || currentFill === 'rgba(255,255,255,1)';
          
          let newFill = currentFill;

          if (!isWhite) {
              newFill = '#0F172A'; 
          }

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

      // 貼心提醒：告知使用者我們為了防亂碼已統一為 PNG
      if (format === 'pdf' || format === 'svg') {
          setTimeout(() => {
              alert(`💡 【高畫質無損匯出成功】\n\n為解決不同電腦產生的亂碼(豆腐塊)與跑版問題，系統已統一為您輸出 ${exportPixelRatio} 倍畫質的完美 PNG 圖檔！\n\n📄 若需 PDF：請開啟剛下載的圖片，按 [Ctrl+P] 列印並選「另存為 PDF」。`);
          }, 500);
      }

  } catch (err) {
      console.error('匯出失敗:', err);
      alert('匯出時發生錯誤');
  } finally {
      hiddenNodes.forEach(node => node.show());

      originalTextAttrs.forEach(attr => {
          attr.node.setAttrs({
              fill: attr.fill,
              fontFamily: attr.fontFamily
          });
      });

      const layers = stage.getLayers();
      const lastLayer = layers[layers.length - 1];
      if (lastLayer) {
          lastLayer.destroy(); 
      }
      
      stage.width(oldWidth);
      stage.height(oldHeight);
      stage.scale({ x: oldScale, y: oldScale });
      stage.position(oldPos);
      stage.draw();
  }
};