
import React, { useState, useMemo } from 'react';
import { useAgile } from '../../store';
import { ItemType, ItemStatus, WorkItem } from '../../types';
import { Filter, Layers, Target, Info, Calendar as CalendarIcon } from 'lucide-react';

const GanttView: React.FC = () => {
  const { workItems, users } = useAgile();
  
  // Filtros
  const [selectedWS, setSelectedWS] = useState<string>('');
  const [selectedInitiative, setSelectedInitiative] = useState<string>('');

  // Sourcing Frentes de Trabalho from Backlog
  const availableWorkstreams = useMemo(() => 
    workItems.filter(i => i.type === ItemType.WORKSTREAM),
    [workItems]
  );

  // 1. Calcular dinamicamente o início da timeline
  const timelineStart = useMemo(() => {
    const dates = workItems
      .map(i => i.startDate)
      .filter(d => !!d)
      .map(d => new Date(d!).getTime());
    
    if (dates.length === 0) {
      const d = new Date();
      d.setDate(d.getDate() - 15);
      return d;
    }
    const minDate = new Date(Math.min(...dates));
    minDate.setDate(minDate.getDate() - 7); // Margem de uma semana antes
    return minDate;
  }, [workItems]);

  // AJUSTE DE ZOOM: 15px por dia permite ver ~3 meses em telas 1366px-1920px
  const dayWidth = 15; 
  const totalDays = 500; 
  const infoColumnWidth = 600;

  const days = useMemo(() => {
    return Array.from({ length: totalDays }).map((_, i) => {
      const d = new Date(timelineStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [timelineStart, totalDays]);

  // Auxiliares para cálculo de posição
  const getX = (dateStr?: string) => {
    if (!dateStr) return -1000;
    const date = new Date(dateStr);
    const diff = (date.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24);
    return diff * dayWidth;
  };

  const getWidth = (start?: string, end?: string) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    const diff = (e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(dayWidth, (diff + 1) * dayWidth);
  };

  // Filtragem de dados para os Selects
  const availableInitiatives = useMemo(() => 
    workItems.filter(i => i.type === ItemType.INITIATIVE && (!selectedWS || i.workstreamId === selectedWS)),
    [workItems, selectedWS]
  );

  // Organização dos dados para a tabela
  const ganttData = useMemo(() => {
    let initiatives = workItems.filter(i => i.type === ItemType.INITIATIVE);
    
    if (selectedWS) initiatives = initiatives.filter(i => i.workstreamId === selectedWS);
    if (selectedInitiative) initiatives = initiatives.filter(i => i.id === selectedInitiative);

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
  }, [workItems, selectedWS, selectedInitiative]);

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
    const bgColor = type === 'INIT' ? 'bg-[#b8cce4]' : type === 'DEL' ? 'bg-[#f2dbdb]' : 'bg-white';
    const textColor = type === 'INIT' ? 'text-blue-900 font-black' : type === 'DEL' ? 'text-red-900 font-bold' : 'text-gray-700';
    
    const barColor = type === 'TASK' ? 'bg-[#7e60a0] border-[#5d447a]' : 
                     type === 'DEL' ? 'bg-slate-500 border-slate-600' : 
                     'bg-[#4a6d96] border-[#2c435e]';

    return (
      <div key={item.id} className="flex group border-b border-gray-200 hover:bg-slate-50 transition-colors">
        {/* COLUNAS CONGELADAS (Sticky Left) */}
        <div className={`flex w-[600px] shrink-0 border-r border-gray-300 sticky left-0 z-20 ${bgColor} shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]`}>
          <div className={`w-[300px] px-4 py-2 text-[10px] truncate ${textColor} border-r border-gray-200 flex items-center gap-2`}>
            {type === 'TASK' && <div className="w-3 shrink-0" />}
            {item.title}
          </div>
          <div className="w-[100px] px-2 py-2 text-[9px] text-center border-r border-gray-200 flex items-center justify-center font-medium">
            {assignee}
          </div>
          <div className="w-[80px] px-2 py-2 text-[9px] text-center border-r border-gray-200 flex items-center justify-center font-bold">
            {progress}%
          </div>
          <div className="w-[60px] px-2 py-2 text-[9px] text-center border-r border-gray-200 flex items-center justify-center">
            {start ? new Date(start).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '-'}
          </div>
          <div className="w-[60px] px-2 py-2 text-[9px] text-center flex items-center justify-center font-bold">
            {end ? new Date(end).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '-'}
          </div>
        </div>

        {/* ÁREA DE TIMELINE (Scrollable) */}
        <div className="relative flex-1 bg-white" style={{ minWidth: totalDays * dayWidth }}>
          {hasDates ? (
            <div 
              className={`absolute top-2.5 h-4 rounded-sm shadow-sm flex items-center justify-center overflow-hidden transition-all hover:brightness-110 z-10 border ${barColor}`}
              style={{ left: getX(start), width: getWidth(start, end) }}
            >
               <div className="absolute inset-y-0 left-0 bg-white/30 transition-all" style={{ width: `${progress}%` }} />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center pl-4 opacity-30">
               <span className="text-[8px] text-slate-400 italic font-medium uppercase tracking-tighter">S/ Datas</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      <div className="px-6 py-3 bg-white border-b border-gray-200 shrink-0 shadow-sm z-[100] relative">
        <div className="flex items-center justify-between">
           <div>
             <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">Cronograma de Obra/Projeto</h1>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
               <CalendarIcon size={10} /> Visualização dinâmica • Zoom: ~3-4 meses
             </p>
           </div>
           <div className="flex gap-4">
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 gap-3 shadow-inner">
                <div className="flex items-center gap-2">
                  <Layers size={14} className="text-orange-500" />
                  <select 
                    className="bg-transparent border-none text-[11px] font-black text-slate-600 focus:ring-0 cursor-pointer w-44"
                    value={selectedWS}
                    onChange={(e) => { setSelectedWS(e.target.value); setSelectedInitiative(''); }}
                  >
                    <option value="">Todas as Frentes</option>
                    {availableWorkstreams.map(ws => <option key={ws.id} value={ws.id}>{ws.title}</option>)}
                  </select>
                </div>
                <div className="w-px h-4 bg-slate-200" />
                <div className="flex items-center gap-2">
                  <Target size={14} className="text-purple-500" />
                  <select 
                    className="bg-transparent border-none text-[11px] font-black text-slate-600 focus:ring-0 cursor-pointer w-44"
                    value={selectedInitiative}
                    onChange={(e) => setSelectedInitiative(e.target.value)}
                  >
                    <option value="">Iniciativa</option>
                    {availableInitiatives.map(init => <option key={init.id} value={init.id}>{init.title}</option>)}
                  </select>
                </div>
              </div>
           </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar flex flex-col bg-[#f8f9fa]">
        
        {/* TIMELINE HEADER */}
        <div className="sticky top-0 z-[60] flex shrink-0 shadow-md">
          {/* Cabeçalho Fixo das Colunas de Dados */}
          <div className="flex w-[600px] bg-[#444] text-white text-[9px] font-black uppercase tracking-wider shrink-0 border-r border-gray-600 sticky left-0 z-[70]">
            <div className="w-[300px] px-4 py-3 border-r border-gray-600 flex items-center">Item de Trabalho</div>
            <div className="w-[100px] px-2 py-3 border-r border-gray-600 flex items-center justify-center text-center text-[8px]">Dono</div>
            <div className="w-[80px] px-2 py-3 border-r border-gray-600 flex items-center justify-center">Progresso</div>
            <div className="w-[60px] px-2 py-3 border-r border-gray-600 flex items-center justify-center">Início</div>
            <div className="w-[60px] px-2 py-3 flex items-center justify-center">Término</div>
          </div>

          {/* Cabeçalho da Régua de Tempo */}
          <div className="flex-1 bg-[#444] overflow-hidden" style={{ minWidth: totalDays * dayWidth }}>
            <div className="flex border-b border-gray-600">
               {Array.from({ length: Math.ceil(totalDays / 7) }).map((_, i) => (
                 <div 
                   key={i} 
                   className="shrink-0 border-r border-gray-600 py-1.5 text-center text-[8px] text-gray-300 font-black bg-[#555]"
                   style={{ width: dayWidth * 7 }}
                 >
                   {new Date(timelineStart.getTime() + (i * 7 * 86400000)).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase()}
                 </div>
               ))}
            </div>
            <div className="flex">
               {days.map((d, i) => (
                 <div 
                   key={i} 
                   className={`h-6 shrink-0 border-r border-gray-600 flex items-center justify-center text-[8px] font-bold ${d.getDay() === 0 || d.getDay() === 6 ? 'bg-gray-600 text-gray-400' : 'text-gray-300'}`}
                   style={{ width: dayWidth }}
                 >
                   {['D','S','T','Q','Q','S','S'][d.getDay()]}
                 </div>
               ))}
            </div>
          </div>
        </div>

        {/* CORPO DO GANTT */}
        <div className="relative flex-1 bg-white min-h-max" style={{ minWidth: (totalDays * dayWidth) + infoColumnWidth }}>
           {/* Grid de fundo */}
           <div className="absolute inset-y-0 flex pointer-events-none z-0" style={{ left: infoColumnWidth, width: totalDays * dayWidth }}>
             {days.map((d, i) => (
               <div 
                 key={i} 
                 className={`border-r border-gray-100 h-full ${
                   d.getDay() === 0 || d.getDay() === 6 ? 'bg-slate-50/50' : ''
                 }`} 
                 style={{ width: dayWidth }}
               />
             ))}
           </div>

           {/* Linha de Hoje */}
           <div 
             className="absolute top-0 bottom-0 w-px bg-red-500 z-30 opacity-60"
             style={{ left: `calc(${infoColumnWidth}px + ${getX(new Date().toISOString())}px)` }}
           >
             <div className="absolute top-0 w-2 h-2 bg-red-500 rounded-full -ml-[3.5px] -mt-1 shadow-sm" />
           </div>

           <div className="relative z-10">
             {ganttData.length > 0 ? (
               ganttData.map(init => (
                 <React.Fragment key={init.id}>
                   {renderRow(init, 'INIT')}
                   {init.deliveries.map(del => (
                     <React.Fragment key={del.id}>
                       {renderRow(del, 'DEL')}
                       {del.tasks.map(task => renderRow(task, 'TASK'))}
                     </React.Fragment>
                   ))}
                 </React.Fragment>
               ))
             ) : (
               <div className="p-24 text-center flex flex-col items-center justify-center gap-4 bg-white sticky left-0" style={{ width: infoColumnWidth }}>
                  <Target size={48} className="text-slate-200" />
                  <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Nenhuma iniciativa encontrada.</p>
               </div>
             )}
           </div>
        </div>
      </div>

      {/* Legenda Fixa no Rodapé */}
      <div className="p-3 bg-slate-50 border-t border-gray-200 flex items-center gap-6 shrink-0 z-[110] relative">
         <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#4a6d96] rounded-sm border border-slate-600" />
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-tight">Iniciativa</span>
         </div>
         <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-slate-500 rounded-sm border border-slate-600" />
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-tight">Entrega</span>
         </div>
         <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#7e60a0] rounded-sm border border-[#5d447a]" />
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-tight">Tarefa</span>
         </div>
         <div className="ml-auto flex items-center gap-2 text-[9px] font-bold text-slate-400 italic">
           <Info size={14} /> Dica: Role horizontalmente para ver o cronograma. As colunas da esquerda agora ficam fixas!
         </div>
      </div>
    </div>
  );
};

export default GanttView;
