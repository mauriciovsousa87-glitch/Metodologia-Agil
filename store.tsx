
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { 
  WorkItem, Sprint, User, 
  ItemType, ItemPriority, ItemStatus, BoardColumn 
} from './types';
import { supabase, isSupabaseConfigured } from './supabase';

interface AgileContextType {
  sprints: Sprint[];
  workItems: WorkItem[];
  users: User[];
  loading: boolean;
  configured: boolean;
  
  selectedSprint: Sprint | null;
  setSprint: (id: string) => void;
  
  addWorkItem: (item: Partial<WorkItem>) => Promise<void>;
  updateWorkItem: (id: string, updates: Partial<WorkItem>) => Promise<void>;
  deleteWorkItem: (id: string) => Promise<void>;
  
  addSprint: (sprint: Partial<Sprint>) => Promise<void>;
  updateSprint: (id: string, updates: Partial<Sprint>) => Promise<void>;
  deleteSprint: (id: string) => Promise<void>;

  addUser: (name: string, avatarFile?: File) => Promise<void>;
  removeUser: (id: string) => Promise<void>;
  
  uploadAttachment: (itemId: string, file: File) => Promise<void>;
  seedData: () => Promise<void>;
  refreshData: () => Promise<void>;
  syncTasksWithSprints: () => Promise<void>;
}

const AgileContext = createContext<AgileContextType | undefined>(undefined);

