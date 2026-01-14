
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

      if (uRes.data) setUsers(uRes.data.map((u: any) => ({ id: String(u.id), name: u.name, avatar_url: u.avatar_url })));
      
      if (sRes.data) {
        const mappedSprints = sRes.data.map(s => ({
          id: String(s.id), 
          name: s.name,
          startDate: s.start_date,
          endDate: s.end_date,
          objective: s.objective,
          status: s.status
        }));
        setSprints(mappedSprints);
        
        if (selectedSprintId && !mappedSprints.find(s => s.id === String(selectedSprintId))) {
          setSelectedSprintId(mappedSprints.length > 0 ? mappedSprints[mappedSprints.length - 1].id : null);
        }
      }

      if (wRes.data) {
        const mappedItems = wRes.data.map(item => {
          return {
            id: String(item.id),
            type: item.type as ItemType,
            title: item.title,
            description: item.description || '',
            priority: item.priority as ItemPriority || ItemPriority.P3,
            effort: item.effort || 0,
            kpi: item.kpi || '', 
            kpiImpact: item.kpi_impact || '', 
            assigneeId: item.assignee_id ? String(item.assignee_id) : undefined,
            status: (item.status || ItemStatus.NEW) as ItemStatus,
            column: (item.column_name || BoardColumn.TODO) as BoardColumn,
            parentId: item.parent_id ? String(item.parent_id) : undefined,
            sprintId: item.sprint_id ? String(item.sprint_id) : undefined,
            workstreamId: item.workstream_id ? String(item.workstream_id) : undefined,
            blocked: item.blocked || false,
            blockReason: item.block_reason || '',
            startDate: item.start_date,
            endDate: item.end_date,
            attachments: item.attachments || [],
            costItem: item.cost_item || '',
            costType: item.cost_type || 'OPEX',
            requestNum: item.request_num || '',
            orderNum: item.order_num || '',
            billingStatus: item.billing_status || 'Em aberto',
            costValue: item.cost_value || 0
          };
        });
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

  const findSprintForDate = (dateStr: string | undefined): string | null => {
    if (!dateStr || sprints.length === 0) return null;
    const itemDate = new Date(dateStr + 'T12:00:00');
    const matched = sprints.find(s => {
      const sStart = new Date(s.startDate + 'T00:00:00');
      const sEnd = new Date(s.endDate + 'T23:59:59');
      return itemDate >= sStart && itemDate <= sEnd;
    });
    return matched ? String(matched.id) : null;
  };

  const syncTasksWithSprints = async () => {
    if (!supabase) return;
    
    // Pegar dados frescos do banco antes de sincronizar para evitar discrepância
    const { data: freshItems } = await supabase.from('work_items').select('*');
    if (!freshItems) return;

    const updatesPromises = freshItems
      .filter(i => i.end_date)
      .map(async (item) => {
        const targetSprintId = findSprintForDate(item.end_date);
        const currentSprintId = item.sprint_id ? String(item.sprint_id) : null;
        
        if (targetSprintId !== currentSprintId) {
          return supabase.from('work_items')
            .update({ sprint_id: targetSprintId })
            .eq('id', item.id);
        }
        return null;
      });

    await Promise.all(updatesPromises);
    await fetchData(); 
  };

  const addWorkItem = async (item: Partial<WorkItem>) => {
    if (!supabase) return;
    const id = `A-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    
    let autoSprintId = item.sprintId || null;
    if (!autoSprintId && item.endDate) {
      autoSprintId = findSprintForDate(item.endDate);
    }
    
    const payload = {
      id,
      type: item.type || ItemType.DELIVERY,
      title: item.title || 'Novo Item',
      effort: item.effort || 0,
      kpi: item.kpi || '',
      kpi_impact: item.kpiImpact || '',
      column_name: item.column || BoardColumn.TODO, 
      status: item.status || ItemStatus.NEW,
      parent_id: item.parentId || null,
      sprint_id: autoSprintId ? String(autoSprintId) : null,
      workstream_id: item.workstreamId || null,
      start_date: item.startDate || null,
      end_date: item.endDate || null,
      assignee_id: item.assigneeId || null
    };
    
    await supabase.from('work_items').insert([payload]);
    await fetchData();
  };

  const updateWorkItem = async (id: string, updates: any) => {
    if (!supabase) return;
    
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
    if (updates.sprintId !== undefined) pg.sprint_id = (updates.sprintId === null || updates.sprintId === "") ? null : String(updates.sprintId);
    if (updates.workstreamId !== undefined) pg.workstream_id = updates.workstreamId || null;
    if (updates.column !== undefined) pg.column_name = updates.column;
    if (updates.blockReason !== undefined) pg.block_reason = updates.blockReason || null;
    if (updates.attachments !== undefined) pg.attachments = updates.attachments;

    if (updates.costItem !== undefined) pg.cost_item = updates.costItem;
    if (updates.costType !== undefined) pg.cost_type = updates.costType;
    if (updates.requestNum !== undefined) pg.request_num = updates.requestNum;
    if (updates.orderNum !== undefined) pg.order_num = updates.orderNum;
    if (updates.billingStatus !== undefined) pg.billing_status = updates.billingStatus;
    if (updates.costValue !== undefined) pg.cost_value = updates.costValue;

    const { error } = await supabase.from('work_items').update(pg).eq('id', id);
    if (!error) await fetchData(); // Forçar refresh para garantir que o Vercel veja a mudança
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
    if (!error && data && data.length > 0) setSelectedSprintId(String(data[0].id));
    await fetchData();
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
    await fetchData();
  };

  const deleteWorkItem = async (id: string) => {
    if (!supabase) return;
    await supabase.from('work_items').delete().eq('id', id);
    await fetchData();
  };

  const deleteSprint = async (id: string) => {
    if (!supabase || !id) return;
    await supabase.from('work_items').update({ sprint_id: null }).eq('sprint_id', id);
    await supabase.from('sprints').delete().eq('id', id);
    if (selectedSprintId === String(id)) setSelectedSprintId(null);
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
    await fetchData();
  };

  const removeUser = async (id: string) => {
    if (!supabase) return;
    await supabase.from('profiles').delete().eq('id', id);
    await fetchData();
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

  const seedData = async () => { await fetchData(); };

  const selectedSprint = sprints.find(s => String(s.id).trim() === String(selectedSprintId).trim());

  return (
    <AgileContext.Provider value={{
      sprints, workItems, users, loading, configured: isSupabaseConfigured,
      selectedSprint: selectedSprint || null, setSprint: setSelectedSprintId,
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
