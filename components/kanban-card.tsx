"use client"

import type React from "react"

import { useState } from "react"
import { useStore } from "@/lib/store"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Calendar, MessageSquare } from "lucide-react"
import type { Card as CardType } from "@/lib/types"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

type KanbanCardProps = {
  card: CardType
  isDragging?: boolean
}

export function KanbanCard({ card, isDragging = false }: KanbanCardProps) {
  const { projects, currentProjectId, setSelectedCard } = useStore()
  const [isHovered, setIsHovered] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: card.id,
    data: {
      type: "card",
      card,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const currentProject = projects.find((p) => p.id === currentProjectId)
  const cardLabels = currentProject?.labels?.filter((l) => card.labels.includes(l.id)) || []
  const assignedUsers = currentProject?.members?.filter((m) => Array.isArray(card.assignedTo) && card.assignedTo.includes(m.id)) || []

  const priorityColors = {
    urgent: "bg-red-500",
    high: "bg-orange-500",
    medium: "bg-yellow-500",
    low: "bg-blue-500",
  }

  const isOverdue = card.dueDate && new Date(card.dueDate) < new Date()

  const handleClick = (e: React.MouseEvent) => {
    // Prevent opening modal when dragging
    if (!isSortableDragging && !isDragging) {
      setSelectedCard(card.id)
    }
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      className={cn(
        "cursor-pointer bg-zinc-800 border-zinc-700 p-3 transition-all hover:bg-zinc-750 hover:border-zinc-600",
        (isSortableDragging || isDragging) && "opacity-50",
        isHovered && "shadow-lg shadow-violet-500/10",
      )}
    >
      {/* Labels */}
      {cardLabels.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {cardLabels.map((label) => (
            <Badge key={label.id} style={{ backgroundColor: label.color }} className="text-xs text-white border-0">
              {label.name}
            </Badge>
          ))}
        </div>
      )}

      {/* Title */}
      <h4 className="mb-2 text-sm font-medium text-white leading-snug">{card.title}</h4>

      {/* Description Preview */}
      {card.description && <p className="mb-2 text-xs text-zinc-400 line-clamp-2">{card.description}</p>}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Priority */}
          {card.priority && (
            <div className="flex items-center gap-1">
              <div className={cn("h-2 w-2 rounded-full", priorityColors[card.priority])} />
            </div>
          )}

          {/* Due Date */}
          {card.dueDate && (
            <div className={cn("flex items-center gap-1 text-xs", isOverdue ? "text-red-400" : "text-zinc-500")}>
              <Calendar className="h-3 w-3" />
              <span>{format(new Date(card.dueDate), "MMM d")}</span>
            </div>
          )}

          {/* Comments */}
          {card.comments?.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-zinc-500">
              <MessageSquare className="h-3 w-3" />
              <span>{card.comments.length}</span>
            </div>
          )}
        </div>

        {/* Assigned Users */}
        {assignedUsers.length > 0 && (
          <div className="flex -space-x-2">
            {assignedUsers.slice(0, 3).map((user) => (
              <Avatar key={user.id} className="h-6 w-6 border-2 border-zinc-800 bg-violet-600">
                <AvatarFallback className="bg-violet-600 text-white text-xs">
                  {(user.name ?? "")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
            ))}
            {assignedUsers.length > 3 && (
              <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-zinc-800 bg-zinc-700 text-xs text-zinc-300">
                +{assignedUsers.length - 3}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