export const AgileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    try {
      const [uRes, sRes, wRes] = await Promise.all([
        supabase.from('profiles').select('*').order('name'),
        supabase.from('sprints').select('*').order('created_at'),
        supabase.from('work_items').select('*').order('created_at', { ascending: true })
      ]);

      if (uRes.data) setUsers(uRes.data.map((u: any) => ({ id: u.id, name: u.name, avatar_url: u.avatar_url })));
      
      if (sRes.data) {
        const mappedSprints = sRes.data.map(s => ({
          id: s.id,
          name: s.name,
          startDate: s.start_date,
          endDate: s.end_date,
          objective: s.objective,
          status: s.status
        }));
        setSprints(mappedSprints);
        
        if (selectedSprintId && !mappedSprints.find(s => s.id === selectedSprintId)) {
          setSelectedSprintId(mappedSprints.length > 0 ? mappedSprints[mappedSprints.length - 1].id : null);
        }
      }

      if (wRes.data) {
        const mappedItems = wRes.data.map(item => ({
          id: item.id,
          type: item.type as ItemType,
          title: item.title,
          description: item.description || '',
          priority: item.priority as ItemPriority || ItemPriority.P3,
          effort: item.effort || 0,
          kpi: item.kpi || '', 
          kpiImpact: item.kpi_impact || '', 
          assigneeId: item.assignee_id,
          status: item.status as ItemStatus || ItemStatus.NEW,
          column: item.column_name as BoardColumn || BoardColumn.NEW,
          parentId: item.parent_id,
          sprintId: item.sprint_id, // CORREÇÃO: Mapeando sprint_id para sprintId consistentemente
          workstreamId: item.workstream_id,
          blocked: item.blocked || false,
          blockReason: item.block_reason || '',
          startDate: item.start_date,
          endDate: item.end_date,
          attachments: item.attachments || []
        }));
        setWorkItems(mappedItems);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedSprintId]);

  useEffect(() => {
    if (!supabase) return;
    const channel = supabase.channel('db-changes').on('postgres_changes', { event: '*', schema: 'public' }, () => {
      fetchData();
    }).subscribe();
    fetchData();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  // Função de normalização robusta: remove qualquer caractere não numérico para comparar YYYYMMDD
  const normalizeDate = (d: string | undefined) => {
    if (!d) return 0;
    const clean = d.split('T')[0].replace(/[^0-9]/g, '');
    return parseInt(clean, 10);
  };

  const findSprintForDate = (dateStr: string | undefined): string | null => {
    if (!dateStr || sprints.length === 0) return null;
    
    const target = normalizeDate(dateStr);
    
    const matched = sprints.find(s => {
      const start = normalizeDate(s.startDate);
      const end = normalizeDate(s.endDate);
      return target >= start && target <= end;
    });
    
    return matched ? matched.id : null;
  };

  const syncTasksWithSprints = async () => {
    if (!supabase) return;
    
    console.log("Iniciando Sincronização...");
    // Filtramos apenas itens que possuem data de fim. Não filtramos por tipo para garantir que nada escape.
    const itemsWithDates = workItems.filter(i => i.endDate);
    let updatedCount = 0;

    for (const item of itemsWithDates) {
      const targetSprintId = findSprintForDate(item.endDate);
      
      // Comparamos o ID atual com o alvo. Se for diferente, atualizamos no banco.
      if (targetSprintId !== item.sprintId) {
        console.log(`Movendo ${item.id} (${item.title}) -> Sprint: ${targetSprintId || 'Backlog'}`);
        const { error } = await supabase
          .from('work_items')
          .update({ sprint_id: targetSprintId })
          .eq('id', item.id);
        
        if (!error) updatedCount++;
        else console.error(`Erro ao mover ${item.id}:`, error);
      }
    }

    console.log(`Sincronização concluída: ${updatedCount} itens atualizados.`);
    await fetchData(); 
  };

  const addWorkItem = async (item: Partial<WorkItem>) => {
    if (!supabase) return;
    const id = `A-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    let autoSprintId = item.sprintId || null;
    
    // Se for uma tarefa com data, tenta achar a sprint automaticamente
    if (item.endDate) {
      autoSprintId = findSprintForDate(item.endDate);
    }
    
    const payload = {
      id,
      type: item.type || ItemType.DELIVERY,
      title: item.title || 'Novo Item',
      effort: item.effort || 0,
      kpi: item.kpi || '',
      kpi_impact: item.kpiImpact || '',
      column_name: item.column || BoardColumn.NEW,
      status: item.status || ItemStatus.NEW,
      parent_id: item.parentId || null,
      sprint_id: autoSprintId,
      workstream_id: item.workstreamId || null,
      start_date: item.startDate || null,
      end_date: item.endDate || null,
      assignee_id: item.assigneeId || null
    };
    
    await supabase.from('work_items').insert([payload]);
    fetchData();
  };

  const updateWorkItem = async (id: string, updates: Partial<WorkItem>) => {
    if (!supabase) return;
    const currentItem = workItems.find(i => i.id === id);
    
    // Lógica de auto-sprint no update
    const finalEndDate = updates.endDate !== undefined ? updates.endDate : currentItem?.endDate;
    if (finalEndDate) {
      const autoSprintId = findSprintForDate(finalEndDate);
      // Só sobrescrevemos o sprintId se encontrarmos uma sprint válida ou se a data foi explicitamente alterada
      if (autoSprintId !== undefined) updates.sprintId = autoSprintId || undefined;
    }

    const pg: any = {};
    if (updates.title !== undefined) pg.title = updates.title;
    if (updates.description !== undefined) pg.description = updates.description;
    if (updates.priority !== undefined) pg.priority = updates.priority;
    if (updates.effort !== undefined) pg.effort = updates.effort;
    if (updates.status !== undefined) pg.status = updates.status;
    if (updates.blocked !== undefined) pg.blocked = updates.blocked;
    if (updates.kpi !== undefined) pg.kpi = updates.kpi;
    if (updates.kpiImpact !== undefined) pg.kpi_impact = updates.kpiImpact;
    if (updates.assigneeId !== undefined) pg.assignee_id = updates.assigneeId || null;
    if (updates.startDate !== undefined) pg.start_date = updates.startDate || null;
    if (updates.endDate !== undefined) pg.end_date = updates.endDate || null;
    if (updates.parentId !== undefined) pg.parent_id = updates.parentId || null;
    if (updates.sprintId !== undefined) pg.sprint_id = updates.sprintId || null;
    if (updates.workstreamId !== undefined) pg.workstream_id = updates.workstreamId || null;
    if (updates.column !== undefined) pg.column_name = updates.column;
    if (updates.blockReason !== undefined) pg.block_reason = updates.blockReason || null;
    if (updates.attachments !== undefined) pg.attachments = updates.attachments;

    await supabase.from('work_items').update(pg).eq('id', id);
    fetchData();
  };

  const addSprint = async (s: Partial<Sprint>) => {
    if (!supabase) return;
    const { data, error } = await supabase.from('sprints').insert([{
      name: s.name, 
      start_date: s.startDate, 
      end_date: s.endDate, 
      objective: s.objective, 
      status: s.status || 'Planejada'
    }]).select();
    if (!error && data && data.length > 0) setSelectedSprintId(data[0].id);
    fetchData();
  };

  const updateSprint = async (id: string, updates: Partial<Sprint>) => {
    if (!supabase) return;
    const pg: any = { 
      name: updates.name, 
      start_date: updates.startDate, 
      end_date: updates.endDate, 
      objective: updates.objective, 
      status: updates.status 
    };
    await supabase.from('sprints').update(pg).eq('id', id);
    fetchData();
  };

  const deleteWorkItem = async (id: string) => {
    if (!supabase) return;
    await supabase.from('work_items').delete().eq('id', id);
    fetchData();
  };

  const deleteSprint = async (id: string) => {
    if (!supabase || !id) return;
    await supabase.from('work_items').update({ sprint_id: null }).eq('sprint_id', id);
    await supabase.from('sprints').delete().eq('id', id);
    if (selectedSprintId === id) setSelectedSprintId(null);
    await fetchData();
  };

  const addUser = async (name: string, file?: File) => {
    if (!supabase) return;
    let avatar_url = null;
    if (file) {
      const path = `avatars/${Date.now()}-${file.name}`;
      const { data } = await supabase.storage.from('avatars').upload(path, file);
      if (data) avatar_url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
    }
    await supabase.from('profiles').insert([{ name, avatar_url }]);
    fetchData();
  };

  const removeUser = async (id: string) => {
    if (!supabase) return;
    await supabase.from('profiles').delete().eq('id', id);
    fetchData();
  };

  const uploadAttachment = async (itemId: string, file: File) => {
    if (!supabase) return;
    const path = `attachments/${itemId}/${Date.now()}-${file.name}`;
    const { data } = await supabase.storage.from('attachments').upload(path, file);
    if (data) {
      const url = supabase.storage.from('attachments').getPublicUrl(path).data.publicUrl;
      const item = workItems.find(i => i.id === itemId);
      const attachments = [...(item?.attachments || []), { id: path, name: file.name, type: file.type, url }];
      await updateWorkItem(itemId, { attachments } as any);
    }
  };

  const seedData = async () => { fetchData(); };

  const selectedSprint = sprints.find(s => s.id === selectedSprintId) || (sprints.length > 0 ? sprints[sprints.length - 1] : null);

  return (
    <AgileContext.Provider value={{
      sprints, workItems, users, loading, configured: isSupabaseConfigured,
      selectedSprint, setSprint: setSelectedSprintId,
      addWorkItem, updateWorkItem, deleteWorkItem, addSprint, updateSprint, deleteSprint,
      addUser, removeUser, uploadAttachment, seedData, refreshData: fetchData, syncTasksWithSprints
    }}>
      {children}
    </AgileContext.Provider>
  );
};

export const useAgile = () => {
  const context = useContext(AgileContext);
  if (!context) throw new Error('AgileProvider missing');
  return context;
};
