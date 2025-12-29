
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
  ACTIVE = 'Ativo',
  RESOLVED = 'Resolvido',
  CLOSED = 'Fechado'
}

export enum BoardColumn {
  NEW = 'Novo',
  TODO = 'To Do',
  DOING = 'Doing',
  DONE = 'Done'
}

export interface User {
  id: string;
  name: string;
  avatar?: string;
  avatar_url?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'Ativo' | 'Arquivado';
}

export interface Team {
  id: string;
  name: string;
  members: User[];
  capacityPerDay: number;
}

export interface Sprint {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  objective: string;
  status: 'Planejada' | 'Ativa' | 'Encerrada';
}

export interface Workstream {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  color: string;
  dependencies: string[];
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
}

export type ViewType = 'Backlog' | 'Sprints' | 'Dashboard' | 'Gantt' | 'Settings';
