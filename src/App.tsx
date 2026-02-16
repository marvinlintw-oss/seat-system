import { VenueCanvas } from './components/VenueCanvas';
import { PersonnelSidebar } from './components/PersonnelSidebar';

function App() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100">
      {/* 左側：人員名單與控制面板 */}
      <PersonnelSidebar />
      
      {/* 右側：主畫布 */}
      <div className="flex-1 relative">
        <VenueCanvas />
      </div>
    </div>
  );
}

export default App;