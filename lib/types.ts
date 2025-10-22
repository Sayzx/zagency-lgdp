export type UserRole = "owner" | "admin" | "member" | "viewer"

export type Priority = "low" | "medium" | "high" | "urgent"

export type User = {
  id: string
  name?: string
  username?: string
  email?: string
  firstName?: string
  lastName?: string
  avatar?: string
  role?: UserRole
}

export type Label = {
  id: string
  name: string
  color: string
}

export type Comment = {
  id: string
  content: string
  userId: string
  user?: User
  createdAt: Date
  updatedAt: Date
}

export type Card = {
  id: string
  title: string
  description?: string
  listId: string
  position: number
  priority?: Priority
  dueDate?: Date
  assignedTo: User[]
  labels: string[]
  comments: Comment[]
  attachments?: Attachment[]
  createdAt: Date
  updatedAt: Date
  createdBy: string
}

export type List = {
  id: string
  title: string
  boardId: string
  position: number
  cards: Card[]
}

export type Board = {
  id: string
  title: string
  description?: string
  projectId: string
  lists: List[]
  createdAt: Date
  updatedAt: Date
}

export type ProjectMedia = {
  id: string
  name: string
  url: string
  type: string
  size: number
  uploadedAt: Date
}

export type Attachment = {
  id: string
  name: string
  url: string
  size: number
  type: string
  uploadedAt: Date
}

export type Project = {
  id: string
  title: string
  description?: string
  specifications?: string
  media?: ProjectMedia[]
  boards: Board[]
  members: User[]
  labels: Label[]
  createdAt: Date
  updatedAt: Date
}

export type Activity = {
  id: string
  type: "CARD_CREATED" | "CARD_MOVED" | "CARD_UPDATED" | "COMMENT_ADDED" | "MEMBER_ADDED"
  userId: string
  cardId?: string
  listId?: string
  boardId?: string
  description: string
  createdAt: Date
}
