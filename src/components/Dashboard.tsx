import React, { useState } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { useAuthStore } from '../store/useAuthStore';
import { Project } from '../types';
import { Plus, Layout, FileText, LogOut } from 'lucide-react'; // 需安裝 lucide-react

export const Dashboard: React.FC = () => {
  const { projects, addProject, loadProject } = useProjectStore();
  const logout = useAuthStore((state) => state.logout);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // 新專案表單狀態
  const [newProjectName, setNewProjectName] = useState('');
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');

  const handleCreate = () => {
    const width = orientation === 'landscape' ? 3000 : 2000;
    const height = orientation === 'landscape' ? 2000 : 3000;

    const newProject: Project = {
      id: Date.now().toString(),
      name: newProjectName || '未命名專案',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      venue: {
        width,
        height,
        seats: [],
        backgroundImage: '', // 後續在 Venue Manager 設定
      },
      personnel: [],
      viewState: { zoom: 1, panX: 0, panY: 0 }
    };

    addProject(newProject);
    setIsModalOpen(false);
    // 實際應用中，這裡會導向到編輯頁面
    console.log("Created Project:", newProject);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Layout className="text-blue-600" />
          <span className="text-xl font-bold text-slate-800">排座系統 Dashboard</span>
        </div>
        <button onClick={logout} className="text-slate-500 hover:text-red-600 flex items-center gap-1 text-sm">
          <LogOut size={16} /> 登出
        </button>
      </nav>

      <main className="container mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-slate-800">我的專案</h2>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-sm"
          >
            <Plus size={20} /> 建立新專案
          </button>
        </div>

        {/* Project Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {projects.map((p) => (
            <div key={p.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition cursor-pointer" onClick={() => loadProject(p.id)}>
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <FileText className="text-blue-600" />
                </div>
                <span className="text-xs text-slate-400">{new Date(p.updatedAt).toLocaleDateString()}</span>
              </div>
              <h3 className="font-bold text-lg text-slate-800 mb-1">{p.name}</h3>
              <p className="text-sm text-slate-500">
                場地尺寸: {p.venue.width}x{p.venue.height}px
              </p>
              <div className="mt-4 flex gap-2 text-xs text-slate-400">
                <span>{p.personnel.length} 人員</span>
                <span>•</span>
                <span>{p.venue.seats.length} 座位</span>
              </div>
            </div>
          ))}

          {projects.length === 0 && (
            <div className="col-span-3 text-center py-20 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
              <p>目前沒有專案，請點擊右上方建立。</p>
            </div>
          )}
        </div>
      </main>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96 shadow-xl">
            <h3 className="text-xl font-bold mb-4">建立新排位專案</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">專案名稱</label>
                <input 
                  type="text" 
                  className="w-full border rounded px-3 py-2"
                  placeholder="e.g., 2026 全國科技會議"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">場地版型 (高解析度)</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setOrientation('landscape')}
                    className={`p-3 border rounded text-center text-sm ${orientation === 'landscape' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'text-slate-600'}`}
                  >
                    橫式 (Landscape)<br/>3000 x 2000 px
                  </button>
                  <button 
                    onClick={() => setOrientation('portrait')}
                    className={`p-3 border rounded text-center text-sm ${orientation === 'portrait' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'text-slate-600'}`}
                  >
                    直式 (Portrait)<br/>2000 x 3000 px
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">取消</button>
              <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">建立</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};