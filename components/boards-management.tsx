"use client"

import { useState, useEffect } from "react"
import { useStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Loader2, Plus, Trash2, MoreVertical } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "sonner"

interface Board {
  id: string
  title: string
  description?: string
  createdAt: string
}

interface Project {
  id: string
  title: string
  description?: string
  boards: Board[]
}

export function BoardsManagement() {
  const { projects, currentProjectId, setCurrentBoard } = useStore()
  const [boards, setBoards] = useState<Board[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [boardTitle, setBoardTitle] = useState("")
  const [boardDescription, setBoardDescription] = useState("")

  const currentProject = projects.find((p) => p.id === currentProjectId) as Project | undefined

  useEffect(() => {
    if (currentProject?.boards) {
      setBoards(currentProject.boards)
    }
  }, [currentProject])

  const handleCreateBoard = async () => {
    if (!boardTitle.trim()) {
      toast.error("Board title is required")
      return
    }

    if (!currentProjectId) {
      toast.error("No project selected")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/projects/${currentProjectId}/boards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: boardTitle, description: boardDescription }),
      })

      if (response.ok) {
        const newBoard = await response.json()
        setBoards([...boards, newBoard])
        toast.success("Board created successfully")
        setBoardTitle("")
        setBoardDescription("")
        setIsDialogOpen(false)
      } else {
        const data = await response.json()
        toast.error(data.error || "Failed to create board")
      }
    } catch (error) {
      toast.error("An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteBoard = async (boardId: string) => {
    if (!confirm("Are you sure you want to delete this board?")) return

    try {
      const response = await fetch(`/api/boards/${boardId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setBoards(boards.filter((b) => b.id !== boardId))
        toast.success("Board deleted successfully")
      } else {
        const data = await response.json()
        toast.error(data.error || "Failed to delete board")
      }
    } catch (error) {
      toast.error("An error occurred")
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Project Boards</h2>
          <p className="text-sm text-zinc-500">Manage your project boards</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-violet-600 hover:bg-violet-700">
              <Plus className="mr-2 h-4 w-4" />
              Create Board
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
            <DialogHeader>
              <DialogTitle>Create New Board</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="board-title" className="text-zinc-400">
                  Board Title
                </Label>
                <Input
                  id="board-title"
                  value={boardTitle}
                  onChange={(e) => setBoardTitle(e.target.value)}
                  placeholder="Board name..."
                  className="mt-2 bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <Label htmlFor="board-description" className="text-zinc-400">
                  Description
                </Label>
                <Input
                  id="board-description"
                  value={boardDescription}
                  onChange={(e) => setBoardDescription(e.target.value)}
                  placeholder="Board description..."
                  className="mt-2 bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleCreateBoard}
                  disabled={isLoading}
                  className="flex-1 bg-violet-600 hover:bg-violet-700"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Board
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1 border-zinc-700"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Boards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {boards.map((board) => (
          <Card key={board.id} className="bg-zinc-900 border-zinc-800 p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-white">{board.title}</h3>
                <p className="text-sm text-zinc-500 mt-1">{board.description || "No description"}</p>
                <p className="text-xs text-zinc-600 mt-2">
                  Created: {new Date(board.createdAt).toLocaleDateString()}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-zinc-400 hover:text-white">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                  <DropdownMenuItem
                    onClick={() => handleDeleteBoard(board.id)}
                    className="text-red-400 focus:bg-zinc-800 focus:text-red-300"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </Card>
        ))}
      </div>

      {boards.length === 0 && (
        <Card className="bg-zinc-900 border-zinc-800 p-6 text-center">
          <p className="text-zinc-400">No boards created yet. Create your first board to get started!</p>
        </Card>
      )}
    </div>
  )
}