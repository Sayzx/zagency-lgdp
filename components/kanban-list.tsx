"use client"

import { useState } from "react"
import { useStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { KanbanCard } from "./kanban-card"
import { Plus, MoreHorizontal, Trash2, Edit2, Loader2 } from "lucide-react"
import type { List } from "@/lib/types"
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "sonner"

type KanbanListProps = {
  list: List
}

export function KanbanList({ list }: KanbanListProps) {
  const { createCard, updateList, deleteList, currentUser, searchQuery, filterPriority, filterAssignee, filterLabel } =
    useStore()
  const [isAddingCard, setIsAddingCard] = useState(false)
  const [newCardTitle, setNewCardTitle] = useState("")
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState(list.title)
  const [isCreatingCard, setIsCreatingCard] = useState(false)

  const { setNodeRef } = useDroppable({
    id: list.id,
    data: {
      type: "list",
      list,
    },
  })

  const handleAddCard = async () => {
    if (!newCardTitle.trim()) return

    setIsCreatingCard(true)
    try {
      await createCard({
        title: newCardTitle,
        listId: list.id,
        position: list.cards.length,
        assignedTo: [],
        labels: [],
        createdBy: currentUser.id,
      })
      setNewCardTitle("")
      setIsAddingCard(false)
      toast.success("Card created")
    } catch (error) {
      console.error(error)
      toast.error("Failed to create card")
    } finally {
      setIsCreatingCard(false)
    }
  }

  const handleUpdateTitle = () => {
    if (editedTitle.trim() && editedTitle !== list.title) {
      updateList(list.id, { title: editedTitle })
    }
    setIsEditingTitle(false)
  }

  const handleDeleteList = () => {
    if (confirm(`Are you sure you want to delete "${list.title}"?`)) {
      deleteList(list.id)
    }
  }

  const filteredCards = list.cards.filter((card) => {
    // Search filter - search in title and description
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesTitle = card.title.toLowerCase().includes(query)
      const matchesDescription = card.description?.toLowerCase().includes(query)
      if (!matchesTitle && !matchesDescription) {
        return false
      }
    }
    // Priority filter
    if (filterPriority && card.priority !== filterPriority) {
      return false
    }
    // Assignee filter
    if (filterAssignee && !card.assignedTo.includes(filterAssignee)) {
      return false
    }
    // Label filter
    if (filterLabel && !card.labels.includes(filterLabel)) {
      return false
    }
    return true
  })

  const cardIds = filteredCards.map((c) => c.id)
  const hasActiveFilters = searchQuery || filterPriority || filterAssignee || filterLabel

  return (
    <div ref={setNodeRef} className="flex w-80 flex-shrink-0 flex-col rounded-lg bg-zinc-900 p-3">
      {/* List Header */}
      <div className="mb-3 flex items-center justify-between">
        {isEditingTitle ? (
          <Input
            autoFocus
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleUpdateTitle()
              if (e.key === "Escape") {
                setEditedTitle(list.title)
                setIsEditingTitle(false)
              }
            }}
            onBlur={handleUpdateTitle}
            className="h-8 bg-zinc-800 border-zinc-700 text-white"
          />
        ) : (
          <>
            <h3 className="font-semibold text-white">
              {list.title}
              <span className="ml-2 text-sm text-zinc-500">
                {filteredCards.length}
                {hasActiveFilters && list.cards.length !== filteredCards.length && ` / ${list.cards.length}`}
              </span>
            </h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                <DropdownMenuItem
                  onClick={() => setIsEditingTitle(true)}
                  className="text-zinc-200 focus:bg-zinc-800 focus:text-white"
                >
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit Title
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDeleteList}
                  className="text-red-400 focus:bg-zinc-800 focus:text-red-300"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete List
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>

      {/* Cards */}
      <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
          {filteredCards.length === 0 && hasActiveFilters ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-zinc-500">No cards match filters</p>
            </div>
          ) : (
            filteredCards.map((card) => <KanbanCard key={card.id} card={card} />)
          )}
        </div>
      </SortableContext>

      {/* Add Card */}
      <div className="mt-2">
        {isAddingCard ? (
          <div>
            <Input
              autoFocus
              placeholder="Enter card title..."
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddCard()
                if (e.key === "Escape") {
                  setIsAddingCard(false)
                  setNewCardTitle("")
                }
              }}
              className="mb-2 bg-zinc-800 border-zinc-700 text-white"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAddCard}
                disabled={isCreatingCard}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                {isCreatingCard ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Add Card"
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsAddingCard(false)
                  setNewCardTitle("")
                }}
                disabled={isCreatingCard}
                className="text-zinc-400 hover:text-white"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAddingCard(true)}
            className="w-full justify-start text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add a card
          </Button>
        )}
      </div>
    </div>
  )
}
