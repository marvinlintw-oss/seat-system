// src/App.tsx
import React, { useState } from 'react';
import { VenueCanvas } from './components/VenueCanvas';
import { PersonnelSidebar } from './components/PersonnelSidebar'; // 確認有這一行
import { HelpCircle, X } from 'lucide-react';

function App() {
  const [showHelp, setShowHelp] = useState(false);

  return (
    // 使用 h-screen 與 overflow-hidden 確保只有一個視窗，沒有捲軸
    <div className="flex h-screen overflow-hidden bg-slate-100">
      
      {/* 左側：畫布區 (flex-1 會自動填滿剩餘空間) */}
      <div className="flex-1 relative h-full">
        <VenueCanvas />
        
        {/* Help Button */}
        <div className="absolute top-4 left-4 z-10">
           <button onClick={() => setShowHelp(!showHelp)} className="bg-white p-2 rounded-full shadow-md text-slate-600 hover:text-blue-600">
             <HelpCircle size={24} />
           </button>
        </div>
      </div>

      {/* 右側：側邊欄 (固定寬度 w-96) */}
      <PersonnelSidebar />
      
    </div>
  );
}

export default App;