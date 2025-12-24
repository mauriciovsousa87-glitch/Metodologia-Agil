
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
  deleteSprint: (id: string) => Promise<void>;

  addUser: (name: string, avatarFile?: File) => Promise<void>;
  removeUser: (id: string) => Promise<void>;
  
  uploadAttachment: (itemId: string, file: File) => Promise<void>;
  seedData: () => Promise<void>;
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
        supabase.from('work_items').select('*').order('created_at')
      ]);

      if (uRes.data) setUsers(uRes.data.map((u: any) => ({ id: u.id, name: u.name, avatar_url: u.avatar_url })));
      if (sRes.data) {
        setSprints(sRes.data);
        if (sRes.data.length > 0 && !selectedSprintId) {
          setSelectedSprintId(sRes.data[sRes.data.length - 1].id);
        }
      }
      if (wRes.data) {
        setWorkItems(wRes.data.map(item => ({
          ...item,
          assigneeId: item.assignee_id,
          startDate: item.start_date,
          endDate: item.end_date,
          parentId: item.parent_id,
          sprintId: item.sprint_id,
          workstreamId: item.workstream_id,
          blockReason: item.block_reason,
          column: item.column_name,
          attachments: item.attachments || []
        })));
      }
    } catch (error) {
      console.error("Erro Supabase:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedSprintId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const seedData = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data: userData } = await supabase.from('profiles').insert([{ name: 'Admin Agile' }]).select();
      if (userData && userData[0]) {
        await supabase.from('sprints').insert([{ 
          name: 'Sprint 01', 
          start_date: new Date().toISOString().split('T')[0],
          status: 'Ativa'
        }]);
      }
      await fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const selectedSprint = sprints.find(s => s.id === selectedSprintId) || (sprints.length > 0 ? sprints[sprints.length - 1] : null);

  const addWorkItem = async (item: Partial<WorkItem>) => {
    if (!supabase) return;
    const id = `A-${Math.floor(1000 + Math.random() * 9000)}`;
    await supabase.from('work_items').insert([{
      id,
      type: item.type || ItemType.DELIVERY,
      title: item.title || 'Novo Item',
      description: item.description || '',
      priority: item.priority || ItemPriority.P3,
      effort: item.effort || 0,
      assignee_id: item.assigneeId || (users[0]?.id),
      status: item.status || ItemStatus.NEW,
      column_name: item.column || BoardColumn.NEW,
      parent_id: item.parentId,
      sprint_id: item.sprintId,
      workstream_id: item.workstreamId
    }]);
    fetchData();
  };

  const updateWorkItem = async (id: string, updates: Partial<WorkItem>) => {
    if (!supabase) return;
    const pg: any = { ...updates };
    if (updates.assigneeId) pg.assignee_id = updates.assigneeId;
    if (updates.startDate) pg.start_date = updates.startDate;
    if (updates.endDate) pg.end_date = updates.endDate;
    if (updates.parentId) pg.parent_id = updates.parentId;
    if (updates.sprintId) pg.sprint_id = updates.sprintId;
    if (updates.workstreamId) pg.workstream_id = updates.workstreamId;
    if (updates.column) pg.column_name = updates.column;
    
    delete pg.assigneeId; delete pg.startDate; delete pg.endDate;
    delete pg.parentId; delete pg.sprintId; delete pg.workstreamId; delete pg.column;

    await supabase.from('work_items').update(pg).eq('id', id);
    fetchData();
  };

  const deleteWorkItem = async (id: string) => {
    if (!supabase) return;
    await supabase.from('work_items').delete().eq('id', id);
    fetchData();
  };

  const addSprint = async (s: Partial<Sprint>) => {
    if (!supabase) return;
    await supabase.from('sprints').insert([{
      name: s.name, start_date: s.startDate, end_date: s.endDate, objective: s.objective, status: 'Planejada'
    }]);
    fetchData();
  };

  const deleteSprint = async (id: string) => {
    if (!supabase) return;
    await supabase.from('sprints').delete().eq('id', id);
    fetchData();
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

  return (
    <AgileContext.Provider value={{
      sprints, workItems, users, loading, configured: isSupabaseConfigured,
      selectedSprint, setSprint: setSelectedSprintId,
      addWorkItem, updateWorkItem, deleteWorkItem, addSprint, deleteSprint,
      addUser, removeUser, uploadAttachment, seedData
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
