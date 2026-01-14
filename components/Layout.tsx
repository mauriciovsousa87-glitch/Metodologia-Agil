
import React, { useState } from 'react';
import { 
  LayoutGrid, ListTodo, BarChart3, GanttChartSquare, Settings, 
  Menu, X, Plus, Bell, AlertCircle, Calendar, DollarSign, GitCommitHorizontal
} from 'lucide-react';
import { ViewType } from '../types';
import { useAgile } from '../store';

interface LayoutProps {
  children: React.ReactNode;
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeView, onViewChange }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false); // Fechado por padrão no mobile
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  
  const [newSprintName, setNewSprintName] = useState('');
  const [newSprintStart, setNewSprintStart] = useState('');
  const [newSprintEnd, setNewSprintEnd] = useState('');
  const [newSprintObjective, setNewSprintObjective] = useState('');

  const { addSprint, workItems, sprints } = useAgile();

  const navItems = [
    { id: 'Sprints' as ViewType, label: 'Sprints', icon: LayoutGrid },
    { id: 'Backlog' as ViewType, label: 'Backlog', icon: ListTodo },
    { id: 'Timeline' as ViewType, label: 'Linha do Tempo', icon: GitCommitHorizontal },
    { id: 'Finance' as ViewType, label: 'Gestão de Custos', icon: DollarSign },
    { id: 'Dashboard' as ViewType, label: 'Dashboard', icon: BarChart3 },
    { id: 'Gantt' as ViewType, label: 'Gantt', icon: GanttChartSquare },
    { id: 'Settings' as ViewType, label: 'Configurações', icon: Settings },
  ];

  const handleOpenSprintModal = (e: React.MouseEvent) => {
    e.preventDefault();
    const lastSprint = sprints[sprints.length - 1];
    const baseDate = lastSprint ? new Date(new Date(lastSprint.endDate).getTime() + 86400000) : new Date();
    const endDate = new Date(baseDate.getTime() + 1209600000); 
    setNewSprintName(`SPRINT ${baseDate.getFullYear()} - NEW`);
    setNewSprintStart(baseDate.toISOString().split('T')[0]);
    setNewSprintEnd(endDate.toISOString().split('T')[0]);
    setIsSprintModalOpen(true);
  };

  const handleSaveSprint = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newSprintName) return alert('O nome da sprint é obrigatório');
    addSprint({ name: newSprintName, startDate: newSprintStart, endDate: newSprintEnd, objective: newSprintObjective, status: 'Planejada' });
    setIsSprintModalOpen(false);
    onViewChange('Sprints');
  };

  const blockedItemsCount = workItems.filter(i => i.blocked).length;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden relative font-sans">
      {/* Sidebar Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[95] lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`fixed lg:relative bg-slate-900 text-slate-300 transition-all duration-300 flex flex-col shrink-0 z-[100] h-full ${sidebarOpen ? 'w-64 translate-x-0' : 'w-16 lg:w-16 -translate-x-full lg:translate-x-0'} ${sidebarOpen ? '' : ''}`}>
        <div className="h-16 flex items-center border-b border-slate-800 shrink-0">
          <div className="flex items-center px-4 w-full">
            <div className="bg-blue-600 p-1.5 rounded mr-3 shadow-lg shrink-0">
              <LayoutGrid size={20} className="text-white" />
            </div>
            {sidebarOpen && <span className="font-bold text-white text-lg tracking-tight truncate">Agile Master</span>}
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="ml-auto p-1.5 hover:bg-slate-800 rounded transition-colors lg:hidden">
              <X size={18} />
            </button>
          </div>
        </div>

        <nav className="flex-1 mt-4 space-y-1 px-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { onViewChange(item.id); if(window.innerWidth < 1024) setSidebarOpen(false); }}
                className={`w-full flex items-center p-3 rounded-lg transition-all group ${
                  isActive ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800'
                }`}
                title={item.label}
              >
                <Icon size={20} className={`${sidebarOpen ? 'mr-3' : 'mx-auto'}`} />
                {sidebarOpen && <span className="font-semibold text-sm">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 mt-auto">
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white shrink-0">AS</div>
            {sidebarOpen && (
              <div className="ml-3 overflow-hidden">
                <p className="text-xs font-semibold text-white truncate">Usuário Admin</p>
                <p className="text-[10px] text-slate-400 truncate uppercase tracking-tighter">Gestão de Projetos</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 shrink-0 shadow-sm z-[90] relative">
          <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-gray-100 rounded-lg lg:hidden text-slate-600">
            <Menu size={24} />
          </button>

          <div className="flex items-center gap-2 lg:gap-6 ml-auto">
            {activeView === 'Sprints' && (
              <button 
                type="button" 
                onClick={handleOpenSprintModal}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 lg:px-5 py-2 rounded-xl flex items-center gap-2 text-[11px] lg:text-sm font-black transition-all shadow-lg active:scale-95"
              >
                <Plus size={16} strokeWidth={3} />
                <span className="hidden sm:inline">NOVA SPRINT</span>
              </button>
            )}

            <div className="flex items-center gap-2 lg:gap-4 text-gray-500 relative">
              <button onClick={() => setNotificationsOpen(!notificationsOpen)} className={`p-2 rounded-full hover:bg-gray-100 transition-all relative ${notificationsOpen ? 'bg-gray-100 text-blue-600' : ''}`}>
                <Bell size={20} />
                {blockedItemsCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white font-bold animate-pulse">
                    {blockedItemsCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <>
                  <div className="fixed inset-0 z-[199]" onClick={() => setNotificationsOpen(false)}></div>
                  <div className="absolute top-full right-0 mt-3 w-72 lg:w-80 bg-white border border-gray-200 rounded-2xl shadow-2xl z-[200] overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
                      <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Impedimentos</h4>
                      <button onClick={() => setNotificationsOpen(false)} className="text-[10px] font-bold text-blue-600 hover:underline">Fechar</button>
                    </div>
                    <div className="max-h-80 lg:max-h-96 overflow-y-auto custom-scrollbar bg-white">
                      {blockedItemsCount > 0 ? (
                        workItems.filter(i => i.blocked).map(item => (
                          <div key={item.id} className="p-4 hover:bg-red-50 transition-colors border-b border-gray-50 flex gap-3">
                            <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-bold text-slate-900 leading-tight">{item.id}</p>
                              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.title}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center bg-white">
                          <Bell size={32} className="mx-auto text-slate-100 mb-2" />
                          <p className="text-sm text-slate-400 font-medium">Nenhum bloqueio.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto custom-scrollbar relative bg-gray-50">
          {children}
        </main>

        {isSprintModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200" onMouseDown={(e) => e.stopPropagation()}>
              <div className="bg-slate-50 p-6 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800 uppercase leading-none">Nova Sprint</h3>
                  </div>
                </div>
                <button onClick={() => setIsSprintModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-400 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Nome</label>
                  <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2 text-sm font-bold outline-none" value={newSprintName} onChange={(e) => setNewSprintName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input type="date" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2 text-sm font-bold outline-none" value={newSprintStart} onChange={(e) => setNewSprintStart(e.target.value)} />
                  <input type="date" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2 text-sm font-bold outline-none" value={newSprintEnd} onChange={(e) => setNewSprintEnd(e.target.value)} />
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-gray-100 flex gap-3">
                <button onClick={() => setIsSprintModalOpen(false)} className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-200 rounded-2xl transition-all">Cancelar</button>
                <button onClick={handleSaveSprint} className="flex-1 py-3 bg-blue-600 text-white text-sm font-black rounded-2xl shadow-lg hover:bg-blue-700 active:scale-95 transition-all">CRIAR SPRINT</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Layout;
