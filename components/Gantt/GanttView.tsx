
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAgile } from '../../store';
import { ItemType, ItemStatus, WorkItem } from '../../types';
import { Info, Calendar as CalendarIcon, ChevronRight, Layers, Target, CheckSquare, Square, ChevronDown, Filter } from 'lucide-react';

const GanttView: React.FC = () => {
  const { workItems, users } = useAgile();
  
  const [selectedWS, setSelectedWS] = useState<string>('');
  const [selectedInitiatives, setSelectedInitiatives] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const dayWidth = 20; 
  const infoColumnWidth = 600;

  // Fechar filtro ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // PERSISTÊNCIA DAS DATAS DE FILTRO
  const [startDateFilter, setStartDateFilter] = useState<string>(() => {
    return localStorage.getItem('gantt_start_date') || 
      new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  });
  
  const [endDateFilter, setEndDateFilter] = useState<string>(() => {
    const defaultEnd = new Date();
    defaultEnd.setMonth(defaultEnd.getMonth() + 4);
    return localStorage.getItem('gantt_end_date') || defaultEnd.toISOString().split('T')[0];
  });

  useEffect(() => {
    localStorage.setItem('gantt_start_date', startDateFilter);
  }, [startDateFilter]);

  useEffect(() => {
    localStorage.setItem('gantt_end_date', endDateFilter);
  }, [endDateFilter]);

  const timelineStart = useMemo(() => new Date(startDateFilter + 'T00:00:00'), [startDateFilter]);
  const timelineEnd = useMemo(() => new Date(endDateFilter + 'T00:00:00'), [endDateFilter]);

  const totalDays = useMemo(() => {
    const diff = timelineEnd.getTime() - timelineStart.getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
  }, [timelineStart, timelineEnd]);

  const days = useMemo(() => {
    return Array.from({ length: totalDays }).map((_, i) => {
      const d = new Date(timelineStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [timelineStart, totalDays]);

  const getX = (dateStr?: string) => {
    if (!dateStr) return -5000;
    const date = new Date(dateStr + 'T00:00:00');
    const diff = (date.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24);
    return diff * dayWidth;
  };

  const getWidth = (startStr?: string, endStr?: string) => {
    if (!startStr || !endStr) return 0;
    const s = new Date(startStr + 'T00:00:00');
    const e = new Date(endStr + 'T00:00:00');
    if (e < timelineStart || s > timelineEnd) return 0;
    const diffDays = (e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24);
    return (diffDays + 1) * dayWidth;
  };

  const availableInitiatives = useMemo(() => {
    return workItems.filter(i => i.type === ItemType.INITIATIVE && (!selectedWS || i.workstreamId === selectedWS));
  }, [workItems, selectedWS]);

  const ganttData = useMemo(() => {
    let initiatives = workItems.filter(i => i.type === ItemType.INITIATIVE);
    if (selectedWS) initiatives = initiatives.filter(i => i.workstreamId === selectedWS);
    
    // FILTRO MÚLTIPLO: Se houver itens selecionados, filtra por eles
    if (selectedInitiatives.length > 0) {
      initiatives = initiatives.filter(i => selectedInitiatives.includes(i.id));
    }

    return initiatives.map(init => {
      const deliveries = workItems.filter(i => i.type === ItemType.DELIVERY && i.parentId === init.id);
      return {
        ...init,
        deliveries: deliveries.map(del => ({
          ...del,
          tasks: workItems.filter(i => (i.type === ItemType.TASK || i.type === ItemType.BUG) && i.parentId === del.id)
        }))
      };
    });
  }, [workItems, selectedWS, selectedInitiatives]);

  const toggleInitiative = (id: string) => {
    setSelectedInitiatives(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const calculateProgress = (item: WorkItem) => {
    if (item.status === ItemStatus.CLOSED) return 100;
    const children = workItems.filter(i => i.parentId === item.id);
    if (children.length === 0) return 0;
    const done = children.filter(i => i.status === ItemStatus.CLOSED).length;
    return Math.round((done / children.length) * 100);
  };

  const renderRow = (item: any, type: 'INIT' | 'DEL' | 'TASK') => {
    const start = item.startDate;
    const end = item.endDate;
    const progress = calculateProgress(item);
    const assignee = users.find(u => u.id === item.assigneeId)?.name || '-';

    const hasDates = start && end;
    const bgColor = type === 'INIT' ? 'bg-[#dae5f2]' : type === 'DEL' ? 'bg-[#fcecec]' : 'bg-white';
    const textColor = type === 'INIT' ? 'text-blue-900 font-black' : type === 'DEL' ? 'text-red-900 font-bold' : 'text-gray-700';
    
    const barColor = type === 'TASK' ? 'bg-[#7e60a0] border-[#5d447a]' : 
                     type === 'DEL' ? 'bg-slate-500 border-slate-600' : 
                     'bg-[#4a6d96] border-[#2c435e]';

    return (
      <div key={item.id} className="flex group border-b border-gray-200 hover:bg-slate-50 transition-colors h-10">
        <div className={`flex w-[600px] shrink-0 border-r border-gray-300 sticky left-0 z-30 ${bgColor}`}>
          <div className={`w-[300px] px-4 py-2 text-[10px] truncate ${textColor} border-r border-gray-200/50 flex items-center gap-2`}>
            {type === 'TASK' && <div className="w-4 shrink-0" />}
            {item.title}
          </div>
          <div className="w-[100px] px-2 py-2 text-[9px] text-center border-r border-gray-200/50 flex items-center justify-center font-medium">
            {assignee}
          </div>
          <div className="w-[80px] px-2 py-2 text-[9px] text-center border-r border-gray-200/50 flex items-center justify-center font-bold">
            {progress}%
          </div>
          <div className="w-[60px] px-2 py-2 text-[9px] text-center border-r border-gray-200/50 flex items-center justify-center">
            {start ? new Date(start + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '-'}
          </div>
          <div className="w-[60px] px-2 py-2 text-[9px] text-center flex items-center justify-center font-bold">
            {end ? new Date(end + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '-'}
          </div>
        </div>

        <div className="relative flex-1 bg-white overflow-hidden" style={{ minWidth: totalDays * dayWidth }}>
          {hasDates && (
            <div 
              className={`absolute top-2.5 h-4 rounded-sm shadow-sm flex items-center justify-center transition-all hover:brightness-110 z-10 border ${barColor}`}
              style={{ left: getX(start), width: getWidth(start, end) }}
            >
               <div className="absolute inset-y-0 left-0 bg-white/30" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
      </div>
    );
  };

  const todayX = getX(new Date().toISOString().split('T')[0]);

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* HEADER FIXO */}
      <div className="px-6 py-3 bg-white border-b border-gray-200 shrink-0 shadow-sm z-[100] relative">
        <div className="flex items-center justify-between gap-4">
           <div>
             <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">Cronograma de Projeto</h1>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
               <CalendarIcon size={10} /> Visualização dinâmica com colunas fixas
             </p>
           </div>

           <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <div className="flex flex-col px-2">
                <span className="text-[7px] font-black text-slate-400 uppercase leading-none mb-1">Início Timeline</span>
                <input type="date" className="bg-transparent border-none text-[10px] font-black p-0 focus:ring-0 cursor-pointer outline-none" value={startDateFilter} onChange={(e) => setStartDateFilter(e.target.value)} />
              </div>
              <ChevronRight size={14} className="text-slate-300" />
              <div className="flex flex-col px-2">
                <span className="text-[7px] font-black text-slate-400 uppercase leading-none mb-1">Fim Timeline</span>
                <input type="date" className="bg-transparent border-none text-[10px] font-black p-0 focus:ring-0 cursor-pointer outline-none" value={endDateFilter} onChange={(e) => setEndDateFilter(e.target.value)} />
              </div>
           </div>

           <div className="flex gap-4">
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 gap-3 shadow-inner relative" ref={filterRef}>
                <select 
                  className="bg-transparent border-none text-[11px] font-black text-slate-600 focus:ring-0 cursor-pointer w-40" 
                  value={selectedWS} 
                  onChange={(e) => { setSelectedWS(e.target.value); setSelectedInitiatives([]); }}
                >
                  <option value="">Todas as Frentes</option>
                  {workItems.filter(i => i.type === ItemType.WORKSTREAM).map(ws => <option key={ws.id} value={ws.id}>{ws.title}</option>)}
                </select>
                
                <div className="w-px h-4 bg-slate-200" />
                
                {/* FILTRO DE INICIATIVAS COM CHECKBOX */}
                <button 
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className="flex items-center justify-between w-44 text-[11px] font-black text-slate-600 px-1"
                >
                  <span className="truncate">
                    {selectedInitiatives.length === 0 ? 'Todas Iniciativas' : `${selectedInitiatives.length} selecionadas`}
                  </span>
                  <ChevronDown size={14} className={`transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
                </button>

                {isFilterOpen && (
                  <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-2xl z-[200] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selecionar Iniciativas</span>
                      {selectedInitiatives.length > 0 && (
                        <button onClick={() => setSelectedInitiatives([])} className="text-[9px] font-bold text-blue-600 hover:underline uppercase">Limpar</button>
                      )}
                    </div>
                    <div className="max-h-60 overflow-y-auto custom-scrollbar p-2 space-y-1">
                      {availableInitiatives.length === 0 ? (
                        <div className="py-4 text-center text-[10px] text-slate-400 font-bold uppercase">Nenhuma iniciativa encontrada</div>
                      ) : (
                        availableInitiatives.map(init => (
                          <label key={init.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors group">
                            <input 
                              type="checkbox" 
                              className="hidden" 
                              checked={selectedInitiatives.includes(init.id)} 
                              onChange={() => toggleInitiative(init.id)}
                            />
                            {selectedInitiatives.includes(init.id) ? (
                              <CheckSquare size={16} className="text-blue-600" />
                            ) : (
                              <Square size={16} className="text-slate-300 group-hover:text-slate-400" />
                            )}
                            <span className={`text-[10px] font-bold truncate ${selectedInitiatives.includes(init.id) ? 'text-blue-900' : 'text-slate-600'}`}>
                              {init.title}
                            </span>
                          </label>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </div>
           </div>
        </div>
      </div>

      {/* ÁREA DE SCROLL PRINCIPAL */}
      <div className="flex-1 overflow-auto custom-scrollbar flex flex-col bg-slate-50 relative">
        <div className="sticky top-0 z-50 flex shrink-0 shadow-md">
          <div className="flex w-[600px] bg-[#334155] text-white text-[9px] font-black uppercase tracking-wider shrink-0 border-r border-slate-600 sticky left-0 z-[60]">
            <div className="w-[300px] px-4 py-4 border-r border-slate-600">Item de Trabalho</div>
            <div className="w-[100px] px-2 py-4 border-r border-slate-600 text-center">Dono</div>
            <div className="w-[80px] px-2 py-4 border-r border-slate-600 text-center">Progresso</div>
            <div className="w-[60px] px-2 py-4 border-r border-slate-600 text-center">Início</div>
            <div className="w-[60px] px-2 py-4 text-center">Término</div>
          </div>

          <div className="flex-1 bg-[#334155]" style={{ minWidth: totalDays * dayWidth }}>
            <div className="flex border-b border-slate-600">
               {Array.from({ length: Math.ceil(totalDays / 7) }).map((_, i) => (
                 <div key={i} className="shrink-0 border-r border-slate-600 py-2 text-center text-[8px] text-slate-300 font-black bg-slate-800" style={{ width: dayWidth * 7 }}>
                   {new Date(timelineStart.getTime() + (i * 7 * 86400000)).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase()}
                 </div>
               ))}
            </div>
            <div className="flex">
               {days.map((d, i) => (
                 <div key={i} className={`h-7 shrink-0 border-r border-slate-600 flex items-center justify-center text-[8px] font-bold ${d.getDay() === 0 || d.getDay() === 6 ? 'bg-slate-700 text-slate-400' : 'text-slate-300'}`} style={{ width: dayWidth }}>
                   {['D','S','T','Q','Q','S','S'][d.getDay()]}
                 </div>
               ))}
            </div>
          </div>
        </div>

        <div className="relative flex-1 min-w-max">
           <div className="absolute inset-y-0 left-0 right-0 flex pointer-events-none" style={{ minWidth: (totalDays * dayWidth) + infoColumnWidth }}>
              <div className="w-[600px] shrink-0 bg-transparent h-full border-r border-transparent" />
              <div className="relative flex-1 overflow-hidden h-full">
                  <div className="flex h-full">
                    {days.map((d, i) => (
                      <div key={i} className={`border-r border-slate-100 h-full shrink-0 ${d.getDay() === 0 || d.getDay() === 6 ? 'bg-slate-50' : ''}`} style={{ width: dayWidth }} />
                    ))}
                  </div>
                  
                  {todayX >= 0 && todayX <= totalDays * dayWidth && (
                    <div className="absolute top-0 bottom-0 w-[2px] bg-red-600 z-20" style={{ left: todayX }}>
                      <div className="absolute top-0 w-3 h-3 bg-red-600 rounded-full -ml-[5px] shadow-lg flex items-center justify-center">
                        <div className="w-1 h-1 bg-white rounded-full animate-ping"></div>
                      </div>
                    </div>
                  )}
              </div>
           </div>

           <div className="relative z-10">
             {ganttData.map(init => (
               <React.Fragment key={init.id}>
                 {renderRow(init, 'INIT')}
                 {init.deliveries.map(del => (
                   <React.Fragment key={del.id}>
                     {renderRow(del, 'DEL')}
                     {del.tasks.map(task => renderRow(task, 'TASK'))}
                   </React.Fragment>
                 ))}
               </React.Fragment>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
};

export default GanttView;
