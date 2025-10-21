"use client"

import { useState } from "react"
import { useStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Filter, Plus, X, Loader2 } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import type { Priority } from "@/lib/types"

export function Header() {
  const {
    projects,
    currentProjectId,
    currentBoardId,
    searchQuery,
    setSearchQuery,
    filterPriority,
    setFilterPriority,
    filterAssignee,
    setFilterAssignee,
    filterLabel,
    setFilterLabel,
    clearFilters,
    createCard,
    currentUser,
  } = useStore()

  const [isCreatingCard, setIsCreatingCard] = useState(false)

  const currentProject = projects.find((p) => p.id === currentProjectId)
  const currentBoard = currentProject?.boards.find((b) => b.id === currentBoardId)

  const activeFiltersCount = [filterPriority, filterAssignee, filterLabel, searchQuery].filter(Boolean).length

  const handleQuickAddCard = async () => {
    if (!currentBoard || currentBoard.lists.length === 0) {
      toast.error("No lists available")
      return
    }

    const title = prompt("Enter card title:")
    if (!title?.trim()) return

    setIsCreatingCard(true)
    try {
      const firstList = currentBoard.lists[0]
      await createCard({
        title: title.trim(),
        listId: firstList.id,
        position: firstList.cards.length,
        assignedTo: [],
        labels: [],
        createdBy: currentUser.id,
      })
      toast.success("Card created")
    } catch (error) {
      console.error(error)
      toast.error("Failed to create card")
    } finally {
      setIsCreatingCard(false)
    }
  }

  const selectedLabel = currentProject?.labels?.find((l) => l.id === filterLabel)
  const selectedAssignee = currentProject?.members.find((m) => m.id === filterAssignee)

  return (
    <header className="flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-white">{currentBoard?.title || "Project Management"}</h1>
        {currentBoard?.description && <p className="text-sm text-zinc-500">{currentBoard.description}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Search cards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 bg-zinc-900 border-zinc-800 pl-9 pr-9 text-white placeholder:text-zinc-500 focus-visible:ring-violet-600"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Advanced Filters */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white"
            >
              <Filter className="mr-2 h-4 w-4" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge className="ml-2 h-5 min-w-5 rounded-full bg-violet-600 px-1.5 text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 bg-zinc-900 border-zinc-800 text-white">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-3">Filter Cards</h3>
              </div>

              {/* Priority Filter */}
              <div className="space-y-2">
                <Label className="text-sm text-zinc-400">Priority</Label>
                <Select
                  value={filterPriority || "all"}
                  onValueChange={(value) => setFilterPriority(value === "all" ? null : (value as Priority))}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue placeholder="All priorities" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="all" className="text-zinc-200">
                      All priorities
                    </SelectItem>
                    <SelectItem value="urgent" className="text-zinc-200">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-red-500" />
                        Urgent
                      </div>
                    </SelectItem>
                    <SelectItem value="high" className="text-zinc-200">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-orange-500" />
                        High
                      </div>
                    </SelectItem>
                    <SelectItem value="medium" className="text-zinc-200">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-yellow-500" />
                        Medium
                      </div>
                    </SelectItem>
                    <SelectItem value="low" className="text-zinc-200">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        Low
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Assignee Filter */}
              <div className="space-y-2">
                <Label className="text-sm text-zinc-400">Assigned To</Label>
                <Select
                  value={filterAssignee || "all"}
                  onValueChange={(value) => setFilterAssignee(value === "all" ? null : value)}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue placeholder="All members" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="all" className="text-zinc-200">
                      All members
                    </SelectItem>
                    {currentProject?.members.map((member) => (
                      <SelectItem key={member.id} value={member.id} className="text-zinc-200">
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Label Filter */}
              <div className="space-y-2">
                <Label className="text-sm text-zinc-400">Label</Label>
                <Select
                  value={filterLabel || "all"}
                  onValueChange={(value) => setFilterLabel(value === "all" ? null : value)}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue placeholder="All labels" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="all" className="text-zinc-200">
                      All labels
                    </SelectItem>
                    {currentProject?.labels?.map((label) => (
                      <SelectItem key={label.id} value={label.id} className="text-zinc-200">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded" style={{ backgroundColor: label.color }} />
                          {label.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {activeFiltersCount > 0 && (
                <>
                  <Separator className="bg-zinc-800" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="w-full text-violet-400 hover:text-violet-300 hover:bg-zinc-800"
                  >
                    Clear All Filters
                  </Button>
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Active Filters Display */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center gap-2">
            {filterPriority && (
              <Badge
                variant="secondary"
                className="bg-zinc-800 text-zinc-300 hover:bg-zinc-700 cursor-pointer"
                onClick={() => setFilterPriority(null)}
              >
                Priority: {filterPriority}
                <X className="ml-1 h-3 w-3" />
              </Badge>
            )}
            {selectedAssignee && (
              <Badge
                variant="secondary"
                className="bg-zinc-800 text-zinc-300 hover:bg-zinc-700 cursor-pointer"
                onClick={() => setFilterAssignee(null)}
              >
                {selectedAssignee.name}
                <X className="ml-1 h-3 w-3" />
              </Badge>
            )}
            {selectedLabel && (
              <Badge
                style={{ backgroundColor: selectedLabel.color }}
                className="text-white hover:opacity-80 cursor-pointer border-0"
                onClick={() => setFilterLabel(null)}
              >
                {selectedLabel.name}
                <X className="ml-1 h-3 w-3" />
              </Badge>
            )}
          </div>
        )}

        <Button
          size="sm"
          onClick={handleQuickAddCard}
          disabled={isCreatingCard}
          className="bg-violet-600 text-white hover:bg-violet-700"
        >
          {isCreatingCard ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              New Card
            </>
          )}
        </Button>
      </div>
    </header>
  )
}
