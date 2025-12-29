
import React, { useState, useMemo } from 'react';
import { 
  ChevronRight, ChevronDown, Filter, 
  Plus, PlusCircle, Target, Layers, Trash2, AlertTriangle, BarChart2, ArrowUpDown, Loader2
} from 'lucide-react';
import { useAgile } from '../../store';
import { WorkItem, ItemType, ItemStatus } from '../../types';
import ItemPanel from './ItemPanel';

type SortKey = 'priority' | 'assignee' | 'kpi' | 'effort' | 'progress' | 'status' | 'id';

const BacklogView: React.FC = () => {
  const { workItems, users, sprints, addWorkItem, deleteWorkItem } = useAgile();
  const [isHierarchical, setIsHierarchical] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);
  const [armDeleteId, setArmDeleteId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    const next = new Set(expandedItems);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedItems(next);
  };

  const sortedAndFilteredItems = useMemo(() => {
    let items = [...workItems];
    if (filterText) items = items.filter(i => i.title.toLowerCase().includes(filterText.toLowerCase()));
    if (sortConfig) {
      items.sort((a, b) => {
        let valA: any = a[sortConfig.key as keyof WorkItem] || '';
        let valB: any = b[sortConfig.key as keyof WorkItem] || '';
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return items;
  }, [workItems, filterText, sortConfig]);

  const handleAddChild = async (parentId: string, type: ItemType) => {
    if (isProcessing) return;
    setIsProcessing(`${parentId}-${type}`);
    
    const parent = workItems.find(i => i.id === parentId);
    const titleMap = {
      [ItemType.INITIATIVE]: 'Nova Iniciativa',
      [ItemType.DELIVERY]: 'Nova Entrega',
      [ItemType.TASK]: 'Nova Tarefa',
      [ItemType.BUG]: 'Novo Bug',
      [ItemType.WORKSTREAM]: 'Nova Frente'
    };

    try {
      await addWorkItem({ 
        title: titleMap[type] || 'Novo Item', 
        type: type, 
        parentId: parentId,
        workstreamId: parent?.type === ItemType.WORKSTREAM ? parent.id : parent?.workstreamId,
        assigneeId: parent?.assigneeId
      });

      if (!expandedItems.has(parentId)) {
        const next = new Set(expandedItems);
        next.add(parentId);
        setExpandedItems(next);
      }
    } catch (e) {
      console.error("Erro ao criar filho:", e);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleAddTopLevel = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isProcessing) return;
    
    setIsProcessing('top-level');
    try {
      await addWorkItem({ title: 'Nova Frente de Trabalho', type: ItemType.WORKSTREAM });
    } catch (e) {
      console.error("Erro ao criar frente:", e);
    } finally {
      setIsProcessing(null);
    }
  };

  const getChildren = (parentId?: string) => sortedAndFilteredItems.filter(item => item.parentId === parentId);

  const calculateRollup = (item: WorkItem) => {
    const descendants: WorkItem[] = [];
    const stack = [...workItems.filter(i => i.parentId === item.id)];
    while (stack.length > 0) {
      const current = stack.pop()!;
      descendants.push(current);
      stack.push(...workItems.filter(i => i.parentId === current.id));
    }
    if (descendants.length === 0) return { totalEffort: item.effort || 0, progress: item.status === ItemStatus.CLOSED ? 100 : 0 };
    const totalEffort = descendants.reduce((acc, curr) => acc + (curr.effort || 0), 0);
    const completedEffort = descendants.filter(i => i.status === ItemStatus.CLOSED).reduce((acc, curr) => acc + (curr.effort || 0), 0);
    return { totalEffort, progress: totalEffort > 0 ? (completedEffort / totalEffort) * 100 : 0 };
  };

  const renderItem = (item: WorkItem, depth: number = 0) => {
    const children = getChildren(item.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const { totalEffort, progress } = calculateRollup(item);
    const assignee = users.find(u => u.id === item.assigneeId);
    const sprint = sprints.find(s => s.id === item.sprintId);
    const isArmed = armDeleteId === item.id;

    return (
      <React.Fragment key={item.id}>
        <tr className={`border-b hover:bg-blue-50/50 cursor-pointer transition-all group ${selectedItemId === item.id ? 'bg-blue-50' : ''}`} onClick={() => setSelectedItemId(item.id)}>
          <td className="px-4 py-3 text-[10px] text-gray-400 font-mono w-20">{item.id}</td>
          <td className="px-4 py-3">
             <div className="flex items-center gap-2">
               {isHierarchical && Array.from({ length: depth }).map((_, i) => <div key={i} className="w-4 shrink-0 border-l border-gray-100 h-6" />)}
               {isHierarchical && (hasChildren || item.type !== ItemType.TASK) ? (
                 <button onClick={(e) => { e.stopPropagation(); toggleExpand(item.id); }} className="text-gray-400 hover:text-gray-600 shrink-0">
                   {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                 </button>
               ) : (isHierarchical ? <div className="w-4 shrink-0" /> : null)}
               <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 border ${
                 item.type === ItemType.WORKSTREAM ? 'bg-orange-50 text-orange-700 border-orange-100' :
                 item.type === ItemType.INITIATIVE ? 'bg-purple-50 text-purple-700 border-purple-100' :
                 item.type === ItemType.DELIVERY ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-gray-50 text-gray-700 border-gray-100'
               }`}>
                 {item.type}
               </span>
               <span className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">{item.title}</span>
             </div>
          </td>
          
          <td className="px-4 py-3 w-48">
            <div className="flex items-center gap-1">
              {item.type === ItemType.WORKSTREAM && (
                <button 
                  disabled={!!isProcessing}
                  onClick={(e) => { e.stopPropagation(); handleAddChild(item.id, ItemType.INITIATIVE); }} 
                  className="flex items-center gap-1.5 px-3 py-1 bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white rounded-lg text-[9px] font-black border-2 border-purple-100 transition-all shadow-sm disabled:opacity-50"
                >
                  {isProcessing === `${item.id}-${ItemType.INITIATIVE}` ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} strokeWidth={3} />} INICIATIVA
                </button>
              )}
              {item.type === ItemType.INITIATIVE && (
                <button 
                  disabled={!!isProcessing}
                  onClick={(e) => { e.stopPropagation(); handleAddChild(item.id, ItemType.DELIVERY); }} 
                  className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-lg text-[9px] font-black border-2 border-blue-100 transition-all shadow-sm disabled:opacity-50"
                >
                  {isProcessing === `${item.id}-${ItemType.DELIVERY}` ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} strokeWidth={3} />} ENTREGA
                </button>
              )}
              {item.type === ItemType.DELIVERY && (
                <button 
                  disabled={!!isProcessing}
                  onClick={(e) => { e.stopPropagation(); handleAddChild(item.id, ItemType.TASK); }} 
                  className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-lg text-[9px] font-black border-2 border-emerald-100 transition-all shadow-sm disabled:opacity-50"
                >
                  {isProcessing === `${item.id}-${ItemType.TASK}` ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} strokeWidth={3} />} TAREFA
                </button>
              )}
            </div>
          </td>

          <td className="px-4 py-3 text-center">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.priority === 'P1' ? 'bg-red-100 text-red-700' : item.priority === 'P2' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
              {item.priority}
            </span>
          </td>
          
          <td className="px-4 py-3">
             <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-500 border-2 border-white shadow-sm shrink-0">
                 {assignee?.name ? assignee.name[0] : '?'}
               </div>
               <span className="text-[11px] font-black text-slate-700 truncate">{assignee?.name || 'Sem dono'}</span>
             </div>
          </td>

          <td className="px-4 py-3">
             <div className="flex items-center gap-1.5">
               <BarChart2 size={12} className="text-emerald-500" />
               <span className="text-[10px] font-black text-slate-500 truncate">{item.kpi || '-'}</span>
             </div>
          </td>

          <td className="px-4 py-3 text-xs text-gray-600 font-bold">{totalEffort} pts</td>
          <td className="px-4 py-3 w-32">
            <div className="flex flex-col gap-1.5">
              <span className="text-[9px] font-black text-slate-400">{Math.round(progress)}%</span>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </td>
          <td className="px-4 py-3 text-xs text-gray-500 truncate font-medium">{sprint?.name || '-'}</td>
          <td className="px-4 py-3">
            <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${item.status === ItemStatus.CLOSED ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
              {item.status}
            </span>
          </td>
          <td className="px-4 py-3">
             <button onClick={(e) => { e.stopPropagation(); if(isArmed) deleteWorkItem(item.id); else setArmDeleteId(item.id); }} className={`p-2 rounded-lg transition-all ${isArmed ? 'bg-red-600 text-white' : 'text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100'}`}>
               <Trash2 size={16} />
             </button>
          </td>
        </tr>
        {isHierarchical && isExpanded && children.map(child => renderItem(child, depth + 1))}
      </React.Fragment>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="px-6 py-6 border-b flex items-center justify-between bg-white sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-8">
          <div>
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Backlog</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Gestão de Itens</p>
          </div>
          <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
            <button onClick={() => setIsHierarchical(true)} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase ${isHierarchical ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>Hierarquia</button>
            <button onClick={() => setIsHierarchical(false)} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase ${!isHierarchical ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>Lista</button>
          </div>
        </div>
        <button 
          disabled={!!isProcessing}
          onClick={handleAddTopLevel} 
          className="flex items-center gap-2 px-6 py-3.5 bg-orange-600 text-white rounded-2xl text-xs font-black shadow-xl hover:bg-orange-700 transition-all active:scale-95 disabled:opacity-50"
        >
          {isProcessing === 'top-level' ? <Loader2 size={18} className="animate-spin" /> : <Layers size={18} strokeWidth={3} />} NOVA FRENTE
        </button>
      </div>
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left border-collapse table-fixed">
          <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest sticky top-0 z-10 border-b">
            <tr>
              <th className="px-4 py-5 w-24">ID</th>
              <th className="px-4 py-5 w-[25%]">Título</th>
              <th className="px-4 py-5 w-48">Ações</th>
              <th className="px-4 py-5 w-24 text-center">Prio</th>
              <th className="px-4 py-5 w-44">Responsável</th>
              <th className="px-4 py-5 w-36">KPI</th>
              <th className="px-4 py-5 w-24">Esforço</th>
              <th className="px-4 py-5 w-32">Progresso</th>
              <th className="px-4 py-5 w-36">Sprint</th>
              <th className="px-4 py-5 w-32">Status</th>
              <th className="px-4 py-5 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {(isHierarchical ? sortedAndFilteredItems.filter(i => !i.parentId) : sortedAndFilteredItems).map(item => renderItem(item))}
          </tbody>
        </table>
        {workItems.length === 0 && !isProcessing && (
          <div className="p-20 text-center flex flex-col items-center justify-center gap-4">
             <Layers size={48} className="text-slate-200" />
             <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Nenhum item no backlog. Comece criando uma Frente de Trabalho.</p>
          </div>
        )}
      </div>
      {selectedItemId && <ItemPanel item={workItems.find(i => i.id === selectedItemId)!} onClose={() => setSelectedItemId(null)} />}
    </div>
  );
};

export default BacklogView;
