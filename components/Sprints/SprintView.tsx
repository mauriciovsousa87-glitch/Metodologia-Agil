
import React, { useState, useMemo } from 'react';
import { 
  Calendar, Users, Info, Plus, ChevronRight, 
  LayoutGrid, ListTodo, AlertCircle, Clock, MoreVertical, Trash2, Filter, Layers, Target, Box, X
} from 'lucide-react';
import { useAgile } from '../../store';
import { WorkItem, ItemType, BoardColumn, ItemStatus } from '../../types';
import ItemPanel from '../Backlog/ItemPanel';

const SprintView: React.FC = () => {
  const { sprints, selectedSprint, setSprint, workItems, users, updateWorkItem, addWorkItem } = useAgile();
  const [activeTab, setActiveTab] = useState<'backlog' | 'taskboard'>('taskboard');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  
  // Filtros de Hierarquia
  const [filterWS, setFilterWS] = useState<string>(''); // ID da Frente (Workstream)
  const [filterInitiative, setFilterInitiative] = useState<string>(''); // ID da Iniciativa
  const [filterDelivery, setFilterDelivery] = useState<string>(''); // ID da Entrega

  // Dados para os Selects (Baseados em WorkItems reais)
  const availableFrentes = useMemo(() => 
    workItems.filter(i => i.type === ItemType.WORKSTREAM),
    [workItems]
  );

  const availableInitiatives = useMemo(() => {
    let items = workItems.filter(i => i.type === ItemType.INITIATIVE);
    if (filterWS) {
      items = items.filter(i => i.parentId === filterWS || i.workstreamId === filterWS);
    }
    return items;
  }, [workItems, filterWS]);

  const availableDeliveries = useMemo(() => {
    let items = workItems.filter(i => i.type === ItemType.DELIVERY);
    if (filterInitiative) {
      items = items.filter(i => i.parentId === filterInitiative);
    } else if (filterWS) {
      items = items.filter(i => i.workstreamId === filterWS);
    }
    return items;
  }, [workItems, filterWS, filterInitiative]);

  const sprintItems = useMemo(() => 
    workItems.filter(item => item.sprintId === selectedSprint?.id),
    [workItems, selectedSprint]
  );

  // Lógica de Filtragem do Board
  const filteredItems = useMemo(() => {
    return sprintItems.filter(item => {
      // Filtro de Frente: verifica o workstreamId do item
      if (filterWS && item.workstreamId !== filterWS && item.id !== filterWS) return false;
      
      // Filtro de Iniciativa: verifica se o item é a iniciativa ou se o pai/vovô é a iniciativa
      if (filterInitiative) {
        const isSelf = item.id === filterInitiative;
        const isChild = item.parentId === filterInitiative;
        const parent = workItems.find(p => p.id === item.parentId);
        const isGrandChild = parent?.parentId === filterInitiative;
        if (!isSelf && !isChild && !isGrandChild) return false;
      }

      // Filtro de Entrega
      if (filterDelivery) {
        const isSelf = item.id === filterDelivery;
        const isChild = item.parentId === filterDelivery;
        if (!isSelf && !isChild) return false;
      }

      return true;
    });
  }, [sprintItems, filterWS, filterInitiative, filterDelivery, workItems]);
  
  const totalPoints = sprintItems.reduce((acc, curr) => acc + curr.effort, 0);
  const donePoints = sprintItems.filter(i => i.status === ItemStatus.CLOSED).reduce((acc, curr) => acc + curr.effort, 0);
  const progress = totalPoints > 0 ? (donePoints / totalPoints) * 100 : 0;
  const blockedItems = sprintItems.filter(i => i.blocked).length;

  const handleStatusChange = (itemId: string, newColumn: BoardColumn) => {
    let newStatus = ItemStatus.NEW;
    if (newColumn === BoardColumn.NEW || newColumn === BoardColumn.TODO) newStatus = ItemStatus.NEW;
    if (newColumn === BoardColumn.DOING) newStatus = ItemStatus.ACTIVE;
    if (newColumn === BoardColumn.DONE) newStatus = ItemStatus.CLOSED;
    updateWorkItem(itemId, { column: newColumn, status: newStatus });
  };

  const clearFilters = () => {
    setFilterWS('');
    setFilterInitiative('');
    setFilterDelivery('');
  };

  const selectedItem = workItems.find(i => i.id === selectedItemId);

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b px-6 py-4 shrink-0 shadow-sm relative z-20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Sprint Selecionada</span>
                <select 
                  className="text-xl font-bold border-none bg-transparent hover:bg-gray-100 rounded p-1 -ml-1 cursor-pointer focus:ring-0"
                  value={selectedSprint?.id}
                  onChange={(e) => setSprint(e.target.value)}
                >
                  {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>
            <div className={`mt-4 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
              selectedSprint?.status === 'Ativa' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
            }`}>
              {selectedSprint?.status}
            </div>
          </div>
          
          <div className="flex items-center gap-6">
             <div className="text-right">
               <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">Progresso Total</p>
               <div className="flex items-center gap-2">
                 <div className="w-32 bg-gray-200 h-1.5 rounded-full overflow-hidden">
                   <div className="bg-blue-600 h-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                 </div>
                 <span className="text-xs font-bold text-gray-700">{Math.round(progress)}%</span>
               </div>
             </div>
             <button className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm">
               Encerrar Sprint
             </button>
          </div>
        </div>

        <div className="flex items-center justify-between border-t pt-4">
           <div className="flex gap-4">
              <button 
                onClick={() => setActiveTab('taskboard')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 transition-all ${
                  activeTab === 'taskboard' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <LayoutGrid size={18} /> Taskboard
              </button>
              <button 
                onClick={() => setActiveTab('backlog')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 transition-all ${
                  activeTab === 'backlog' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <ListTodo size={18} /> Planejamento
              </button>
           </div>
           
           <div className="flex items-center gap-3">
             <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 gap-2 shadow-inner">
               <Filter size={14} className="text-gray-400 ml-1" />
               <div className="flex items-center gap-1">
                 <Layers size={12} className="text-orange-500" />
                 <select 
                    className="bg-transparent border-none text-[11px] font-bold text-gray-600 focus:ring-0 py-0 pl-1 pr-6 cursor-pointer max-w-[120px]" 
                    value={filterWS} 
                    onChange={(e) => { setFilterWS(e.target.value); setFilterInitiative(''); setFilterDelivery(''); }}
                 >
                   <option value="">Todas as Frentes</option>
                   {availableFrentes.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
                 </select>
               </div>
               <div className="w-px h-4 bg-gray-200"></div>
               <div className="flex items-center gap-1">
                 <Target size={12} className="text-purple-500" />
                 <select 
                    className="bg-transparent border-none text-[11px] font-bold text-gray-600 focus:ring-0 py-0 pl-1 pr-6 cursor-pointer max-w-[120px]" 
                    value={filterInitiative} 
                    onChange={(e) => { setFilterInitiative(e.target.value); setFilterDelivery(''); }}
                 >
                   <option value="">Iniciativas</option>
                   {availableInitiatives.map(i => <option key={i.id} value={i.id}>{i.title}</option>)}
                 </select>
               </div>
               <div className="w-px h-4 bg-gray-200"></div>
               <div className="flex items-center gap-1">
                 <Box size={12} className="text-blue-500" />
                 <select 
                    className="bg-transparent border-none text-[11px] font-bold text-gray-600 focus:ring-0 py-0 pl-1 pr-6 cursor-pointer max-w-[120px]" 
                    value={filterDelivery} 
                    onChange={(e) => setFilterDelivery(e.target.value)}
                 >
                   <option value="">Entregas</option>
                   {availableDeliveries.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
                 </select>
               </div>
               {(filterWS || filterInitiative || filterDelivery) && (
                 <button onClick={clearFilters} className="p-1 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                   <X size={14} />
                 </button>
               )}
             </div>

             <div className="h-6 w-px bg-gray-200"></div>
             <div className="flex items-center gap-4 text-[11px] font-medium text-gray-500">
               <div className="flex items-center gap-1.5"><Clock size={14}/> {selectedSprint?.startDate} — {selectedSprint?.endDate}</div>
               {blockedItems > 0 && <div className="flex items-center gap-1.5 text-red-500 font-bold"><AlertCircle size={14}/> {blockedItems} Bloqueios</div>}
             </div>
           </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar p-6 bg-slate-50">
        {activeTab === 'taskboard' ? (
          <div className="flex h-full gap-6 min-w-[1200px]">
            {Object.values(BoardColumn).map(col => (
              <div 
                key={col} 
                className={`flex-1 flex flex-col rounded-2xl p-4 border-2 transition-all duration-200 ${
                  dragOverCol === col ? 'bg-blue-50 border-blue-400 border-dashed scale-[1.01]' : 'bg-slate-100/50 border-slate-200'
                } shadow-sm`}
                onDragOver={(e) => { e.preventDefault(); setDragOverCol(col); }}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverCol(null);
                  const draggedId = e.dataTransfer.getData('itemId');
                  if (draggedId) handleStatusChange(draggedId, col);
                }}
              >
                <div className="flex items-center justify-between mb-4 px-1">
                  <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    {col}
                    <span className="bg-slate-200 text-slate-700 text-[10px] px-2 py-0.5 rounded-md font-black">
                      {filteredItems.filter(i => i.column === col).length}
                    </span>
                  </h3>
                  <button onClick={() => addWorkItem({ title: 'Nova Tarefa', column: col, sprintId: selectedSprint?.id, type: ItemType.TASK, workstreamId: filterWS || undefined, parentId: filterDelivery || filterInitiative || undefined })} className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
                    <Plus size={18} strokeWidth={3} />
                  </button>
                </div>
                
                <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar min-h-[100px]">
                  {filteredItems.filter(i => i.column === col).map(item => (
                    <div 
                      key={item.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('itemId', item.id);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onClick={() => setSelectedItemId(item.id)}
                      className={`bg-white p-4 rounded-xl border-l-[6px] shadow-sm hover:shadow-lg hover:bg-slate-50 hover:border-blue-400 transition-all task-card-hand group relative select-none border border-slate-100 ${
                        item.priority === 'P1' ? 'border-l-red-500' :
                        item.priority === 'P2' ? 'border-l-orange-500' :
                        'border-l-blue-500'
                      } ${item.blocked ? 'opacity-90 bg-red-50/50' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-black text-slate-300 font-mono tracking-tighter">{item.id}</span>
                        <span className="text-[9px] font-black px-2 py-0.5 bg-slate-100 rounded-md text-slate-500 uppercase tracking-tighter">{item.type}</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 leading-tight group-hover:text-blue-700 transition-colors mb-3 line-clamp-2">{item.title}</h4>
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 border border-white flex items-center justify-center text-[10px] font-black text-slate-500">
                            {users.find(u => u.id === item.assigneeId)?.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <span className="text-[10px] font-black text-slate-400">{item.effort} PTS</span>
                        </div>
                        {item.blocked && (
                          <div className="p-1 bg-red-100 text-red-600 rounded-lg animate-pulse" title={item.blockReason}>
                            <AlertCircle size={14} strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 max-w-5xl mx-auto mt-4">
             <div className="mb-8 p-6 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-start gap-4">
               <div className="bg-blue-600 text-white p-3 rounded-xl shadow-lg">
                 <Target size={24} />
               </div>
               <div>
                 <h4 className="text-sm font-black text-blue-900 uppercase tracking-widest mb-1">Objetivo da Sprint</h4>
                 <p className="text-sm text-blue-800 font-medium">{selectedSprint?.objective || 'Nenhum objetivo definido para esta sprint.'}</p>
               </div>
             </div>
             <div className="space-y-4">
               {filteredItems.map(item => (
                 <div key={item.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 hover:border-blue-200 transition-all cursor-pointer group shadow-sm" onClick={() => setSelectedItemId(item.id)}>
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-black text-slate-300 font-mono tracking-tighter">{item.id}</span>
                      <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">{item.title}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-[10px] px-3 py-1 rounded-lg font-black uppercase tracking-widest ${
                        item.status === ItemStatus.CLOSED ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                      }`}>{item.status}</span>
                    </div>
                 </div>
               ))}
               <button onClick={() => addWorkItem({ title: 'Nova Entrega do Backlog', type: ItemType.DELIVERY, sprintId: selectedSprint?.id, column: BoardColumn.NEW, status: ItemStatus.NEW })} className="w-full py-5 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-black text-xs uppercase tracking-widest hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/30 transition-all flex items-center justify-center gap-2">
                 <Plus size={20} strokeWidth={3} /> Adicionar Item do Backlog à Sprint
               </button>
             </div>
          </div>
        )}
      </div>

      {selectedItem && (
        <ItemPanel item={selectedItem} onClose={() => setSelectedItemId(null)} />
      )}
    </div>
  );
};

export default SprintView;
