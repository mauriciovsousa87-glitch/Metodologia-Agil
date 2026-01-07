
import React, { useState, useMemo } from 'react';
import { 
  Calendar, Users, Info, Plus, ChevronRight, 
  LayoutGrid, ListTodo, AlertCircle, Clock, MoreVertical, Trash2, Filter, Layers, Target, Box, X, Edit, Trash, Loader2, Zap
} from 'lucide-react';
import { useAgile } from '../../store';
import { WorkItem, ItemType, BoardColumn, ItemStatus, ItemPriority } from '../../types';
import ItemPanel from '../Backlog/ItemPanel';

// Paleta de cores para as Iniciativas
const INITIATIVE_COLORS = [
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
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [armDelete, setArmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [editName, setEditName] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editObjective, setEditObjective] = useState('');
  const [editStatus, setEditStatus] = useState<'Planejada' | 'Ativa' | 'Encerrada'>('Planejada');

  // Helper para cor baseada no ID da Iniciativa
  const getThemeByInitiative = (initiativeId: string | undefined) => {
    if (!initiativeId) return { strip: 'border-l-slate-300', text: 'text-slate-500', badge: 'bg-slate-50 border-slate-100' };
    let hash = 0;
    for (let i = 0; i < initiativeId.length; i++) {
      hash = initiativeId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % INITIATIVE_COLORS.length;
    return INITIATIVE_COLORS[index];
  };

  const openEditModal = () => {
    if (selectedSprint) {
      setEditName(selectedSprint.name);
      setEditStart(selectedSprint.startDate);
      setEditEnd(selectedSprint.endDate);
      setEditObjective(selectedSprint.objective);
      setEditStatus(selectedSprint.status);
      setArmDelete(false);
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
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await syncTasksWithSprints();
    } catch (error) {
      console.error("Falha na sincronização:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTriggerDelete = async () => {
    if (!selectedSprint) return;
    if (!armDelete) {
      setArmDelete(true);
      return;
    }
    setIsDeleting(true);
    try {
      await deleteSprint(selectedSprint.id);
      setIsEditModalOpen(false);
      setArmDelete(false);
    } finally {
      setIsDeleting(false);
    }
  };
  
  const [filterWS, setFilterWS] = useState<string>(''); 
  const [filterInitiative, setFilterInitiative] = useState<string>(''); 

  const availableFrentes = useMemo(() => workItems.filter(i => i.type === ItemType.WORKSTREAM), [workItems]);

  const availableInitiatives = useMemo(() => {
    let items = workItems.filter(i => i.type === ItemType.INITIATIVE);
    if (filterWS) items = items.filter(i => i.parentId === filterWS || i.workstreamId === filterWS);
    return items;
  }, [workItems, filterWS]);

  const sprintItems = useMemo(() => workItems.filter(item => item.sprintId === selectedSprint?.id), [workItems, selectedSprint]);

  const filteredItems = useMemo(() => {
    return sprintItems.filter(item => {
      if (filterWS && item.workstreamId !== filterWS && item.id !== filterWS) return false;
      if (filterInitiative) {
        const isSelf = item.id === filterInitiative;
        const isChild = item.parentId === filterInitiative;
        const parent = workItems.find(p => p.id === item.parentId);
        if (!isSelf && !isChild && parent?.parentId !== filterInitiative) return false;
      }
      return true;
    });
  }, [sprintItems, filterWS, filterInitiative, workItems]);
  
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

  // Definimos as colunas que o quadro vai mostrar
  const columns = [BoardColumn.TODO, BoardColumn.DOING, BoardColumn.DONE];

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b px-4 py-2 shrink-0 shadow-sm relative z-20">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider leading-none">Sprint Selecionada</span>
                <div className="flex items-center gap-2">
                  <select 
                    className="text-md font-bold border-none bg-transparent hover:bg-gray-100 rounded p-0.5 -ml-1 cursor-pointer focus:ring-0"
                    value={selectedSprint?.id || ''}
                    onChange={(e) => setSprint(e.target.value)}
                  >
                    {!selectedSprint && <option value="">Sem Sprint Selecionada</option>}
                    {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <button onClick={handleSync} disabled={isSyncing || sprints.length === 0} className={`p-1 rounded transition-all border group relative ${isSyncing ? 'bg-orange-100 border-orange-200 cursor-not-allowed' : 'bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-100'}`}>
                    {isSyncing ? <Loader2 size={12} className="animate-spin text-orange-600" /> : <Zap size={12} fill="currentColor" />}
                    <span className="absolute left-full ml-2 hidden group-hover:block bg-slate-800 text-white text-[8px] font-bold px-2 py-1 rounded whitespace-nowrap z-50">Sincronizar Alocação</span>
                  </button>
                </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-right">
               <p className="text-[8px] text-gray-400 uppercase font-black tracking-tight">Progresso Total</p>
               <div className="flex items-center gap-1.5">
                 <div className="w-20 bg-gray-100 h-1 rounded-full overflow-hidden">
                   <div className="bg-blue-600 h-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                 </div>
                 <span className="text-[9px] font-bold text-gray-600">{Math.round(progress)}%</span>
               </div>
             </div>
             <button disabled={!selectedSprint} onClick={openEditModal} className="bg-white border border-gray-200 hover:bg-gray-50 text-slate-700 px-2 py-1 rounded text-[10px] font-black transition-all flex items-center gap-1.5">
               <Edit size={12} /> EDITAR
             </button>
          </div>
        </div>

        <div className="flex items-center justify-between border-t pt-1">
           <div className="flex gap-2">
              <button onClick={() => setActiveTab('taskboard')} className={`flex items-center gap-1.5 px-2 py-1 text-[10px] font-black border-b-2 transition-all ${activeTab === 'taskboard' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                <LayoutGrid size={14} /> QUADRO
              </button>
              <button onClick={() => setActiveTab('backlog')} className={`flex items-center gap-1.5 px-2 py-1 text-[10px] font-black border-b-2 transition-all ${activeTab === 'backlog' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                <ListTodo size={14} /> PLANO
              </button>
           </div>
           
           <div className="flex items-center gap-2">
             <div className="flex items-center bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5 gap-2">
               <Filter size={10} className="text-gray-300" />
               <select className="bg-transparent border-none text-[9px] font-bold text-gray-500 focus:ring-0 p-0 cursor-pointer max-w-[80px]" value={filterWS} onChange={(e) => { setFilterWS(e.target.value); setFilterInitiative(''); }}>
                 <option value="">Frentes</option>
                 {availableFrentes.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
               </select>
               <select className="bg-transparent border-none text-[9px] font-bold text-gray-500 focus:ring-0 p-0 cursor-pointer max-w-[80px]" value={filterInitiative} onChange={(e) => { setFilterInitiative(e.target.value); }}>
                 <option value="">Iniciativas</option>
                 {availableInitiatives.map(i => <option key={i.id} value={i.id}>{i.title}</option>)}
               </select>
               {(filterWS || filterInitiative) && (
                 <button onClick={() => { setFilterWS(''); setFilterInitiative(''); }} className="p-0.5 text-gray-400">
                   <X size={10} />
                 </button>
               )}
             </div>
             <div className="flex items-center gap-2 text-[9px] font-medium text-gray-400">
               <Clock size={10}/> Término: {selectedSprint?.endDate || '--'}
               {blockedItems > 0 && <span className="text-red-500 font-black">! {blockedItems} bloqueados</span>}
             </div>
           </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar p-3 bg-slate-50">
        {!selectedSprint ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 opacity-30">
             <Calendar size={48} />
             <p className="text-xs font-black uppercase tracking-widest">Nenhuma Sprint selecionada</p>
          </div>
        ) : activeTab === 'taskboard' ? (
          <div className="flex h-full gap-3 min-w-[900px]">
            {columns.map(col => {
              // Ajuste de filtro: itens que pertencem a esta coluna ou que não tem coluna e a coluna atual é TODO
              const itemsInCol = filteredItems.filter(item => {
                const itemCol = item.column || BoardColumn.TODO;
                return itemCol === col || (col === BoardColumn.TODO && itemCol === BoardColumn.NEW);
              });

              return (
                <div 
                  key={col} 
                  className={`flex-1 flex flex-col rounded-lg p-2 border transition-all duration-200 ${
                    dragOverCol === col ? 'bg-blue-50 border-blue-300 border-dashed' : 'bg-slate-100/40 border-slate-200'
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setDragOverCol(col); }}
                  onDragLeave={() => setDragOverCol(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverCol(null);
                    const draggedId = e.dataTransfer.getData('itemId');
                    if (draggedId) handleStatusChange(draggedId, col);
                  }}
                >
                  <div className="flex items-center justify-between mb-2 px-1">
                    <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      {col}
                      <span className="bg-slate-200 text-slate-600 px-1 rounded font-black">{itemsInCol.length}</span>
                    </h3>
                    <button onClick={() => addWorkItem({ title: 'Nova Tarefa', column: col, sprintId: selectedSprint?.id, type: ItemType.TASK, status: ItemStatus.NEW })} className="p-0.5 text-slate-400 hover:text-slate-600">
                      <Plus size={14} />
                    </button>
                  </div>
                  
                  <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar min-h-[50px]">
                    {itemsInCol.map(item => {
                      const assignee = users.find(u => u.id === item.assigneeId);
                      const delivery = workItems.find(i => i.id === item.parentId);
                      const initiative = delivery ? workItems.find(i => i.id === delivery.parentId) : null;
                      const theme = getThemeByInitiative(initiative?.id || delivery?.id);

                      return (
                        <div 
                          key={item.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('itemId', item.id);
                          }}
                          onClick={() => setSelectedItemId(item.id)}
                          className={`p-2.5 rounded border-l-[4px] shadow-sm hover:shadow-md transition-all task-card-hand group select-none border bg-white border-slate-100 ${theme.strip} ${item.blocked ? 'opacity-80' : ''}`}
                        >
                          {(initiative || delivery) && (
                            <div className={`mb-2 flex flex-wrap items-center gap-1 text-[7px] font-black uppercase tracking-tight ${theme.text}`}>
                              {initiative && (
                                <span className={`px-1.5 py-0.5 rounded border leading-none ${theme.badge} whitespace-normal text-left break-words max-w-full`}>
                                  {initiative.title}
                                </span>
                              )}
                              {initiative && delivery && <ChevronRight size={8} className="shrink-0" />}
                              {delivery && (
                                <span className={`px-1.5 py-0.5 rounded border leading-none ${theme.badge} whitespace-normal text-left break-words max-w-full`}>
                                  {delivery.title}
                                </span>
                              )}
                            </div>
                          )}

                          <div className="flex justify-between items-start mb-1.5">
                            <div className="flex items-center gap-1.5">
                               <div className={`w-2 h-2 rounded-full shrink-0 ${
                                 item.priority === ItemPriority.P1 ? 'bg-red-500' :
                                 item.priority === ItemPriority.P2 ? 'bg-orange-500' : 'bg-blue-400'
                               }`} />
                               <h4 className="text-[12px] font-bold text-slate-800 leading-tight group-hover:text-blue-700 transition-colors line-clamp-2">
                                 {item.title}
                               </h4>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[8px] font-black text-slate-500 overflow-hidden shrink-0">
                                {assignee?.avatar_url ? <img src={assignee.avatar_url} className="w-full h-full object-cover" /> : <span>?</span>}
                              </div>
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{item.effort} PTS</span>
                            </div>
                            {item.blocked && (
                              <div className="flex items-center gap-1 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 animate-pulse">
                                <AlertCircle size={10} className="text-red-500" />
                                <span className="text-[7px] font-black text-red-600 uppercase">BLOQUEADO</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 max-w-4xl mx-auto">
             <div className="mb-4 p-3 bg-blue-50/50 rounded-lg border border-blue-100 flex items-start gap-3">
               <Target size={18} className="text-blue-600 mt-0.5" />
               <p className="text-[11px] text-blue-800 font-medium leading-relaxed">{selectedSprint?.objective || 'Sem objetivo definido para este ciclo.'}</p>
             </div>
             <div className="space-y-1.5">
               {filteredItems.map(item => (
                 <div key={item.id} className="flex items-center justify-between p-2.5 bg-white border border-slate-100 rounded-lg hover:bg-slate-50 transition-all cursor-pointer group" onClick={() => setSelectedItemId(item.id)}>
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-black text-slate-300 font-mono">{item.id}</span>
                      <span className="text-[11px] font-bold text-slate-700 group-hover:text-blue-600">{item.title}</span>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-[7px] font-black border uppercase ${
                      item.status === ItemStatus.CLOSED ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                    }`}>{item.status}</span>
                 </div>
               ))}
             </div>
          </div>
        )}
      </div>

      {isEditModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95" onMouseDown={(e) => e.stopPropagation()}>
              <div className="bg-slate-50 p-5 border-b flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Configurar Sprint</h3>
                <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Nome da Sprint</label>
                  <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold focus:border-blue-500 outline-none" value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Início</label>
                    <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none" value={editStart} onChange={(e) => setEditStart(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Fim</label>
                    <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Status</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none" value={editStatus} onChange={(e) => setEditStatus(e.target.value as any)}>
                    <option value="Planejada">Planejada</option>
                    <option value="Ativa">Ativa</option>
                    <option value="Encerrada">Encerrada</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Objetivo</label>
                  <textarea className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none h-16 resize-none" value={editObjective} onChange={(e) => setEditObjective(e.target.value)} />
                </div>
              </div>
              <div className="p-4 bg-slate-50 border-t flex gap-2">
                <button 
                  disabled={isDeleting} 
                  onClick={handleTriggerDelete} 
                  className={`px-3 py-2 rounded text-[10px] font-black uppercase transition-all flex items-center gap-1.5 border ${
                    armDelete 
                      ? 'bg-red-600 text-white border-red-700 animate-pulse shadow-lg' 
                      : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100'
                  }`}
                >
                  {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash size={12} />}
                  {armDelete ? 'CONFIRMAR AGORA' : 'EXCLUIR'}
                </button>
                <div className="flex-1" />
                <button onClick={() => setIsEditModalOpen(false)} className="px-3 py-2 text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase">Cancelar</button>
                <button onClick={handleUpdateSprint} className="px-4 py-2 bg-slate-900 text-white text-[10px] font-black rounded-lg shadow-lg hover:bg-slate-800 transition-all uppercase">Salvar</button>
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
