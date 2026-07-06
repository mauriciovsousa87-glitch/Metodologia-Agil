
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { 
  WorkItem, Sprint, User, Meeting, Strategy,
  ItemType, ItemPriority, ItemStatus, BoardColumn 
} from './types';
import { supabase, isSupabaseConfigured } from './supabase';

interface AgileContextType {
  sprints: Sprint[];
  workItems: WorkItem[];
  users: User[];
  meetings: Meeting[];
  strategy: Strategy | null;
  loading: boolean;
  error: string | null;
  configured: boolean;
  
  selectedSprint: Sprint | null;
  setSprint: (id: string) => void;
  
  addWorkItem: (item: Partial<WorkItem>) => Promise<void>;
  updateWorkItem: (id: string, updates: Partial<WorkItem>) => Promise<void>;
  deleteWorkItem: (id: string) => Promise<void>;
  
  addSprint: (sprint: Partial<Sprint>) => Promise<void>;
  updateSprint: (id: string, updates: Partial<Sprint>) => Promise<void>;
  deleteSprint: (id: string) => Promise<void>;

  addUser: (name: string, position?: string, reportsTo?: string, avatarFile?: File) => Promise<void>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  removeUser: (id: string) => Promise<void>;

  addMeeting: (meeting: Partial<Meeting>) => Promise<string | null>;
  updateMeeting: (id: string, updates: Partial<Meeting>) => Promise<void>;
  deleteMeeting: (id: string) => Promise<void>;

  updateStrategy: (updates: Partial<Strategy>) => Promise<void>;
  
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
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const results = await Promise.allSettled([
        supabase.from('profiles').select('*').order('name'),
        supabase.from('sprints').select('*').order('start_date', { ascending: true }),
        supabase.from('work_items').select('*').order('created_at', { ascending: true }),
        supabase.from('meetings').select('*').order('date', { ascending: false }),
        supabase.from('strategy').select('*').limit(1).single()
      ]);

      // Perfis
      if (results[0].status === 'fulfilled' && results[0].value.data) {
        setUsers(results[0].value.data.map((u: any) => ({ 
          id: String(u.id), 
          name: u.name, 
          avatar_url: u.avatar_url,
          position: u.position || '',
          reportsTo: u.reports_to ? String(u.reports_to) : ''
        })));
      }

      // Sprints
      if (results[1].status === 'fulfilled' && results[1].value.data) {
        const mappedSprints = results[1].value.data.map(s => ({
          id: String(s.id), 
          name: s.name,
          startDate: s.start_date,
          endDate: s.end_date,
          objective: s.objective,
          status: s.status
        }));
        setSprints(mappedSprints);
        if (!selectedSprintId && mappedSprints.length > 0) {
          const active = mappedSprints.find(s => s.status === 'Ativa') || mappedSprints[0];
          setSelectedSprintId(active.id);
        }
      }

      // Work Items
      if (results[2].status === 'fulfilled' && results[2].value.data) {
        setWorkItems(results[2].value.data.map(item => ({
          id: String(item.id),
          type: item.type as ItemType,
          title: item.title,
          description: item.description || '',
          priority: (item.priority || ItemPriority.P3) as ItemPriority,
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
          costValue: item.cost_value || 0,
          billedValue: item.billed_value || 0,
        })));
      }

      // Meetings (Com mapeamento de campos)
      if (results[3].status === 'fulfilled' && results[3].value.data) {
        setMeetings(results[3].value.data.map((m: any) => ({
          id: m.id,
          title: m.title,
          date: m.date,
          startTime: m.start_time,
          endTime: m.end_time,
          type: m.type,
          location: m.location,
          facilitatorId: m.facilitator_id,
          secretaryId: m.secretary_id,
          participants: m.participants || [],
          agenda: m.agenda || [],
          decisions: m.decisions || [],
          actions: m.actions || [],
          nextMeetingDate: m.next_meeting_date,
          nextMeetingObjective: m.next_meeting_objective,
          aiSummary: m.ai_summary,
          createdAt: m.created_at
        })));
      } else if (results[3].status === 'rejected') {
        console.warn("Tabela 'meetings' não encontrada ou inacessível.");
      }

