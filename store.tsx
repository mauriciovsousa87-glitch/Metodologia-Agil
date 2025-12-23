
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
}

const AgileContext = createContext<AgileContextType | undefined>(undefined);

export const AgileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [uRes, sRes, wRes] = await Promise.all([
        supabase.from('profiles').select('*').order('name'),
        supabase.from('sprints').select('*').order('created_at'),
        supabase.from('work_items').select('*').order('created_at')
      ]);

      if (uRes.data) {
        setUsers(uRes.data.map((u: any) => ({
          id: u.id,
          name: u.name,
          avatar_url: u.avatar_url
        })));
      }
      
      if (sRes.data) {
        setSprints(sRes.data);
        if (sRes.data.length > 0 && !selectedSprintId) {
          setSelectedSprintId(sRes.data[sRes.data.length - 1].id);
        }
      }

      if (wRes.data) {
        const mapped = wRes.data.map(item => ({
          ...item,
          assigneeId: item.assignee_id,
          startDate: item.start_date,
          endDate: item.end_date,
          parentId: item.parent_id,
          sprintId: item.sprint_id,
          workstreamId: item.workstream_id,
          blockReason: item.block_reason,
          column: item.column_name
        }));
        setWorkItems(mapped);
      }
    } catch (error) {
      console.error("Erro ao carregar dados do Supabase:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedSprintId]);

  useEffect(() => { 
    fetchData(); 
  }, [fetchData]);

  const selectedSprint = sprints.find(s => s.id === selectedSprintId) || (sprints.length > 0 ? sprints[sprints.length - 1] : null);

  const addWorkItem = async (item: Partial<WorkItem>) => {
    if (!supabase) return;
    const id = `A-${Math.floor(1000 + Math.random() * 9000)}`;
    const { error } = await supabase.from('work_items').insert([{
      id,
      type: item.type || ItemType.DELIVERY,
      title: item.title || 'Novo Item',
      description: item.description || '',
      priority: item.priority || ItemPriority.P3,
      effort: item.effort || 0,
      kpi: item.kpi || '',
      assignee_id: item.assigneeId || (users[0]?.id),
      status: item.status || ItemStatus.NEW,
      column_name: item.column || BoardColumn.NEW,
      parent_id: item.parentId,
      sprint_id: item.sprintId,
      workstream_id: item.workstreamId
    }]);
    if (!error) fetchData();
  };

  const updateWorkItem = async (id: string, updates: Partial<WorkItem>) => {
    if (!supabase) return;
    const pgUpdates: any = { ...updates };
    if (updates.assigneeId) pgUpdates.assignee_id = updates.assigneeId;
    if (updates.startDate) pgUpdates.start_date = updates.startDate;
    if (updates.endDate) pgUpdates.end_date = updates.endDate;
    if (updates.parentId) pgUpdates.parent_id = updates.parentId;
    if (updates.sprintId) pgUpdates.sprint_id = updates.sprintId;
    if (updates.workstreamId) pgUpdates.workstream_id = updates.workstreamId;
    if (updates.blockReason) pgUpdates.block_reason = updates.blockReason;
    if (updates.column) pgUpdates.column_name = updates.column;
    
    delete pgUpdates.assigneeId;
    delete pgUpdates.startDate;
    delete pgUpdates.endDate;
    delete pgUpdates.parentId;
    delete pgUpdates.sprintId;
    delete pgUpdates.workstreamId;
    delete pgUpdates.blockReason;
    delete pgUpdates.column;

    const { error } = await supabase.from('work_items').update(pgUpdates).eq('id', id);
    if (!error) fetchData();
  };

  const deleteWorkItem = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('work_items').delete().eq('id', id);
    if (!error) fetchData();
  };

  const addSprint = async (sprintData: Partial<Sprint>) => {
    if (!supabase) return;
    const { error } = await supabase.from('sprints').insert([{
      name: sprintData.name,
      start_date: sprintData.startDate,
      end_date: sprintData.endDate,
      objective: sprintData.objective,
      status: 'Planejada'
    }]);
    if (!error) fetchData();
  };

  const deleteSprint = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('sprints').delete().eq('id', id);
    if (!error) fetchData();
  };

  const addUser = async (name: string, avatarFile?: File) => {
    if (!supabase) return;
    let avatarUrl = null;
    if (avatarFile) {
      const fileName = `avatars/${Date.now()}-${avatarFile.name}`;
      const { data } = await supabase.storage.from('avatars').upload(fileName, avatarFile);
      if (data) {
        avatarUrl = supabase.storage.from('avatars').getPublicUrl(fileName).data.publicUrl;
      }
    }
    const { error } = await supabase.from('profiles').insert([{ name, avatar_url: avatarUrl }]);
    if (!error) fetchData();
  };

  const removeUser = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (!error) fetchData();
  };

  const uploadAttachment = async (itemId: string, file: File) => {
    if (!supabase) return;
    const fileName = `attachments/${itemId}/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage.from('attachments').upload(fileName, file);
    if (error) return;

    const publicUrl = supabase.storage.from('attachments').getPublicUrl(fileName).data.publicUrl;
    const item = workItems.find(i => i.id === itemId);
    const attachments = [...(item?.attachments || []), { 
      id: fileName, 
      name: file.name, 
      type: file.type, 
      url: publicUrl 
    }];

    await updateWorkItem(itemId, { attachments } as any);
  };

  return (
    <AgileContext.Provider value={{
      sprints, workItems, users, loading, configured: isSupabaseConfigured,
      selectedSprint,
      setSprint: setSelectedSprintId,
      addWorkItem, updateWorkItem, deleteWorkItem,
      addSprint, deleteSprint,
      addUser, removeUser,
      uploadAttachment
    }}>
      {children}
    </AgileContext.Provider>
  );
};

export const useAgile = () => {
  const context = useContext(AgileContext);
  if (!context) throw new Error('useAgile must be used within an AgileProvider');
  return context;
};
