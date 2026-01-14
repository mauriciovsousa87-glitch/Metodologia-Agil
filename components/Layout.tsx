
import React, { useState } from 'react';
import { 
  LayoutGrid, ListTodo, BarChart3, GanttChartSquare, Settings, 
  Menu, X, Plus, Bell, AlertCircle, Calendar, DollarSign, GitCommitHorizontal,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { ViewType } from '../types';
import { useAgile } from '../store';

interface LayoutProps {
  children: React.ReactNode;
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeView, onViewChange }) => {
  const [sidebarExpanded, setSidebarExpanded] = useState(false); 
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
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Sidebar Principal */}
      <aside 
        className={`
          bg-slate-950 text-slate-300 transition-all duration-300 ease-in-out flex flex-col shrink-0 z-[100] relative
          ${sidebarExpanded ? 'w-64' : 'w-20'}
        `}
      >
        {/* Header da Sidebar com Logo e Toggle */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-900 overflow-hidden shrink-0">
          <div className="flex items-center">
            <div className="bg-blue-600 p-2 rounded-lg shadow-lg shrink-0">
              <LayoutGrid size={20} className="text-white" />
            </div>
            <span className={`ml-3 font-bold text-white text-lg tracking-tight truncate transition-all duration-300 ${sidebarExpanded ? 'opacity-100' : 'opacity-0'}`}>
              AgileMaster
            </span>
          </div>
        </div>

        {/* Botão Flutuante de Toggle (Estilo Moderno) */}
        <button 
          onClick={() => setSidebarExpanded(!sidebarExpanded)}
          className="absolute -right-3 top-20 bg-blue-600 text-white p-1 rounded-full shadow-xl border-2 border-white hover:bg-blue-700 transition-all z-[110]"
        >
          {sidebarExpanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>

        <nav className="flex-1 mt-6 space-y-2 px-3 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`w-full flex items-center p-3 rounded-xl transition-all group relative ${
                  isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-900'
                }`}
              >
                <Icon size={22} className="shrink-0" />
                <span className={`ml-4 font-bold text-sm truncate transition-all duration-300 ${sidebarExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
                  {item.label}
                </span>
                {!sidebarExpanded && (
                   <div className="absolute left-full ml-4 px-3 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[120] shadow-xl">
                      {item.label}
                   </div>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-900 mt-auto bg-slate-950/50">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-black text-white shrink-0 shadow-inner">
              AS
            </div>
            <div className={`ml-3 transition-all duration-300 overflow-hidden ${sidebarExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
              <p className="text-xs font-black text-white truncate leading-none">Admin User</p>
              <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-widest font-bold">Premium Plan</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Área de Conteúdo Principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-[90] relative shadow-sm">
          <div className="flex items-center gap-4">
             <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{activeView}</h2>
          </div>

          <div className="flex items-center gap-4">
            {activeView === 'Sprints' && (
              <button 
                type="button" 
                onClick={handleOpenSprintModal}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-black transition-all shadow-lg active:scale-95 uppercase tracking-tighter"
              >
                <Plus size={16} strokeWidth={3} />
                Nova Sprint
              </button>
            )}

            <div className="h-6 w-px bg-gray-100 mx-2" />

            <div className="flex items-center gap-3">
              <button onClick={() => setNotificationsOpen(!notificationsOpen)} className={`p-2 rounded-xl transition-all relative hover:bg-gray-50 ${notificationsOpen ? 'bg-blue-50 text-blue-600' : 'text-slate-400'}`}>
                <Bell size={20} />
                {blockedItemsCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] flex items-center justify-center rounded-full border-2 border-white font-black">
                    {blockedItemsCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <>
                  <div className="fixed inset-0 z-[199]" onClick={() => setNotificationsOpen(false)}></div>
                  <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-2xl z-[200] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Impedimentos Ativos</h4>
                      <button onClick={() => setNotificationsOpen(false)} className="text-slate-400 hover:text-slate-900"><X size={16}/></button>
                    </div>
                    <div className="max-h-96 overflow-y-auto custom-scrollbar bg-white">
                      {blockedItemsCount > 0 ? (
                        workItems.filter(i => i.blocked).map(item => (
                          <div key={item.id} className="p-4 hover:bg-red-50 transition-colors border-b border-gray-50 flex gap-3">
                            <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase">{item.id}</p>
                              <p className="text-xs font-bold text-slate-800 mt-1">{item.title}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-10 text-center">
                          <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Tudo limpo!</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto custom-scrollbar bg-gray-50 relative">
          {children}
        </main>

        {isSprintModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95" onMouseDown={(e) => e.stopPropagation()}>
              <div className="bg-slate-50 p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Nova Sprint</h3>
                <button onClick={() => setIsSprintModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-400 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Nome do Ciclo</label>
                  <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-blue-500 transition-all" value={newSprintName} onChange={(e) => setNewSprintName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Início</label>
                    <input type="date" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2 text-sm font-bold outline-none" value={newSprintStart} onChange={(e) => setNewSprintStart(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Término</label>
                    <input type="date" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2 text-sm font-bold outline-none" value={newSprintEnd} onChange={(e) => setNewSprintEnd(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-gray-100 flex gap-3">
                <button onClick={() => setIsSprintModalOpen(false)} className="flex-1 py-3 text-xs font-black text-slate-500 hover:bg-slate-200 rounded-2xl transition-all uppercase">Cancelar</button>
                <button onClick={handleSaveSprint} className="flex-1 py-3 bg-blue-600 text-white text-xs font-black rounded-2xl shadow-lg hover:bg-blue-700 active:scale-95 transition-all uppercase">Criar Ciclo</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Layout;
