// src/components/Layout.tsx
import React from 'react';
import { TopNavBar } from './Header/TopNavBar';
import { SessionTabs } from './Header/SessionTabs';
import { VenueCanvas } from './VenueCanvas/VenueCanvas';
import { SidebarContainer } from './Sidebar/SidebarContainer';
import { useProjectStore } from '../store/useProjectStore';

export const Layout: React.FC = () => {
  // 🟢 監聽是否要顯示分割畫面
  const { activeViewMode, isSplitViewEnabled } = useProjectStore();
  const showSplit = activeViewMode === 'photo' && isSplitViewEnabled;

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-50 overflow-hidden font-sans">
      <TopNavBar />
      <SessionTabs />

      <div className="flex flex-1 overflow-hidden relative">
        <SidebarContainer />

        <div className="flex-1 bg-slate-100 relative flex flex-col overflow-hidden">
           {showSplit ? (
               <>
                 {/* 🟢 上半部：拍照區 (接收點擊指派) */}
                 <div className="flex-1 relative border-b-[6px] border-amber-500/80 shadow-2xl z-10 overflow-hidden">
                    <VenueCanvas forcedViewMode="photo" />
                    <div className="absolute top-4 left-4 bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg pointer-events-none flex items-center gap-2">
                       📸 拍照區 <span className="font-normal text-amber-100">(請點擊空位入座)</span>
                    </div>
                 </div>
                 {/* 🟢 下半部：座位區 (唯讀模式，點擊可抓取長官) */}
                 <div className="flex-1 relative bg-slate-200 overflow-hidden">
                    <VenueCanvas forcedViewMode="seat" isReadOnly={true} />
                    <div className="absolute top-4 left-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg pointer-events-none flex items-center gap-2">
                       🪑 座位區 <span className="font-normal text-blue-200">(請點擊長官選取)</span>
                    </div>
                 </div>
               </>
           ) : (
               <VenueCanvas />
           )}
        </div>
      </div>
    </div>
  );
};