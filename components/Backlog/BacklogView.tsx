
import React, { useState, useMemo } from 'react';
import { 
  ChevronRight, ChevronDown, Filter, 
  Plus, PlusCircle, Target, CheckSquare, Layers, Trash2, AlertTriangle, X, TrendingUp, BarChart2, ArrowUpDown
} from 'lucide-react';
import { useAgile } from '../../store';
import { WorkItem, ItemType, ItemStatus, ItemPriority } from '../../types';
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

  const toggleExpand = (id: string) => {
    const next = new Set(expandedItems);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedItems(next);
  };

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const getAssignee = (id: string) => users.find(u => u.id === id);

  const sortedAndFilteredItems = useMemo(() => {
    let items = [...workItems];

    if (filterText) {
      items = items.filter(i => i.title.toLowerCase().includes(filterText.toLowerCase()));
    }

    if (sortConfig) {
      items.sort((a, b) => {
        let valA: any = a[sortConfig.key as keyof WorkItem] || '';
        let valB: any = b[sortConfig.key as keyof WorkItem] || '';

        if (sortConfig.key === 'assignee') {
          valA = getAssignee(a.assigneeId)?.name || '';
          valB = getAssignee(b.assigneeId)?.name || '';
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return items;
  }, [workItems, filterText, sortConfig, users]);

  const handleQuickDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (armDeleteId === id) {
      deleteWorkItem(id);
      setArmDeleteId(null);
    } else {
      setArmDeleteId(id);
      setTimeout(() => setArmDeleteId(prev => prev === id ? null : prev), 3000);
    }
  };

  const handleAddChild = (parentId: string, type: ItemType) => {
    const parent = workItems.find(i => i.id === parentId);
    const titleMap = {
      [ItemType.INITIATIVE]: 'Nova Iniciativa',
      [ItemType.DELIVERY]: 'Nova Entrega',
      [ItemType.TASK]: 'Nova Tarefa',
      [ItemType.BUG]: 'Novo Bug',
      [ItemType.WORKSTREAM]: 'Nova Frente'
    };

    addWorkItem({ 
      title: titleMap[type], 
      type: type, 
      parentId: parentId,
      workstreamId: parent?.type === ItemType.WORKSTREAM ? parent.id : parent?.workstreamId
    });

    if (!expandedItems.has(parentId)) {
      toggleExpand(parentId);
    }
  };

  const getChildren = (parentId?: string) => {
    return sortedAndFilteredItems.filter(item => item.parentId === parentId);
  };

  const calculateRollup = (item: WorkItem) => {
    const descendants: WorkItem[] = [];
    const stack = [...workItems.filter(i => i.parentId === item.id)];
    while (stack.length > 0) {
      const current = stack.pop()!;
      descendants.push(current);
      stack.push(...workItems.filter(i => i.parentId === current.id));
    }
    if (descendants.length === 0) return { totalEffort: item.effort, progress: item.status === ItemStatus.CLOSED ? 100 : 0 };
    const totalEffort = descendants.reduce((acc, curr) => acc + curr.effort, 0);
    const completedEffort = descendants.filter(i => i.status === ItemStatus.CLOSED).reduce((acc, curr) => acc + curr.effort, 0);
    let progress = totalEffort > 0 ? (completedEffort / totalEffort) * 100 : (descendants.filter(i => i.status === ItemStatus.CLOSED).length / descendants.length) * 100;
    return { totalEffort, progress };
  };

  const SortButton = ({ k }: { k: SortKey }) => (
    <button onClick={(e) => { e.stopPropagation(); handleSort(k); }} className={`ml-1 p-1 rounded hover:bg-slate-200 transition-colors ${sortConfig?.key === k ? 'text-blue-600' : 'text-slate-300'}`}>
      <ArrowUpDown size={12} />
    </button>
  );

  const renderItem = (item: WorkItem, depth: number = 0) => {
    const children = getChildren(item.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const { totalEffort, progress } = calculateRollup(item);
    const assignee = getAssignee(item.assigneeId);
    const sprint = sprints.find(s => s.id === item.sprintId);
    const isArmed = armDeleteId === item.id;

    return (
      <React.Fragment key={item.id}>
        <tr className={`border-b hover:bg-blue-50/50 cursor-pointer transition-all group ${selectedItemId === item.id ? 'bg-blue-50' : ''}`} onClick={() => setSelectedItemId(item.id)}>
          <td className="px-4 py-3 text-[10px] text-gray-400 font-mono w-20">{item.id}</td>
          <td className="px-4 py-3">
             <div className="flex items-center gap-2">
               {isHierarchical && Array.from({ length: depth }).map((_, i) => <div key={i} className="w-4 shrink-0 border-l border-gray-100 h-6" />)}
               {isHierarchical && hasChildren ? (
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
                <button onClick={(e) => { e.stopPropagation(); handleAddChild(item.id, ItemType.INITIATIVE); }} className="flex items-center gap-1.5 px-3 py-1 bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white rounded-lg text-[9px] font-black border-2 border-purple-100 transition-all shadow-sm">
                  <Plus size={10} strokeWidth={3} /> INICIATIVA
                </button>
              )}
              {item.type === ItemType.INITIATIVE && (
                <button onClick={(e) => { e.stopPropagation(); handleAddChild(item.id, ItemType.DELIVERY); }} className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-lg text-[9px] font-black border-2 border-blue-100 transition-all shadow-sm">
                  <Plus size={10} strokeWidth={3} /> ENTREGA
                </button>
              )}
              {item.type === ItemType.DELIVERY && (
                <button onClick={(e) => { e.stopPropagation(); handleAddChild(item.id, ItemType.TASK); }} className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-lg text-[9px] font-black border-2 border-emerald-100 transition-all shadow-sm">
                  <Plus size={10} strokeWidth={3} /> TAREFA
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
             <div className="flex items-center gap-3 min-w-[140px]">
               {assignee?.avatar_url ? (
                 <img src={assignee.avatar_url} className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm shrink-0" alt={assignee.name} />
               ) : (
                 <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-500 border-2 border-white shadow-sm shrink-0">
                   {assignee?.name ? assignee.name[0] : '?'}
                 </div>
               )}
               <span className="text-[11px] font-black text-slate-700 truncate">{assignee?.name || 'Não atribuído'}</span>
             </div>
          </td>

          <td className="px-4 py-3">
             <div className="flex items-center gap-1.5 min-w-[120px]">
               <BarChart2 size={12} className="text-emerald-500 shrink-0" />
               <span className="text-[10px] font-black text-slate-500 truncate max-w-[100px]" title={item.kpi}>{item.kpi || '-'}</span>
             </div>
          </td>

          <td className="px-4 py-3 text-xs text-gray-600 font-bold">{item.type === ItemType.TASK || item.type === ItemType.BUG ? item.effort : totalEffort} pts</td>
          <td className="px-4 py-3 w-32">
            <div className="flex flex-col gap-1.5">
              <span className={`text-[9px] font-black ${progress === 100 ? 'text-emerald-600' : 'text-slate-400'}`}>{Math.round(progress)}%</span>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden shadow-inner">
                <div className={`h-full transition-all duration-500 rounded-full ${progress === 100 ? 'bg-emerald-500' : progress > 0 ? 'bg-blue-500' : 'bg-slate-300'}`} style={{ width: `${progress}%` }} />
              </div>
            </div>
          </td>
          <td className="px-4 py-3 text-xs text-gray-500 truncate max-w-[100px] font-medium">{sprint?.name || '-'}</td>
          <td className="px-4 py-3">
            <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${item.status === ItemStatus.CLOSED ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : item.status === ItemStatus.ACTIVE ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
              {item.status}
            </span>
          </td>
          <td className="px-4 py-3">
             <button onClick={(e) => handleQuickDelete(e, item.id)} className={`p-2 rounded-lg transition-all flex items-center gap-1 ${isArmed ? 'bg-red-600 text-white animate-pulse' : 'text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100'}`}>
               {isArmed ? <><AlertTriangle size={14} /><span className="text-[9px] font-black uppercase">Excluir?</span></> : <Trash2 size={16} />}
             </button>
          </td>
        </tr>
        {isHierarchical && isExpanded && children.map(child => renderItem(child, depth + 1))}
      </React.Fragment>
    );
  };

  const topLevelItems = isHierarchical ? sortedAndFilteredItems.filter(item => !item.parentId) : sortedAndFilteredItems;
  const selectedItem = workItems.find(i => i.id === selectedItemId);

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="px-6 py-6 border-b flex items-center justify-between bg-white sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-8">
          <div>
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none">Backlog do Produto</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Gestão Ágil Master</p>
          </div>
          <div className="flex items-center bg-slate-100 rounded-xl p-1.5 border border-slate-200 shadow-inner">
            <button onClick={() => setIsHierarchical(true)} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isHierarchical ? 'bg-white shadow-md text-blue-600' : 'text-slate-500'}`}>Hierarquia</button>
            <button onClick={() => setIsHierarchical(false)} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${!isHierarchical ? 'bg-white shadow-md text-blue-600' : 'text-slate-500'}`}>Lista Plana</button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => addWorkItem({ title: 'Nova Frente de Trabalho', type: ItemType.WORKSTREAM })} className="flex items-center gap-2 px-6 py-3.5 bg-orange-600 text-white rounded-2xl text-xs font-black shadow-xl hover:bg-orange-700 transition-all active:scale-95 border-b-4 border-orange-800">
            <Layers size={18} strokeWidth={3} /> NOVA FRENTE
          </button>
          <div className="h-10 w-px bg-slate-200 mx-2"></div>
          <div className="relative group">
             <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
             <input type="text" placeholder="Filtrar por título..." className="pl-11 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold focus:border-blue-500 focus:bg-white w-72 outline-none shadow-inner" value={filterText} onChange={(e) => setFilterText(e.target.value)} />
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left border-collapse table-fixed">
          <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest sticky top-0 z-10 border-b border-slate-200 shadow-sm">
            <tr>
              <th className="px-4 py-5 w-24">ID <SortButton k="id" /></th>
              <th className="px-4 py-5 w-[25%]">Título</th>
              <th className="px-4 py-5 w-48 text-center">Ações</th>
              <th className="px-4 py-5 w-24 text-center">Prio <SortButton k="priority" /></th>
              <th className="px-4 py-5 w-44">Responsável <SortButton k="assignee" /></th>
              <th className="px-4 py-5 w-36 text-emerald-600">KPI Impactado <SortButton k="kpi" /></th>
              <th className="px-4 py-5 w-24">Esforço <SortButton k="effort" /></th>
              <th className="px-4 py-5 w-32">Progresso</th>
              <th className="px-4 py-5 w-36">Sprint</th>
              <th className="px-4 py-5 w-32">Status <SortButton k="status" /></th>
              <th className="px-4 py-5 w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {topLevelItems.length > 0 ? topLevelItems.map(item => renderItem(item)) : (
              <tr><td colSpan={11} className="py-32 text-center bg-gray-50/20"><div className="flex flex-col items-center opacity-30"><PlusCircle size={64} className="text-slate-400 mb-4" /><p className="text-xl font-black uppercase tracking-tight text-slate-800">Nada encontrado</p></div></td></tr>
            )}
          </tbody>
        </table>
      </div>
      {selectedItem && <ItemPanel item={selectedItem} onClose={() => setSelectedItemId(null)} />}
    </div>
  );
};

export default BacklogView;
