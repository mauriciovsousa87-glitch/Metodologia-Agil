
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  ChevronRight, ChevronDown, Filter, 
  Layers, Trash2, BarChart2, Zap, GripVertical,
  MessageCircle
} from 'lucide-react';
import { useAgile } from '../../store';
import { WorkItem, ItemType, ItemStatus } from '../../types';
import ItemPanel from './ItemPanel';

type SortKey = 'priority' | 'assigneeId' | 'kpi' | 'kpiImpact' | 'effort' | 'status' | 'id' | 'title' | 'sprintId';

const BacklogView: React.FC = () => {
  const { workItems, users, sprints, addWorkItem, deleteWorkItem, updateWorkItem } = useAgile();
  const [isHierarchical, setIsHierarchical] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);
  const [armDeleteId, setArmDeleteId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const [colWidths, setColWidths] = useState(() => {
    const saved = localStorage.getItem('agile_backlog_widths_v7');
    return saved ? JSON.parse(saved) : {
      id: 55,
      title: 550, 
      actions: 95,
      prio: 50,
      resp: 130,
      kpi: 100,
      impact: 220,
      progress: 80,
      sprint: 120,
      status: 100,
      del: 40
    };
  });

  useEffect(() => {
    localStorage.setItem('agile_backlog_widths_v7', JSON.stringify(colWidths));
  }, [colWidths]);

  const resizingRef = useRef<{ key: keyof typeof colWidths, startX: number, startWidth: number } | null>(null);

  const onMouseDownResize = (key: keyof typeof colWidths, e: React.MouseEvent) => {
    resizingRef.current = { key, startX: e.pageX, startWidth: colWidths[key] };
    document.addEventListener('mousemove', onMouseMoveResize);
    document.addEventListener('mouseup', onMouseUpResize);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const onMouseMoveResize = (e: MouseEvent) => {
    if (!resizingRef.current) return;
    const { key, startX, startWidth } = resizingRef.current;
    const delta = e.pageX - startX;
    setColWidths(prev => ({ ...prev, [key]: Math.max(30, startWidth + delta) }));
  };

  const onMouseUpResize = () => {
    resizingRef.current = null;
    document.removeEventListener('mousemove', onMouseMoveResize);
    document.removeEventListener('mouseup', onMouseUpResize);
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
  };

  const toggleExpand = (id: string) => {
    const next = new Set(expandedItems);
    if (next.has(id)) next.delete(id); else next.add(id);
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
    
    if (!sortConfig) {
      items.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
    } else {
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

  const handleShareWhatsApp = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthName = now.toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase();

    const taskTypes = [ItemType.TASK, ItemType.BUG];
    const monthlyTasks = workItems.filter(item => {
      if (!item.endDate || !taskTypes.includes(item.type)) return false;
      const date = new Date(item.endDate + 'T12:00:00');
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    if (monthlyTasks.length === 0) {
      alert("Nenhuma tarefa ou bug planejado para este mês.");
      return;
    }

    let message = `📅 *PLANEJAMENTO MENSAL - ${monthName} ${currentYear}*\n\n`;

    const formatShortDate = (dateStr: string) => {
      const d = new Date(dateStr + 'T12:00:00');
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    };

    // Estrutura hierárquica rigorosa
    const hierarchy: Record<string, Record<string, WorkItem[]>> = {};

    monthlyTasks.forEach(task => {
      // 1. Localizar a Entrega (Pai direto)
      const delivery = workItems.find(p => p.id === task.parentId);
      if (!delivery) return; // FILTRO ANTI-LIXO: Se não tem entrega, ignora

      // 2. Localizar a Iniciativa (Pai da entrega)
      const initiative = workItems.find(p => p.id === delivery.parentId);
      if (!initiative) return; // FILTRO ANTI-LIXO: Se não tem iniciativa, ignora

      const initTitle = initiative.title.toUpperCase();
      const deliveryTitle = delivery.title;

      if (!hierarchy[initTitle]) hierarchy[initTitle] = {};
      if (!hierarchy[initTitle][deliveryTitle]) hierarchy[initTitle][deliveryTitle] = [];
      
      hierarchy[initTitle][deliveryTitle].push(task);
    });

    // Construção da mensagem apenas com dados válidos
    const iniciativasSorted = Object.keys(hierarchy).sort();

    iniciativasSorted.forEach(initName => {
      const entregas = hierarchy[initName];
      
      Object.entries(entregas).forEach(([deliveryName, tasks]) => {
        // Parte 1: Nome da Iniciativa (Negrito)
        message += `*${initName}*\n`;
        // Parte 2: Nome da Entrega (Negrito)
        message += `*${deliveryName}*\n`;
        
        // Parte 3: Lista de tarefas (Normal)
        tasks.forEach(task => {
          const assignee = users.find(u => u.id === task.assigneeId)?.name || 'Sem dono';
          const deliveryDate = task.endDate ? formatShortDate(task.endDate) : 'S/D';
          message += `${task.title}: @${assignee} | Data: ${deliveryDate}\n`;
        });
        message += `\n`; // Espaço entre os blocos
      });
    });

    message += `_Gerado via Agile Master_ 🚀`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  const handleAddChild = async (parentId: string, type: ItemType) => {
    if (isProcessing) return;
    setIsProcessing(`${parentId}-${type}`);
    const parent = workItems.find(i => i.id === parentId);
    try {
      await addWorkItem({ 
        title: `Novo(a) ${type}`, type, parentId,
        workstreamId: parent?.type === ItemType.WORKSTREAM ? parent.id : parent?.workstreamId,
        assigneeId: parent?.assigneeId,
        status: ItemStatus.NEW
      });
      if (!expandedItems.has(parentId)) toggleExpand(parentId);
    } finally { setIsProcessing(null); }
  };

  const calculateRollup = (item: WorkItem) => {
    if (item.type === ItemType.TASK || item.type === ItemType.BUG) {
      return { progress: item.status === ItemStatus.CLOSED ? 100 : 0 };
    }
    const getAllTRDescendants = (id: string): WorkItem[] => {
      let results: WorkItem[] = [];
      const children = workItems.filter(i => i.parentId === id);
      children.forEach(child => {
        if (child.type === ItemType.TASK || child.type === ItemType.BUG) results.push(child);
        else results = [...results, ...getAllTRDescendants(child.id)];
      });
      return results;
    };
    const TRs = getAllTRDescendants(item.id);
    if (TRs.length === 0) return { progress: item.status === ItemStatus.CLOSED ? 100 : 0 };
    const totalEffort = TRs.reduce((acc, curr) => acc + (curr.effort || 0), 0);
    const completedEffort = TRs.filter(i => i.status === ItemStatus.CLOSED).reduce((acc, curr) => acc + (curr.effort || 0), 0);
    if (totalEffort === 0) return { progress: (TRs.filter(i => i.status === ItemStatus.CLOSED).length / TRs.length) * 100 };
    return { progress: (completedEffort / totalEffort) * 100 };
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

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItemId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (id !== draggedItemId) {
      setDropTargetId(id);
    }
  };

  const handleDragLeave = () => {
    setDropTargetId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    setDropTargetId(null);
    setDraggedItemId(null);

    if (!draggedId || draggedId === targetId) return;

    const draggedItem = workItems.find(i => i.id === draggedId);
    const targetItem = workItems.find(i => i.id === targetId);

    if (!draggedItem || !targetItem) return;

    const updates: any = {};

    if (draggedItem.type === targetItem.type) {
      const targetTime = new Date(targetItem.createdAt || Date.now()).getTime();
      updates.createdAt = new Date(targetTime - 1000).toISOString();
      if (draggedItem.parentId !== targetItem.parentId) {
        updates.parentId = targetItem.parentId || null;
        updates.workstreamId = targetItem.workstreamId || (targetItem.type === ItemType.WORKSTREAM ? targetItem.id : null);
      }
    } else {
      const isCompatible = 
        (draggedItem.type === ItemType.INITIATIVE && targetItem.type === ItemType.WORKSTREAM) ||
        (draggedItem.type === ItemType.DELIVERY && targetItem.type === ItemType.INITIATIVE) ||
        ((draggedItem.type === ItemType.TASK || draggedItem.type === ItemType.BUG) && targetItem.type === ItemType.DELIVERY);

      if (isCompatible) {
        updates.parentId = targetItem.id;
        updates.workstreamId = targetItem.type === ItemType.WORKSTREAM ? targetItem.id : targetItem.workstreamId;
        updates.createdAt = new Date().toISOString();
      } else {
        return;
      }
    }

    if (Object.keys(updates).length > 0) {
      await updateWorkItem(draggedId, updates);
    }
  };

  const renderItem = (item: WorkItem, depth: number = 0) => {
    const children = sortedAndFilteredItems.filter(i => i.parentId === item.id);
    const isExpanded = expandedItems.has(item.id);
    const { progress } = calculateRollup(item);
    const assignee = users.find(u => u.id === item.assigneeId);
    const sprint = sprints.find(s => s.id === item.sprintId);
    const sigla = getItemSigla(item.type);
    
    const isTarget = dropTargetId === item.id;
    const isDragged = draggedItemId === item.id;

    return (
      <React.Fragment key={item.id}>
        <tr 
          draggable
          onDragStart={(e) => handleDragStart(e, item.id)}
          onDragOver={(e) => handleDragOver(e, item.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, item.id)}
          onDragEnd={() => { setDraggedItemId(null); setDropTargetId(null); }}
          className={`
            border-b border-gray-100 hover:bg-blue-50/50 cursor-pointer transition-all group 
            ${selectedItemId === item.id ? 'bg-blue-50' : ''}
            ${isTarget ? 'border-t-4 border-t-blue-500 bg-blue-100/30' : ''}
            ${isDragged ? 'opacity-20 grayscale' : ''}
          `} 
          onClick={() => setSelectedItemId(item.id)}
        >
          <td className="px-1 py-2 text-center" style={{ width: 24 }}>
            <div className="cursor-grab active:cursor-grabbing p-1">
               <GripVertical size={14} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </td>
          <td className="px-2 py-2 text-[9px] text-gray-400 font-mono" style={{ width: colWidths.id }}>{item.id}</td>
          <td className="px-2 py-2" style={{ width: colWidths.title }}>
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
               <span className="text-[11px] font-bold text-gray-800 group-hover:text-blue-600 truncate">{item.title}</span>
             </div>
          </td>
          <td className="px-2 py-2" style={{ width: colWidths.actions }}>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {item.type === ItemType.WORKSTREAM && <button onClick={(e) => { e.stopPropagation(); handleAddChild(item.id, ItemType.INITIATIVE); }} className="px-1.5 py-0.5 bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white rounded text-[8px] font-black border border-purple-200">+IN</button>}
              {item.type === ItemType.INITIATIVE && <button onClick={(e) => { e.stopPropagation(); handleAddChild(item.id, ItemType.DELIVERY); }} className="px-1.5 py-0.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded text-[8px] font-black border border-blue-200">+EN</button>}
              {item.type === ItemType.DELIVERY && <button onClick={(e) => { e.stopPropagation(); handleAddChild(item.id, ItemType.TASK); }} className="px-1.5 py-0.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded text-[8px] font-black border border-emerald-200">+TR</button>}
            </div>
          </td>
          <td className="px-2 py-2 text-center" style={{ width: colWidths.prio }}>
            <span className={`px-1 py-0.5 rounded-full text-[8px] font-black ${item.priority === 'P1' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{item.priority}</span>
          </td>
          <td className="px-2 py-2" style={{ width: colWidths.resp }}>
             <div className="flex items-center gap-1.5 overflow-hidden">
               <div className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[7px] font-black text-slate-500 shrink-0">
                 {assignee?.avatar_url ? <img src={assignee.avatar_url} className="w-full h-full object-cover" /> : <span>{assignee?.name ? assignee.name[0] : '?'}</span>}
               </div>
               <span className="text-[10px] font-bold text-slate-600 truncate">{assignee?.name || 'Sem dono'}</span>
             </div>
          </td>
          <td className="px-2 py-2" style={{ width: colWidths.kpi }}>
             <div className="flex items-center gap-1 overflow-hidden">
               <BarChart2 size={10} className="text-emerald-500 shrink-0" />
               <span className="text-[10px] font-bold text-slate-500 truncate">{item.kpi || '-'}</span>
             </div>
          </td>
          <td className="px-2 py-2" style={{ width: colWidths.kpiImpact }}>
             <div className="flex items-center gap-1 overflow-hidden">
               <Zap size={10} className="text-orange-500 shrink-0" />
               <span className="text-[10px] font-bold text-slate-500 truncate">{item.kpiImpact || '-'}</span>
             </div>
          </td>
          <td className="px-2 py-2" style={{ width: colWidths.progress }}>
            <div className="flex flex-col gap-0.5">
              <span className="text-[7px] font-black text-slate-400">{Math.round(progress)}%</span>
              <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                <div className={`h-full transition-all duration-500 ${progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }} />
              </div>
            </div>
          </td>
          <td className="px-2 py-2 text-[10px] text-gray-500 truncate font-medium" style={{ width: colWidths.sprint }}>{sprint?.name || '-'}</td>
          <td className="px-2 py-2 text-center" style={{ width: colWidths.status }}>
            <span className={`px-2 py-0.5 rounded text-[8px] font-black border uppercase tracking-widest ${
              item.status === ItemStatus.CLOSED ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
              item.status === ItemStatus.IN_PROGRESS ? 'bg-amber-100 text-amber-700 border-amber-200' :
              'bg-slate-100 text-slate-500 border-slate-200'
            }`}>{item.status}</span>
          </td>
          <td className="px-2 py-2 text-right" style={{ width: colWidths.del }}>
             <button onClick={(e) => { e.stopPropagation(); if(armDeleteId === item.id) deleteWorkItem(item.id); else setArmDeleteId(item.id); }} className={`p-1 rounded ${armDeleteId === item.id ? 'bg-red-600 text-white' : 'text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100'}`}><Trash2 size={12} /></button>
          </td>
        </tr>
        {isHierarchical && isExpanded && children.map(child => renderItem(child, depth + 1))}
      </React.Fragment>
    );
  };

  const SortHeader = ({ label, sortKey, colKey }: { label: string, sortKey: SortKey, colKey: keyof typeof colWidths }) => (
    <th className="px-2 py-2 font-black uppercase tracking-tighter sticky top-0 z-10 border-b bg-slate-50 relative group" style={{ width: colWidths[colKey] }}>
      <div className="flex items-center gap-1 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => handleSort(sortKey)}>
        {label}
        {sortConfig?.key === sortKey && <div className="text-[8px]">{sortConfig.direction === 'desc' ? '▼' : '▲'}</div>}
      </div>
      <div onMouseDown={(e) => onMouseDownResize(colKey, e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 z-20" />
    </th>
  );

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      <div className="px-6 py-4 border-b flex items-center justify-between shrink-0 bg-white z-40">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Backlog</h1>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Gestão de Itens</p>
          </div>
          <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200">
            <button onClick={() => setIsHierarchical(true)} className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase transition-all ${isHierarchical ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Hierarquia</button>
            <button onClick={() => setIsHierarchical(false)} className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase transition-all ${!isHierarchical ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Lista</button>
          </div>
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
            <input type="text" placeholder="BUSCAR ITEM..." className="bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-[10px] font-black uppercase focus:border-blue-500 focus:bg-white outline-none w-48" value={filterText} onChange={(e) => setFilterText(e.target.value)} />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleShareWhatsApp}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black shadow-lg hover:bg-emerald-700 transition-all active:scale-95 uppercase tracking-tight"
          >
            <MessageCircle size={16} /> Enviar Mensal
          </button>
          
          <button onClick={() => addWorkItem({ title: 'Nova Frente de Trabalho', type: ItemType.WORKSTREAM })} className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white rounded-xl text-[11px] font-black shadow-lg hover:bg-orange-700 transition-all active:scale-95 uppercase tracking-tighter"><Layers size={16} /> NOVA FT</button>
        </div>
      </div>
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left border-separate border-spacing-0" style={{ tableLayout: 'fixed', minWidth: 'max-content' }}>
          <thead className="bg-slate-50 text-[9px] font-black text-slate-400 select-none">
            <tr>
              <th className="px-1 py-2 sticky top-0 z-10 border-b bg-slate-50" style={{ width: 24 }}></th>
              <SortHeader label="ID" sortKey="id" colKey="id" />
              <SortHeader label="Título" sortKey="title" colKey="title" />
              <th className="px-2 py-2 sticky top-0 z-10 border-b bg-slate-50 uppercase relative" style={{ width: colWidths.actions }}>Ações <div onMouseDown={(e) => onMouseDownResize('actions', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 z-20" /></th>
              <SortHeader label="Prio" sortKey="priority" colKey="prio" />
              <SortHeader label="Responsável" sortKey="assigneeId" colKey="resp" />
              <SortHeader label="KPI" sortKey="kpi" colKey="kpi" />
              <SortHeader label="Impacto" sortKey="kpiImpact" colKey="impact" />
              <th className="px-2 py-2 sticky top-0 z-10 border-b bg-slate-50 uppercase relative" style={{ width: colWidths.progress }}>Progresso <div onMouseDown={(e) => onMouseDownResize('progress', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 z-20" /></th>
              <SortHeader label="Sprint" sortKey="sprintId" colKey="sprint" />
              <SortHeader label="Status" sortKey="status" colKey="status" />
              <th className="px-2 py-2 sticky top-0 z-10 border-b bg-slate-50" style={{ width: colWidths.del }}></th>
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
