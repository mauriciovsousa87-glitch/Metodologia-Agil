
import React, { useState, useMemo } from 'react';
import { 
  Calendar, Users, Info, Plus, ChevronRight, 
  LayoutGrid, ListTodo, AlertCircle, Clock, MoreVertical, Trash2, Filter, Layers, Target, Box, X, Edit, Trash, Loader2, Zap
} from 'lucide-react';
import { useAgile } from '../../store';
import { WorkItem, ItemType, BoardColumn, ItemStatus, ItemPriority } from '../../types';
import ItemPanel from '../Backlog/ItemPanel';

const DELIVERY_COLORS = [
  { strip: 'border-l-blue-600', text: 'text-blue-700', badge: 'bg-blue-50 border-blue-100' },
  { strip: 'border-l-emerald-600', text: 'text-emerald-700', badge: 'bg-emerald-50 border-emerald-100' },
  { strip: 'border-l-violet-600', text: 'text-violet-700', badge: 'bg-violet-50 border-violet-100' },
  { strip: 'border-l-amber-600', text: 'text-amber-700', badge: 'bg-amber-50 border-amber-100' },
  { strip: 'border-l-rose-600', text: 'text-rose-700', badge: 'bg-rose-50 border-rose-100' },
  { strip: 'border-l-indigo-600', text: 'text-indigo-700', badge: 'bg-indigo-50 border-indigo-100' },
  { strip: 'border-l-cyan-600', text: 'text-cyan-700', badge: 'bg-cyan-50 border-cyan-100' },
  { strip: 'border-l-fuchsia-600', text: 'text-fuchsia-700', badge: 'bg-fuchsia-50 border-fuchsia-100' },
];