      // Strategy
      if (results[4].status === 'fulfilled' && results[4].value.data) {
        const s = results[4].value.data;
        setStrategy({
          id: String(s.id),
          year: s.year,
          vision: s.vision,
          successMetrics: s.success_metrics || [],
          focusKPIs: s.focus_kpis || [],
          engineeringVision: s.engineering_vision,
          engineeringKPIs: s.engineering_kpis || []
        });
      } else {
        // Mock default strategy if not found
        setStrategy({
          id: 'default',
          year: '2026',
          vision: 'SER A MELHOR CERVEJARIA DA CIA',
          successMetrics: [
            { label: 'BEP', value: '> 450 PTS' },
            { label: 'Leadership Ranking', value: 'TOP 3' },
            { label: 'Volume', value: '> 1 MIO HL' }
          ],
          focusKPIs: [
            { label: 'TRI + cTRI', value: '0' },
            { label: 'BQI', value: '> 92' },
            { label: 'TPE', value: '< 60' },
            { label: 'ÁGUA', value: '< 2,30' },
            { label: 'OSE', value: '> 70' }
          ],
          engineeringVision: 'SER A MELHOR ENGENHARIA E ITF DA CIA',
          engineeringKPIs: [
            { label: 'TPE', value: '< 60', icon: 'Zap' },
            { label: 'SURPLUS', value: '> 0,80', icon: 'TrendingUp' },
            { label: 'INDISP', value: '< 0,15', icon: 'Gauge' },
            { label: 'OBZ + VIC', value: '= 0', icon: 'Trophy' },
            { label: 'ÁGUA', value: '< 2,30', icon: 'Droplets' }
          ]
        });
      }

    } catch (error: any) {
      console.error("Erro ao buscar dados:", error);
      setError(error.message || "Erro desconhecido ao conectar com Supabase");
    } finally {
      setLoading(false);
    }
  }, [selectedSprintId]);

  useEffect(() => {
    if (!supabase) return;
    const channel = supabase.channel('realtime-agile').on('postgres_changes', { event: '*', schema: 'public' }, () => {
      fetchData();
    }).subscribe();
    fetchData();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const setSprint = (id: string) => {
    setSelectedSprintId(String(id));
    localStorage.setItem('agile_active_sprint_id', String(id));
  };

  const addWorkItem = async (item: Partial<WorkItem>) => {
    if (!supabase) return;
    const id = `A-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    await supabase.from('work_items').insert([{
      id,
      type: item.type || ItemType.DELIVERY,
      title: item.title || 'Novo Item',
      effort: item.effort || 0,
      column_name: item.column || BoardColumn.TODO, 
      status: item.status || ItemStatus.NEW,
      parent_id: item.parentId || null,
      sprint_id: item.sprintId ? String(item.sprintId) : null,
      workstream_id: item.workstreamId || null,
      start_date: item.startDate || null,
      end_date: item.endDate || null,
      // Fix: changed item.assignee_id to item.assigneeId to match the WorkItem interface
      assignee_id: item.assigneeId || null
    }]);
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
    if (updates.column !== undefined) pg.column_name = updates.column;
    if (updates.assigneeId !== undefined) pg.assignee_id = updates.assigneeId || null;
    if (updates.startDate !== undefined) pg.start_date = updates.startDate || null;
    if (updates.endDate !== undefined) pg.end_date = updates.endDate || null;
    if (updates.sprintId !== undefined) pg.sprint_id = updates.sprintId ? String(updates.sprintId) : null;
    if (updates.parentId !== undefined) pg.parent_id = updates.parentId || null;
    if (updates.workstreamId !== undefined) pg.workstream_id = updates.workstream_id || null;
    if (updates.blocked !== undefined) pg.blocked = updates.blocked;
    if (updates.kpi !== undefined) pg.kpi = updates.kpi;
    if (updates.kpiImpact !== undefined) pg.kpi_impact = updates.kpiImpact;
    if (updates.costItem !== undefined) pg.cost_item = updates.costItem;
    if (updates.costType !== undefined) pg.cost_type = updates.costType;
    if (updates.requestNum !== undefined) pg.request_num = updates.requestNum;
    if (updates.orderNum !== undefined) pg.order_num = updates.orderNum;
    if (updates.billingStatus !== undefined) pg.billing_status = updates.billingStatus;
    if (updates.costValue !== undefined) pg.cost_value = updates.costValue;
    if (updates.billedValue !== undefined) pg.billed_value = updates.billedValue;

    await supabase.from('work_items').update(pg).eq('id', id);
    await fetchData(); 
  };

  const addSprint = async (s: Partial<Sprint>) => {
    if (!supabase) return;
    const { data } = await supabase.from('sprints').insert([{
      name: s.name, 
      start_date: s.startDate, 
      end_date: s.endDate, 
      objective: s.objective, 
      status: s.status || 'Planejada'
    }]).select();
    if (data && data.length > 0) setSprint(String(data[0].id));
    await fetchData();
  };

  const updateSprint = async (id: string, updates: Partial<Sprint>) => {
    if (!supabase) return;
    await supabase.from('sprints').update({ 
      name: updates.name, 
      start_date: updates.startDate, 
      end_date: updates.endDate, 
      objective: updates.objective, 
      status: updates.status 
    }).eq('id', id);
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
    if (selectedSprintId === id) setSelectedSprintId(null);
    await fetchData();
  };

  const addUser = async (name: string, position?: string, reportsTo?: string, file?: File) => {
    if (!supabase) return;
    try {
      let avatar_url = null;
      if (file) {
        const path = `avatars/${Date.now()}-${file.name}`;
        const { data, error: uploadError } = await supabase.storage.from('avatars').upload(path, file);
        if (uploadError) {
          console.error("Erro ao subir avatar para o Supabase Storage:", uploadError);
        } else if (data) {
          avatar_url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
        }
      }
      const { error: insertError } = await supabase.from('profiles').insert([{ 
        name, 
        position: position || null, 
        reports_to: reportsTo || null, 
        avatar_url 
      }]);
      if (insertError) {
        console.error("Erro ao inserir novo perfil no Supabase:", insertError);
        alert(`Erro ao cadastrar membro no banco de dados: ${insertError.message}`);
      }
      await fetchData();
    } catch (err: any) {
      console.error("Erro inesperado em addUser:", err);
    }
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    if (!supabase) return;
    await supabase.from('profiles').update({
      name: updates.name,
      position: updates.position,
      reports_to: updates.reportsTo || null
    }).eq('id', id);
    await fetchData();
  };

  const removeUser = async (id: string) => {
    if (!supabase) return;
    await supabase.from('profiles').update({ reports_to: null }).eq('reports_to', id);
    await supabase.from('profiles').delete().eq('id', id);
    await fetchData();
  };

  const addMeeting = async (meeting: Partial<Meeting>): Promise<string | null> => {
    if (!supabase) return null;
    
    // Mapeamento para o banco de dados (snake_case)
    const payload = {
      title: meeting.title,
      date: meeting.date,
      start_time: meeting.startTime,
      end_time: meeting.endTime,
      type: meeting.type,
      location: meeting.location,
      facilitator_id: meeting.facilitatorId,
      secretary_id: meeting.secretaryId,
      participants: meeting.participants || [],
      agenda: meeting.agenda || [],
      decisions: meeting.decisions || [],
      actions: meeting.actions || [],
      next_meeting_date: meeting.nextMeetingDate,
      next_meeting_objective: meeting.nextMeetingObjective,
      ai_summary: meeting.aiSummary
    };

    const { data, error } = await supabase.from('meetings').insert([payload]).select();
    if (error) { 
      console.error("Erro ao inserir reunião:", error); 
      return null; 
    }
    await fetchData();
    return data && data.length > 0 ? String(data[0].id) : null;
  };

  const updateMeeting = async (id: string, updates: Partial<Meeting>) => {
    if (!supabase) return;
    
    const pg: any = {};
    if (updates.title !== undefined) pg.title = updates.title;
    if (updates.date !== undefined) pg.date = updates.date;
    if (updates.startTime !== undefined) pg.start_time = updates.startTime;
    if (updates.endTime !== undefined) pg.end_time = updates.endTime;
    if (updates.type !== undefined) pg.type = updates.type;
    if (updates.location !== undefined) pg.location = updates.location;
    if (updates.facilitatorId !== undefined) pg.facilitator_id = updates.facilitatorId;
    if (updates.secretaryId !== undefined) pg.secretary_id = updates.secretaryId;
    if (updates.participants !== undefined) pg.participants = updates.participants;
    if (updates.agenda !== undefined) pg.agenda = updates.agenda;
    if (updates.decisions !== undefined) pg.decisions = updates.decisions;
    if (updates.actions !== undefined) pg.actions = updates.actions;
    if (updates.nextMeetingDate !== undefined) pg.next_meeting_date = updates.nextMeetingDate;
    if (updates.nextMeetingObjective !== undefined) pg.next_meeting_objective = updates.nextMeetingObjective;
    if (updates.aiSummary !== undefined) pg.ai_summary = updates.aiSummary;

    await supabase.from('meetings').update(pg).eq('id', id);
    await fetchData();
  };

  const updateStrategy = async (updates: Partial<Strategy>) => {
    if (!supabase || !strategy) return;
    
    const pg: any = {};
    if (updates.year !== undefined) pg.year = updates.year;
    if (updates.vision !== undefined) pg.vision = updates.vision;
    if (updates.successMetrics !== undefined) pg.success_metrics = updates.successMetrics;
    if (updates.focusKPIs !== undefined) pg.focus_kpis = updates.focusKPIs;
    if (updates.engineeringVision !== undefined) pg.engineering_vision = updates.engineeringVision;
    if (updates.engineeringKPIs !== undefined) pg.engineering_kpis = updates.engineeringKPIs;

    // Try to update, if it fails because it's the mock 'default', we can't save unless we insert
    if (strategy.id === 'default') {
      await supabase.from('strategy').insert([pg]);
    } else {
      await supabase.from('strategy').update(pg).eq('id', strategy.id);
    }
    await fetchData();
  };

  const deleteMeeting = async (id: string) => {
    if (!supabase) return;
    await supabase.from('meetings').delete().eq('id', id);
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

  const syncTasksWithSprints = async () => { await fetchData(); };
  const seedData = async () => { await fetchData(); };

  return (
    <AgileContext.Provider value={{
      sprints, workItems, users, meetings, strategy, loading, error, configured: isSupabaseConfigured,
      selectedSprint: sprints.find(s => String(s.id) === String(selectedSprintId)) || null, setSprint,
      addWorkItem, updateWorkItem, deleteWorkItem, addSprint, updateSprint, deleteSprint,
      addUser, updateUser, removeUser, addMeeting, updateMeeting, deleteMeeting,
      updateStrategy,
      uploadAttachment, seedData, refreshData: fetchData, syncTasksWithSprints
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
