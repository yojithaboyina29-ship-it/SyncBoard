export type Role = 'OWNER' | 'MEMBER' | 'VIEWER';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: Role;
  joinedAt: string;
  user: User;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
  members?: WorkspaceMember[];
  boards?: Board[];
  role?: Role;
  _count?: {
    members: number;
    boards: number;
  };
}

export interface CardLabel {
  id: string;
  cardId: string;
  name: string;
  color: string;
}

export interface Comment {
  id: string;
  cardId: string;
  authorId: string;
  content: string;
  createdAt: string;
  author: User;
}

export interface Card {
  id: string;
  listId: string;
  title: string;
  description?: string | null;
  position: number;
  priority: Priority;
  dueDate?: string | null;
  assigneeId?: string | null;
  assignee?: User | null;
  labels?: CardLabel[];
  _count?: {
    comments: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface List {
  id: string;
  boardId: string;
  title: string;
  position: number;
  cards: Card[];
  createdAt: string;
  updatedAt: string;
}

export interface Board {
  id: string;
  workspaceId: string;
  title: string;
  description?: string | null;
  color: string;
  createdAt: string;
  updatedAt: string;
  lists?: List[];
  workspace?: Workspace;
  currentUserRole?: Role;
}

export interface PresenceUser {
  socketId: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  joinedAt: number;
}

export interface ActivityItem {
  id: string;
  boardId?: string;
  userId: string;
  user: User;
  action: string;
  entityId?: string;
  entityType?: string;
  details?: string;
  createdAt: string;
}
