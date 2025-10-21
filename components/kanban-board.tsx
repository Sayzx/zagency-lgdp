"use client"

import { useStore } from "@/lib/store"
import { useRealTimeSync } from "@/hooks/use-real-time-sync"
import { KanbanList } from "./kanban-list"
import { Button } from "@/components/ui/button"
import { Plus, Search, Loader2 } from "lucide-react"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable"
import { KanbanCard } from "./kanban-card"
import type { Card } from "@/lib/types"
import { toast } from "sonner"

export function KanbanBoard() {
  const {
    projects,
    currentProjectId,
    currentBoardId,
    createList,
    moveCardAsync,
    searchQuery,
    filterPriority,
    filterAssignee,
    filterLabel,
  } = useStore()

  // Enable real-time synchronization
  useRealTimeSync(true)
  const [isAddingList, setIsAddingList] = useState(false)
  const [newListTitle, setNewListTitle] = useState("")
  const [activeCard, setActiveCard] = useState<Card | null>(null)
  const [isCreatingList, setIsCreatingList] = useState(false)

  const currentProject = projects.find((p) => p.id === currentProjectId)
  const currentBoard = currentProject?.boards.find((b) => b.id === currentBoardId)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  )

  const handleAddList = async () => {
    if (!newListTitle.trim() || !currentBoardId) return

    setIsCreatingList(true)
    try {
      await createList({
        title: newListTitle,
        boardId: currentBoardId,
        position: currentBoard?.lists.length || 0,
      })
      setNewListTitle("")
      setIsAddingList(false)
      toast.success("List created")
    } catch (error) {
      console.error(error)
      toast.error("Failed to create list")
    } finally {
      setIsCreatingList(false)
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const card = currentBoard?.lists.flatMap((list) => list.cards).find((c) => c.id === active.id)
    setActiveCard(card || null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveCard(null)

    if (!over) return

    const activeCardId = active.id as string
    const overData = over.data.current

    try {
      if (overData?.type === "list") {
        // Dropped on a list
        const targetListId = over.id as string
        await moveCardAsync(activeCardId, targetListId, 0)
      } else if (overData?.type === "card") {
        // Dropped on another card
        const targetCard = currentBoard?.lists.flatMap((list) => list.cards).find((c) => c.id === over.id)

        if (targetCard) {
          await moveCardAsync(activeCardId, targetCard.listId, targetCard.position)
        }
      }
      toast.success("Card moved")
    } catch (error) {
      console.error("Error moving card:", error)
      toast.error("Failed to move card")
    }
  }

  if (!currentBoard) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-zinc-500">No board selected</p>
      </div>
    )
  }

  const allCardIds = currentBoard.lists.flatMap((list) => list.cards.map((c) => c.id))
  const hasActiveFilters = searchQuery || filterPriority || filterAssignee || filterLabel

  const totalCards = currentBoard.lists.reduce((sum, list) => sum + list.cards.length, 0)
  const filteredCardsCount = currentBoard.lists.reduce((sum, list) => {
    const filtered = list.cards.filter((card) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesTitle = card.title.toLowerCase().includes(query)
        const matchesDescription = card.description?.toLowerCase().includes(query)
        if (!matchesTitle && !matchesDescription) return false
      }
      if (filterPriority && card.priority !== filterPriority) return false
      if (filterAssignee && !card.assignedTo.includes(filterAssignee)) return false
      if (filterLabel && !card.labels.includes(filterLabel)) return false
      return true
    })
    return sum + filtered.length
  }, 0)

  return (
    <div className="flex h-full flex-col">
      {/* Filter Summary */}
      {hasActiveFilters && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-zinc-900 border border-zinc-800 px-4 py-2">
          <Search className="h-4 w-4 text-zinc-400" />
          <span className="text-sm text-zinc-400">
            Showing <span className="font-semibold text-white">{filteredCardsCount}</span> of{" "}
            <span className="font-semibold text-white">{totalCards}</span> cards
          </span>
        </div>
      )}

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <SortableContext items={allCardIds} strategy={horizontalListSortingStrategy}>
          <div className="flex h-full gap-4 overflow-x-auto pb-4">
            {currentBoard.lists.map((list) => (
              <KanbanList key={list.id} list={list} />
            ))}

            {/* Add List Button */}
            <div className="flex-shrink-0">
              {isAddingList ? (
                <div className="w-80 rounded-lg bg-zinc-900 p-3">
                  <Input
                    autoFocus
                    placeholder="Enter list title..."
                    value={newListTitle}
                    onChange={(e) => setNewListTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddList()
                      if (e.key === "Escape") {
                        setIsAddingList(false)
                        setNewListTitle("")
                      }
                    }}
                    className="mb-2 bg-zinc-800 border-zinc-700 text-white"
                  />
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={handleAddList} 
                      disabled={isCreatingList}
                      className="bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50"
                    >
                      {isCreatingList ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Add List
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isCreatingList}
                      onClick={() => {
                        setIsAddingList(false)
                        setNewListTitle("")
                      }}
                      className="text-zinc-400 hover:text-white disabled:opacity-50"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  onClick={() => setIsAddingList(true)}
                  className="w-80 justify-start bg-zinc-900/50 text-zinc-400 hover:bg-zinc-900 hover:text-white"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add another list
                </Button>
              )}
            </div>
          </div>
        </SortableContext>

        <DragOverlay>
          {activeCard ? (
            <div className="rotate-3 opacity-80">
              <KanbanCard card={activeCard} isDragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
