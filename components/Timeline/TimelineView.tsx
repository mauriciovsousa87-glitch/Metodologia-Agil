
import React, { useMemo, useState, useEffect } from 'react';
import { useAgile } from '../../store';
import { WorkItem, ItemType, ItemStatus } from '../../types';
import { Calendar, Info, Target, Package, ListTodo, CheckCircle2, TrendingUp, ChevronRight } from 'lucide-react';
import ItemPanel from '../Backlog/ItemPanel';

const TimelineView: React.FC = () => {
  const { workItems } = useAgile();
  const [selectedInitiativeId, setSelectedInitiativeId] = useState<string>(() => {
    return localStorage.getItem('timeline_selected_initiative') || '';
  });
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('timeline_selected_initiative', selectedInitiativeId);
  }, [selectedInitiativeId]);

  const initiatives = useMemo(() => {
    return workItems.filter(i => i.type === ItemType.INITIATIVE);
  }, [workItems]);

  const { timelineItems, progress } = useMemo(() => {
    if (!selectedInitiativeId) return { timelineItems: [], progress: 0 };

    const items = workItems.filter(item => {
      if (item.id === selectedInitiativeId) return false;
      const isChild = item.parentId === selectedInitiativeId;
      const isGrandChild = workItems.some(p => p.id === item.parentId && p.parentId === selectedInitiativeId);
      
      return (isChild || isGrandChild) && 
             (item.type === ItemType.DELIVERY || item.type === ItemType.TASK || item.type === ItemType.BUG) &&
             item.endDate;
    });

    const sorted = items.sort((a, b) => new Date(a.endDate!).getTime() - new Date(b.endDate!).getTime());
    
    const closed = items.filter(i => i.status === ItemStatus.CLOSED).length;
    const total = items.length;
    const calculatedProgress = total > 0 ? Math.round((closed / total) * 100) : 0;

    return { timelineItems: sorted, progress: calculatedProgress };
  }, [workItems, selectedInitiativeId]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return {
      day: date.getDate(),
      month: date.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase()
    };
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden font-sans">
      {/* Header com Filtro e Progresso */}
      <header className="bg-white border-b border-slate-200 p-6 lg:px-10 shrink-0 shadow-sm z-10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 max-w-7xl mx-auto w-full">
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">Status da Iniciativa</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Visão cronológica de entregas</p>
          </div>

          <div className="flex flex-1 max-w-xl items-center gap-6">
            <div className="flex-1">
              <div className="flex justify-between items-end mb-2">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                  <TrendingUp size={12} className="text-emerald-500" /> Progresso Geral
                </span>
                <span className="text-lg font-black text-slate-900 tracking-tighter">{progress}%</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-0.5">
                <div 
                  className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full transition-all duration-1000 ease-out shadow-inner"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="h-10 w-px bg-slate-200 hidden lg:block" />

            <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-200 shadow-sm min-w-[240px]">
              <Target size={16} className="text-blue-500 shrink-0 ml-1" />
              <select 
                className="flex-1 bg-transparent border-none text-xs font-black text-slate-700 outline-none cursor-pointer"
                value={selectedInitiativeId}
                onChange={(e) => setSelectedInitiativeId(e.target.value)}
              >
                <option value="">SELECIONE O PROJETO...</option>
                {initiatives.map(init => (
                  <option key={init.id} value={init.id}>{init.title}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Timeline Container - Auto Fit */}
      <div className="flex-1 flex flex-col justify-center items-center px-4 lg:px-12 py-10 relative overflow-hidden">
        {!selectedInitiativeId ? (
          <div className="flex flex-col items-center justify-center opacity-20 pointer-events-none gap-4">
            <Calendar size={100} strokeWidth={1} />
            <p className="text-xl font-black uppercase tracking-tighter text-center">Selecione uma iniciativa</p>
          </div>
        ) : timelineItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center opacity-20 pointer-events-none gap-4">
            <Info size={100} strokeWidth={1} />
            <p className="text-xl font-black uppercase tracking-tighter text-center">Nenhum marco cronológico definido</p>
          </div>
        ) : (
          <div className="w-full max-w-7xl relative flex flex-col items-center">
            {/* Linha de Base - Flexível */}
            <div className="absolute top-1/2 left-0 right-0 h-1.5 bg-slate-200 -translate-y-1/2 rounded-full z-0 overflow-hidden">
               <div 
                 className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-1000"
                 style={{ width: `${progress}%` }}
               />
            </div>

            {/* Grid Flex de Itens */}
            <div className="w-full flex justify-between items-center relative z-10">
              {timelineItems.map((item, idx) => {
                const date = formatDate(item.endDate!);
                const isDelivery = item.type === ItemType.DELIVERY;
                const isClosed = item.status === ItemStatus.CLOSED;
                const isOdd = idx % 2 === 0;

                return (
                  <div 
                    key={item.id} 
                    className="flex flex-col items-center relative"
                    style={{ width: `${100 / timelineItems.length}%` }}
                  >
                    {/* Vertical Linker */}
                    <div 
                      className={`absolute w-px bg-slate-200 transition-all duration-500 ${isClosed ? 'bg-blue-400' : ''}`}
                      style={{ 
                        height: isDelivery ? '100px' : '60px',
                        bottom: isOdd ? '100%' : 'auto',
                        top: !isOdd ? '100%' : 'auto'
                      }} 
                    />

                    {/* Card de Informação */}
                    <div 
                      onClick={() => setSelectedItemId(item.id)}
                      className={`
                        absolute flex flex-col items-center transition-all cursor-pointer group
                        ${isOdd ? 'bottom-[120px]' : 'top-[80px]'}
                      `}
                    >
                      <div className="text-center mb-2 transform group-hover:-translate-y-1 transition-transform">
                        <span className="block text-xl font-black text-slate-800 leading-none">{date.day}</span>
                        <span className="block text-[8px] font-black text-slate-500 uppercase">{date.month}</span>
                      </div>
                      
                      <div className={`
                        w-32 p-3 rounded-2xl border-2 transition-all shadow-sm bg-white text-center
                        ${isClosed ? 'border-emerald-100 shadow-emerald-50/50' : 'border-slate-100'}
                        group-hover:border-blue-400 group-hover:shadow-lg
                      `}>
                         <p className={`text-[8px] font-black uppercase mb-1 tracking-wider ${isDelivery ? 'text-blue-600' : 'text-slate-400'}`}>
                          {item.type}
                        </p>
                        <h4 className="text-[10px] font-black text-slate-700 leading-tight uppercase line-clamp-2">
                          {item.title}
                        </h4>
                      </div>
                    </div>

                    {/* O Marco (Dot) na Linha */}
                    <div 
                      onClick={() => setSelectedItemId(item.id)}
                      className={`
                        w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition-all relative z-20
                        ring-4 ring-slate-50 group
                        ${isDelivery 
                          ? 'bg-slate-900 text-white' 
                          : 'bg-white border-2 border-slate-300 text-slate-400'}
                        ${isClosed ? 'bg-blue-600 border-blue-600 text-white ring-blue-50 shadow-lg shadow-blue-200/50 scale-110' : ''}
                        hover:scale-125
                      `}
                    >
                      {isDelivery ? <Package size={18} /> : <ListTodo size={16} />}
                      
                      {isClosed && (
                        <div className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 border-2 border-white shadow-sm">
                          <CheckCircle2 size={10} strokeWidth={4} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Legenda Estilizada */}
      <footer className="bg-white border-t border-slate-100 p-6 shrink-0 flex flex-wrap justify-center gap-8">
        <div className="flex items-center gap-3">
           <div className="w-4 h-4 rounded-full bg-slate-900 border-2 border-white shadow-sm" />
           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Entrega Estratégica</span>
        </div>
        <div className="flex items-center gap-3">
           <div className="w-4 h-4 rounded-full border-2 border-slate-300 bg-white" />
           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tarefa / Bug</span>
        </div>
        <div className="flex items-center gap-3">
           <div className="w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-sm" />
           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Concluído</span>
        </div>
        <div className="w-px h-4 bg-slate-200" />
        <div className="flex items-center gap-2 text-slate-400">
          <Info size={14} />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Clique em um marco para ver detalhes</span>
        </div>
      </footer>

      {selectedItemId && (
        <ItemPanel 
          item={workItems.find(i => i.id === selectedItemId)!} 
          onClose={() => setSelectedItemId(null)} 
        />
      )}
    </div>
  );
};

export default TimelineView;
