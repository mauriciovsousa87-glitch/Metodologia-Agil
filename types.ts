
export enum ItemType {
  WORKSTREAM = 'Frente de Trabalho',
  INITIATIVE = 'Iniciativa',
  DELIVERY = 'Entrega',
  TASK = 'Tarefa',
  BUG = 'Bug'
}

export enum ItemPriority {
  P1 = 'P1',
  P2 = 'P2',
  P3 = 'P3',
  P4 = 'P4'
}

export enum ItemStatus {
  NEW = 'Novo',
  IN_PROGRESS = 'Em andamento',
  CLOSED = 'Concluído'
}

export enum BoardColumn {
  NEW = 'Novo',
  TODO = 'A Fazer',
  DOING = 'Em Execução',
  DONE = 'Concluído'
}

export interface User {
  id: string;
  name: string;
  avatar?: string;
  avatar_url?: string;
  position?: string;
  reportsTo?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'Ativo' | 'Arquivado';
}

export interface Sprint {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  objective: string;
  status: 'Planejada' | 'Ativa' | 'Encerrada';
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  url: string;
}

export interface WorkItem {
  id: string;
  type: ItemType;
  title: string;
  description: string;
  tags: string[];
  priority: ItemPriority;
  effort: number;
  kpi?: string;
  kpiImpact?: string;
  assigneeId: string;
  creatorId: string;
  status: ItemStatus;
  column: BoardColumn;
  createdAt: string;
  updatedAt: string;
  startDate?: string;
  endDate?: string;
  parentId?: string;
  sprintId?: string;
  workstreamId?: string;
  blocked?: boolean;
  blockReason?: string;
  attachments?: Attachment[];
  costItem?: string;
  costType?: string;
  requestNum?: string;
  orderNum?: string;
  billingStatus?: string;
  costValue?: number;
  billedValue?: number;
}

// Interfaces para Ata de Reunião
export interface MeetingParticipant {
  userId: string;
  role: string;
  present: boolean;
}

export interface MeetingAgendaItem {
  id: string;
  topic: string;
  priority: 'Alta' | 'Média' | 'Baixa';
  discussion: string;
  problemIdentified?: string;
  rootCause?: string;
}

export interface MeetingDecision {
  id: string;
  text: string;
  impact: string;
  status: 'Planejado' | 'Em andamento' | 'Concluído';
}

export interface Action5W2H {
  id: string;
  what: string;
  why: string;
  who: string;
  when: string;
  where: string;
  how: string;
  cost: number;
  completed: boolean;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  type: 'Daily' | 'Weekly' | 'Kaizen' | 'Estratégica' | 'Outro';
  location: string;
  facilitatorId: string;
  secretaryId: string;
  participants: MeetingParticipant[];
  agenda: MeetingAgendaItem[];
  decisions: MeetingDecision[];
  actions: Action5W2H[];
  nextMeetingDate?: string;
  nextMeetingObjective?: string;
  aiSummary?: string;
  createdAt: string;
}

export interface StrategyMetric {
  label: string;
  value: string;
  target?: string;
  icon?: string;
}

export interface Strategy {
  id: string;
  year: string;
  vision: string;
  successMetrics: StrategyMetric[];
  focusKPIs: StrategyMetric[];
  engineeringVision: string;
  engineeringKPIs: StrategyMetric[];
}

export type ViewType = 'Backlog' | 'Sprints' | 'Dashboard' | 'Gantt' | 'Strategy' | 'Finance' | 'Timeline' | 'Meetings' | 'Settings';
