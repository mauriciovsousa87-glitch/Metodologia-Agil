
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  ChevronRight, ChevronDown, Filter, 
  Plus, PlusCircle, Target, Layers, Trash2, AlertTriangle, BarChart2, ArrowUpDown, Loader2, ChevronUp, Zap, GripVertical
} from 'lucide-react';
import { useAgile } from '../../store';
import { WorkItem, ItemType, ItemStatus } from '../../types';
import ItemPanel from './ItemPanel';

type SortKey = 'priority' | 'assigneeId' | 'kpi' | 'kpiImpact' | 'effort' | 'status' | 'id' | 'title' | 'sprintId';

const BacklogView: React.FC = () => {
  const { workItems, users, sprints, addWorkItem, deleteWorkItem } = useAgile();
  const [isHierarchical, setIsHierarchical] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);
  const [armDeleteId, setArmDeleteId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Estado para larguras das colunas otimizado
  const [colWidths, setColWidths] = useState(() => {
    const saved = localStorage.getItem('agile_backlog_widths');
    return saved ? JSON.parse(saved) : {
      id: 65,
      title: 350,
      actions: 140,
      prio: 60,
      resp: 150,
      kpi: 110,
      impact: 220,
      effort: 75,
      progress: 90,
      sprint: 120,
      status: 85,
      del: 45
    };
  });

  useEffect(() => {
    localStorage.setItem('agile_backlog_widths', JSON.stringify(colWidths));
  }, [colWidths]);

  const resizingRef = useRef<{ key: keyof typeof colWidths, startX: number, startWidth: number } | null>(null);

  const onMouseDown = (key: keyof typeof colWidths, e: React.MouseEvent) => {
    resizingRef.current = { key, startX: e.pageX, startWidth: colWidths[key] };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!resizingRef.current) return;
    const { key, startX, startWidth } = resizingRef.current;
    const delta = e.pageX - startX;
    setColWidths(prev => ({
      ...prev,
      [key]: Math.max(40, startWidth + delta)
    }));
  };

  const onMouseUp = () => {
    resizingRef.current = null;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
  };

  const toggleExpand = (id: string) => {
    const next = new Set(expandedItems);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedItems(next);
  };

  const handleSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const sortedAndFilteredItems = useMemo(() => {
    let items = [...workItems];
    if (filterText) items = items.filter(i => i.title.toLowerCase().includes(filterText.toLowerCase()));
    if (sortConfig) {
      items.sort((a, b) => {
        let valA: any = a[sortConfig.key] || '';
        let valB: any = b[sortConfig.key] || '';
        if (sortConfig.key === 'assigneeId') {
          valA = users.find(u => u.id === a.assigneeId)?.name || '';
          valB = users.find(u => u.id === b.assigneeId)?.name || '';
        }
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return items;
  }, [workItems, filterText, sortConfig, users]);

  const handleAddChild = async (parentId: string, type: ItemType) => {
    if (isProcessing) return;
    setIsProcessing(`${parentId}-${type}`);
    const parent = workItems.find(i => i.id === parentId);
    try {
      await addWorkItem({ 
        title: `Novo(a) ${type}`, 
        type, 
        parentId,
        workstreamId: parent?.type === ItemType.WORKSTREAM ? parent.id : parent?.workstreamId,
        assigneeId: parent?.assigneeId
      });
      if (!expandedItems.has(parentId)) toggleExpand(parentId);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(null);
    }
  };

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

  const getItemSigla = (type: ItemType) => {
    switch (type) {
      case ItemType.WORKSTREAM: return 'FT';
      case ItemType.INITIATIVE: return 'IN';
      case ItemType.DELIVERY: return 'EN';
      case ItemType.TASK: return 'TR';
      case ItemType.BUG: return 'BG';
      default: return 'IT';
    }
  };

  const renderItem = (item: WorkItem, depth: number = 0) => {
    const children = sortedAndFilteredItems.filter(i => i.parentId === item.id);
    const isExpanded = expandedItems.has(item.id);
    const { totalEffort, progress } = calculateRollup(item);
    const assignee = users.find(u => u.id === item.assigneeId);
    const sprint = sprints.find(s => s.id === item.sprintId);
    const isArmed = armDeleteId === item.id;
    const sigla = getItemSigla(item.type);

    return (
      <React.Fragment key={item.id}>
        <tr className={`border-b border-gray-100 hover:bg-blue-50/50 cursor-pointer transition-all group ${selectedItemId === item.id ? 'bg-blue-50' : ''}`} onClick={() => setSelectedItemId(item.id)}>
          <td className="px-3 py-2 text-[9px] text-gray-400 font-mono" style={{ width: colWidths.id }}>{item.id}</td>
          <td className="px-3 py-2" style={{ width: colWidths.title }}>
             <div className="flex items-center gap-1.5 overflow-hidden">
               {isHierarchical && Array.from({ length: depth }).map((_, i) => <div key={i} className="w-3 shrink-0 border-l border-gray-200 h-5" />)}
               {isHierarchical && (children.length > 0 || item.type !== ItemType.TASK) ? (
                 <button onClick={(e) => { e.stopPropagation(); toggleExpand(item.id); }} className="text-gray-400 hover:text-gray-600 shrink-0">
                   {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                 </button>
               ) : (isHierarchical ? <div className="w-4 shrink-0" /> : null)}
               <span className={`px-1 py-0.5 rounded text-[8px] font-black uppercase shrink-0 border w-6 text-center shadow-sm ${
                 item.type === ItemType.WORKSTREAM ? 'bg-orange-500 text-white border-orange-600' :
                 item.type === ItemType.INITIATIVE ? 'bg-purple-500 text-white border-purple-600' :
                 item.type === ItemType.DELIVERY ? 'bg-blue-500 text-white border-blue-600' :
                 item.type === ItemType.BUG ? 'bg-red-500 text-white border-red-600' :
                 'bg-gray-400 text-white border-gray-500'
               }`}>
                 {sigla}
               </span>
               <span className="text-[12px] font-bold text-gray-800 group-hover:text-blue-600 transition-colors truncate">{item.title}</span>
             </div>
          </td>
          
          <td className="px-3 py-2" style={{ width: colWidths.actions }}>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {item.type === ItemType.WORKSTREAM && (
                <button onClick={(e) => { e.stopPropagation(); handleAddChild(item.id, ItemType.INITIATIVE); }} className="px-2 py-0.5 bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white rounded-md text-[8px] font-black border border-purple-200">+ IN</button>
              )}
              {item.type === ItemType.INITIATIVE && (
                <button onClick={(e) => { e.stopPropagation(); handleAddChild(item.id, ItemType.DELIVERY); }} className="px-2 py-0.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-md text-[8px] font-black border border-blue-200">+ EN</button>
              )}
              {item.type === ItemType.DELIVERY && (
                <button onClick={(e) => { e.stopPropagation(); handleAddChild(item.id, ItemType.TASK); }} className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-md text-[8px] font-black border border-emerald-200">+ TR</button>
              )}
            </div>
          </td>

          <td className="px-3 py-2 text-center" style={{ width: colWidths.prio }}>
            <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black ${item.priority === 'P1' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
              {item.priority}
            </span>
          </td>
          
          <td className="px-3 py-2" style={{ width: colWidths.resp }}>
             <div className="flex items-center gap-2 overflow-hidden">
               <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-black text-slate-500 shrink-0 overflow-hidden">
                 {assignee?.avatar_url ? <img src={assignee.avatar_url} className="w-full h-full object-cover" /> : <span>{assignee?.name ? assignee.name[0] : '?'}</span>}
               </div>
               <span className="text-[10px] font-bold text-slate-600 truncate">{assignee?.name || 'Sem dono'}</span>
             </div>
          </td>

          <td className="px-3 py-2" style={{ width: colWidths.kpi }}>
             <div className="flex items-center gap-1.5 overflow-hidden">
               <BarChart2 size={12} className="text-emerald-500 shrink-0" />
               <span className="text-[10px] font-bold text-slate-500 truncate">{item.kpi || '-'}</span>
             </div>
          </td>

          <td className="px-3 py-2" style={{ width: colWidths.impact }}>
             <div className="flex items-center gap-1.5 overflow-hidden">
               <Zap size={12} className="text-orange-500 shrink-0" />
               <span className="text-[10px] font-bold text-slate-500 truncate">{item.kpiImpact || '-'}</span>
             </div>
          </td>

          <td className="px-3 py-2 text-[10px] text-gray-600 font-bold" style={{ width: colWidths.effort }}>{totalEffort}</td>
          <td className="px-3 py-2" style={{ width: colWidths.progress }}>
            <div className="flex flex-col gap-1">
              <span className="text-[8px] font-black text-slate-400">{Math.round(progress)}%</span>
              <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </td>
          <td className="px-3 py-2 text-[10px] text-gray-500 truncate font-medium" style={{ width: colWidths.sprint }}>{sprint?.name || '-'}</td>
          <td className="px-3 py-2" style={{ width: colWidths.status }}>
            <span className={`px-1 py-0.5 rounded text-[8px] font-black border ${item.status === ItemStatus.CLOSED ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
              {item.status}
            </span>
          </td>
          <td className="px-3 py-2 text-right" style={{ width: colWidths.del }}>
             <button onClick={(e) => { e.stopPropagation(); if(isArmed) deleteWorkItem(item.id); else setArmDeleteId(item.id); }} className={`p-1 rounded-md ${isArmed ? 'bg-red-600 text-white' : 'text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100'}`}>
               <Trash2 size={14} />
             </button>
          </td>
        </tr>
        {isHierarchical && isExpanded && children.map(child => renderItem(child, depth + 1))}
      </React.Fragment>
    );
  };

  const SortHeader = ({ label, sortKey, colKey }: { label: string, sortKey: SortKey, colKey: keyof typeof colWidths }) => (
    <th className="px-3 py-2 font-black uppercase tracking-widest sticky top-0 z-10 border-b bg-slate-50 relative group" style={{ width: colWidths[colKey] }}>
      <div className="flex items-center gap-1 cursor-pointer hover:text-blue-600" onClick={() => handleSort(sortKey)}>
        {label}
        {sortConfig?.key === sortKey && <div className="text-[8px]">{sortConfig.direction === 'desc' ? '▼' : '▲'}</div>}
      </div>
      <div onMouseDown={(e) => onMouseDown(colKey, e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 z-20" />
    </th>
  );

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      <div className="px-6 py-4 border-b flex items-center justify-between shrink-0 bg-white z-40">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Backlog</h1>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Gestão do Fluxo</p>
          </div>
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            <button onClick={() => setIsHierarchical(true)} className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase ${isHierarchical ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Hierarquia</button>
            <button onClick={() => setIsHierarchical(false)} className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase ${!isHierarchical ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Lista</button>
          </div>
          <input 
            type="text" placeholder="FILTRAR..." 
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest focus:border-blue-500 outline-none w-48"
            value={filterText} onChange={(e) => setFilterText(e.target.value)}
          />
        </div>
        <button onClick={() => addWorkItem({ title: 'Nova Frente de Trabalho', type: ItemType.WORKSTREAM })} className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white rounded-xl text-[11px] font-black shadow-lg hover:bg-orange-700 transition-all">
          <Layers size={16} /> NOVA FRENTE (FT)
        </button>
      </div>
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left border-separate border-spacing-0" style={{ tableLayout: 'fixed', minWidth: 'max-content' }}>
          <thead className="bg-slate-50 text-[9px] font-black text-slate-400">
            <tr>
              <SortHeader label="ID" sortKey="id" colKey="id" />
              <SortHeader label="Título" sortKey="title" colKey="title" />
              <th className="px-3 py-2 sticky top-0 z-10 border-b bg-slate-50 uppercase tracking-widest relative" style={{ width: colWidths.actions }}>
                Ações <div onMouseDown={(e) => onMouseDown('actions', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 z-20" />
              </th>
              <SortHeader label="Prio" sortKey="priority" colKey="prio" />
              <SortHeader label="Dono" sortKey="assigneeId" colKey="resp" />
              <SortHeader label="KPI" sortKey="kpi" colKey="kpi" />
              <SortHeader label="Impacto" sortKey="kpiImpact" colKey="impact" />
              <SortHeader label="Pts" sortKey="effort" colKey="effort" />
              <th className="px-3 py-2 sticky top-0 z-10 border-b bg-slate-50 uppercase relative" style={{ width: colWidths.progress }}>Progresso <div onMouseDown={(e) => onMouseDown('progress', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 z-20" /></th>
              <SortHeader label="Sprint" sortKey="sprintId" colKey="sprint" />
              <SortHeader label="Status" sortKey="status" colKey="status" />
              <th className="px-3 py-2 sticky top-0 z-10 border-b bg-slate-50" style={{ width: colWidths.del }}></th>
            </tr>
          </thead>
          <tbody>
            {(isHierarchical ? sortedAndFilteredItems.filter(i => !i.parentId) : sortedAndFilteredItems).map(item => renderItem(item))}
          </tbody>
        </table>
      </div>
      {selectedItemId && <ItemPanel item={workItems.find(i => i.id === selectedItemId)!} onClose={() => setSelectedItemId(null)} />}
    </div>
  );
};

export default BacklogView;