const SprintView: React.FC = () => {
  const { sprints, selectedSprint, setSprint, workItems, users, updateWorkItem, addWorkItem, updateSprint, deleteSprint, syncTasksWithSprints, loading: globalLoading } = useAgile();
  const [activeTab, setActiveTab] = useState<'backlog' | 'taskboard'>('taskboard');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const getDeliveryTheme = (deliveryId: string | undefined) => {
    if (!deliveryId) return { strip: 'border-l-slate-300', text: 'text-slate-500', badge: 'bg-slate-50 border-slate-100' };
    let hash = 0;
    for (let i = 0; i < deliveryId.length; i++) {
      hash = deliveryId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % DELIVERY_COLORS.length;
    return DELIVERY_COLORS[index];
  };

  const openEditModal = () => {
    if (selectedSprint) {
      setEditName(selectedSprint.name);
      setEditStart(selectedSprint.startDate);
      setEditEnd(selectedSprint.endDate);
      setEditObjective(selectedSprint.objective);
      setEditStatus(selectedSprint.status);
      setIsEditModalOpen(true);
    }
  };

  const handleUpdateSprint = async () => {
    if (selectedSprint) {
      await updateSprint(selectedSprint.id, {
        name: editName,
        startDate: editStart,
        endDate: editEnd,
        objective: editObjective,
        status: editStatus
      });
      setIsEditModalOpen(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncTasksWithSprints();
      alert("Sincronização concluída! As tarefas foram redistribuídas com base em suas datas de término.");
    } catch (error) {
      console.error(error);
      alert("Ocorreu um erro ao sincronizar.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteSprint = async () => {
    if (!selectedSprint) return;
    const confirmMsg = `Deseja realmente excluir a ${selectedSprint.name}?\n\nIsso desvinculará todas as tarefas desta sprint.`;
    if (confirm(confirmMsg)) {
      setIsDeleting(true);
      try {
        await deleteSprint(selectedSprint.id);
        setIsEditModalOpen(false);
      } finally {
        setIsDeleting(false);
      }
    }
  };
  
  const [filterWS, setFilterWS] = useState<string>(''); 
  const [filterInitiative, setFilterInitiative] = useState<string>(''); 
  const [filterDelivery, setFilterDelivery] = useState<string>(''); 

  const availableFrentes = useMemo(() => 
    workItems.filter(i => i.type === ItemType.WORKSTREAM),
    [workItems]
  );

  const availableInitiatives = useMemo(() => {
    let items = workItems.filter(i => i.type === ItemType.INITIATIVE);
    if (filterWS) items = items.filter(i => i.parentId === filterWS || i.workstreamId === filterWS);
    return items;
  }, [workItems, filterWS]);

  const availableDeliveries = useMemo(() => {
    let items = workItems.filter(i => i.type === ItemType.DELIVERY);
    if (filterInitiative) items = items.filter(i => i.parentId === filterInitiative);
    else if (filterWS) items = items.filter(i => i.workstreamId === filterWS);
    return items;
  }, [workItems, filterWS, filterInitiative]);

  const sprintItems = useMemo(() => 
    workItems.filter(item => item.sprintId === selectedSprint?.id),
    [workItems, selectedSprint]
  );

  const filteredItems = useMemo(() => {
    return sprintItems.filter(item => {
      if (filterWS && item.workstreamId !== filterWS && item.id !== filterWS) return false;
      if (filterInitiative) {
        const isSelf = item.id === filterInitiative;
        const isChild = item.parentId === filterInitiative;
        const parent = workItems.find(p => p.id === item.parentId);
        if (!isSelf && !isChild && parent?.parentId !== filterInitiative) return false;
      }
      if (filterDelivery && item.id !== filterDelivery && item.parentId !== filterDelivery) return false;
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
    if (newColumn === BoardColumn.DOING) newStatus = ItemStatus.IN_PROGRESS;
    if (newColumn === BoardColumn.DONE) newStatus = ItemStatus.CLOSED;
    updateWorkItem(itemId, { column: newColumn, status: newStatus });
  };

  const [editName, setEditName] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editObjective, setEditObjective] = useState('');
  const [editStatus, setEditStatus] = useState<'Planejada' | 'Ativa' | 'Encerrada'>('Planejada');

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b px-6 py-3 shrink-0 shadow-sm relative z-20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Sprint Selecionada</span>
                <div className="flex items-center gap-2">
                  <select 
                    className="text-lg font-bold border-none bg-transparent hover:bg-gray-100 rounded p-1 -ml-1 cursor-pointer focus:ring-0"
                    value={selectedSprint?.id || ''}
                    onChange={(e) => setSprint(e.target.value)}
                  >
                    {!selectedSprint && <option value="">Nenhuma Sprint</option>}
                    {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <button 
                    onClick={handleSync}
                    disabled={isSyncing || sprints.length === 0}
                    className="p-1.5 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-all shadow-sm border border-orange-200 group relative active:scale-95 disabled:opacity-50"
                  >
                    {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} fill="currentColor" />}
                    <span className="absolute left-full ml-3 hidden group-hover:block bg-slate-800 text-white text-[9px] font-black py-1 px-3 rounded-md whitespace-nowrap z-[200] uppercase tracking-widest shadow-xl">Sincronizar Distribuição</span>
                  </button>
                </div>
            </div>
            {selectedSprint && (
              <div className={`mt-2 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                selectedSprint?.status === 'Ativa' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
              }`}>
                {selectedSprint?.status}
              </div>
            )}
          </div>
          <div className="flex items-center gap-6">
             <div className="text-right">
               <p className="text-[9px] text-gray-500 uppercase font-bold tracking-tighter">Progresso Total</p>
               <div className="flex items-center gap-2">
                 <div className="w-24 bg-gray-200 h-1 rounded-full overflow-hidden">
                   <div className="bg-blue-600 h-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                 </div>
                 <span className="text-[10px] font-bold text-gray-700">{Math.round(progress)}%</span>
               </div>
             </div>
             <button disabled={!selectedSprint} onClick={openEditModal} className="bg-white border border-gray-300 hover:bg-gray-50 text-slate-800 px-3 py-1.5 rounded-lg text-[11px] font-black transition-all shadow-sm flex items-center gap-2 disabled:opacity-50">
               <Edit size={14} /> EDITAR SPRINT
             </button>
          </div>
        </div>

        <div className="flex items-center justify-between border-t pt-2">
           <div className="flex gap-4">
              <button onClick={() => setActiveTab('taskboard')} className={`flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold border-b-2 transition-all ${activeTab === 'taskboard' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
                <LayoutGrid size={16} /> Taskboard
              </button>
              <button onClick={() => setActiveTab('backlog')} className={`flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold border-b-2 transition-all ${activeTab === 'backlog' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
                <ListTodo size={16} /> Planejamento
              </button>
           </div>
           
           <div className="flex items-center gap-2">
             <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-2 py-0.5 gap-2 shadow-inner">
               <Filter size={12} className="text-gray-400" />
               <div className="flex items-center gap-1">
                 <Layers size={10} className="text-orange-500" />
                 <select className="bg-transparent border-none text-[10px] font-bold text-gray-600 focus:ring-0 py-0 pl-1 pr-6 cursor-pointer max-w-[100px]" value={filterWS} onChange={(e) => { setFilterWS(e.target.value); setFilterInitiative(''); setFilterDelivery(''); }}>
                   <option value="">Frentes</option>
                   {availableFrentes.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
                 </select>
               </div>
               <div className="w-px h-3 bg-gray-200"></div>
               <div className="flex items-center gap-1">
                 <Target size={10} className="text-purple-500" />
                 <select className="bg-transparent border-none text-[10px] font-bold text-gray-600 focus:ring-0 py-0 pl-1 pr-6 cursor-pointer max-w-[100px]" value={filterInitiative} onChange={(e) => { setFilterInitiative(e.target.value); setFilterDelivery(''); }}>
                   <option value="">Iniciativas</option>
                   {availableInitiatives.map(i => <option key={i.id} value={i.id}>{i.title}</option>)}
                 </select>
               </div>
               <div className="w-px h-3 bg-gray-200"></div>
               <div className="flex items-center gap-1">
                 <Box size={10} className="text-blue-500" />
                 <select className="bg-transparent border-none text-[10px] font-bold text-gray-600 focus:ring-0 py-0 pl-1 pr-6 cursor-pointer max-w-[100px]" value={filterDelivery} onChange={(e) => setFilterDelivery(e.target.value)}>
                   <option value="">Entregas</option>
                   {availableDeliveries.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
                 </select>
               </div>
               {(filterWS || filterInitiative || filterDelivery) && (
                 <button onClick={() => { setFilterWS(''); setFilterInitiative(''); setFilterDelivery(''); }} className="p-0.5 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                   <X size={12} />
                 </button>
               )}
             </div>
             <div className="h-4 w-px bg-gray-200"></div>
             <div className="flex items-center gap-3 text-[10px] font-medium text-gray-500">
               <div className="flex items-center gap-1"><Clock size={12}/> {selectedSprint?.startDate || '--'} — {selectedSprint?.endDate || '--'}</div>
               {blockedItems > 0 && <div className="flex items-center gap-1 text-red-500 font-bold"><AlertCircle size={12}/> {blockedItems}</div>}
             </div>
           </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar p-4 bg-slate-50">
        {!selectedSprint ? (
          <div className="h-full flex flex-col items-center justify-center gap-6 opacity-40">
             <Calendar size={64} className="text-slate-300" />
             <p className="text-lg font-black text-slate-400 uppercase tracking-widest text-center">Nenhuma Sprint selecionada.</p>
          </div>
        ) : activeTab === 'taskboard' ? (
          <div className="flex h-full gap-4 min-w-[1000px]">
            {Object.values(BoardColumn).map(col => (
              <div 
                key={col} 
                className={`flex-1 flex flex-col rounded-xl p-3 border-2 transition-all duration-200 ${
                  dragOverCol === col ? 'bg-blue-50 border-blue-400 border-dashed' : 'bg-slate-100/50 border-slate-200'
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
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    {col}
                    <span className="bg-slate-200 text-slate-700 text-[9px] px-1.5 py-0.5 rounded font-black">
                      {filteredItems.filter(i => i.column === col).length}
                    </span>
                  </h3>
                  <button onClick={() => addWorkItem({ title: 'Nova Tarefa', column: col, sprintId: selectedSprint?.id, type: ItemType.TASK, workstreamId: filterWS || undefined, parentId: filterDelivery || filterInitiative || undefined, status: ItemStatus.NEW })} className="p-1 hover:bg-slate-200 rounded text-slate-500 transition-colors">
                    <Plus size={16} strokeWidth={3} />
                  </button>
                </div>
                
                <div className="flex-1 space-y-2.5 overflow-y-auto custom-scrollbar min-h-[100px]">
                  {filteredItems.filter(i => i.column === col).map(item => {
                    const assignee = users.find(u => u.id === item.assigneeId);
                    const delivery = workItems.find(i => i.id === item.parentId);
                    const initiative = delivery ? workItems.find(i => i.id === delivery.parentId) : null;
                    const theme = getDeliveryTheme(delivery?.id);

                    return (
                      <div 
                        key={item.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('itemId', item.id);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onClick={() => setSelectedItemId(item.id)}
                        className={`p-3 rounded-lg border-l-[4px] shadow-sm hover:shadow-md hover:border-blue-400 transition-all task-card-hand group relative select-none border bg-white border-slate-100 ${theme.strip} ${item.blocked ? 'opacity-90 grayscale-[0.5]' : ''}`}
                      >
                        {(initiative || delivery) && (
                          <div className={`mb-1.5 flex items-center gap-1 text-[7px] font-black uppercase tracking-tighter ${theme.text}`}>
                            {initiative && <span className={`px-1 py-0.5 rounded border ${theme.badge} max-w-[60px] truncate`}>{initiative.title}</span>}
                            {initiative && delivery && <ChevronRight size={6} />}
                            {delivery && <span className={`px-1 py-0.5 rounded border ${theme.badge} max-w-[80px] truncate`}>{delivery.title}</span>}
                          </div>
                        )}

                        <div className="flex justify-between items-start mb-1">
                          <div className="flex items-center gap-1">
                             <div className={`w-1.5 h-1.5 rounded-full ${
                               item.priority === ItemPriority.P1 ? 'bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]' :
                               item.priority === ItemPriority.P2 ? 'bg-orange-500' : 'bg-blue-400'
                             }`} />
                             <span className="text-[8px] font-black text-slate-300 font-mono tracking-tighter">{item.id}</span>
                          </div>
                        </div>
                        
                        <h4 className="text-[12px] font-bold text-slate-800 leading-tight group-hover:text-blue-700 transition-colors mb-2 line-clamp-2">{item.title}</h4>
                        
                        <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[8px] font-black text-slate-500 overflow-hidden">
                              {assignee?.avatar_url ? (
                                <img src={assignee.avatar_url} className="w-full h-full object-cover" alt={assignee.name} />
                              ) : (
                                <span>{assignee?.name ? assignee.name[0] : '?'}</span>
                              )}
                            </div>
                            <span className="text-[8px] font-black text-slate-400 uppercase">{item.effort} PTS</span>
                          </div>
                          {item.blocked && (
                            <div className="p-0.5 bg-red-100 text-red-600 rounded animate-pulse" title={item.blockReason}>
                              <AlertCircle size={12} strokeWidth={3} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 max-w-5xl mx-auto mt-2">
             <div className="mb-6 p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex items-start gap-4">
               <div className="bg-blue-600 text-white p-2 rounded-lg shadow-md">
                 <Target size={20} />
               </div>
               <div>
                 <h4 className="text-[11px] font-black text-blue-900 uppercase tracking-widest mb-1">Objetivo da Sprint</h4>
                 <p className="text-sm text-blue-800 font-medium">{selectedSprint?.objective || 'Nenhum objetivo definido.'}</p>
               </div>
             </div>
             <div className="space-y-2">
               {filteredItems.map(item => (
                 <div key={item.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:bg-slate-50 hover:border-blue-200 transition-all cursor-pointer group shadow-sm" onClick={() => setSelectedItemId(item.id)}>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-black text-slate-300 font-mono tracking-tighter">{item.id}</span>
                      <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">{item.title}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black border uppercase tracking-widest ${
                        item.status === ItemStatus.CLOSED ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                        item.status === ItemStatus.IN_PROGRESS ? 'bg-amber-100 text-amber-700 border-amber-200' :
                        'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>{item.status}</span>
                    </div>
                 </div>
               ))}
             </div>
          </div>
        )}
      </div>

      {isEditModalOpen && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in">
            <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
              <div className="bg-slate-50 p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Configurar Sprint</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Alterar dados da iteração</p>
                </div>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-400 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-8 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Título da Iteração</label>
                  <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-black focus:border-blue-500 outline-none" value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Data Início</label>
                    <input type="date" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-black focus:border-blue-500 outline-none" value={editStart} onChange={(e) => setEditStart(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Data Fim</label>
                    <input type="date" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-black focus:border-blue-500 outline-none" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Status da Sprint</label>
                  <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-black focus:border-blue-500 outline-none" value={editStatus} onChange={(e) => setEditStatus(e.target.value as any)}>
                    <option value="Planejada">Planejada</option>
                    <option value="Ativa">Ativa</option>
                    <option value="Encerrada">Encerrada</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Objetivo Macro</label>
                  <textarea className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-black focus:border-blue-500 outline-none h-20 resize-none" value={editObjective} onChange={(e) => setEditObjective(e.target.value)} />
                </div>
              </div>
              <div className="p-6 bg-slate-50 border-t flex gap-3">
                <button disabled={isDeleting} onClick={handleDeleteSprint} className="p-3 bg-white text-red-600 border-2 border-red-100 hover:bg-red-50 rounded-xl font-black text-[10px] uppercase transition-all flex items-center gap-2 disabled:opacity-50">
                  {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash size={14}/>} EXCLUIR
                </button>
                <div className="flex-1" />
                <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-3 text-sm font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-all">Cancelar</button>
                <button onClick={handleUpdateSprint} className="px-6 py-3 bg-slate-900 text-white text-sm font-black rounded-xl shadow-xl hover:bg-slate-800 transition-all">SALVAR</button>
              </div>
            </div>
          </div>
        )}

      {selectedItemId && (
        <ItemPanel item={workItems.find(i => i.id === selectedItemId)!} onClose={() => setSelectedItemId(null)} />
      )}
    </div>
  );
};

export default SprintView;
