"use client"

import { useState } from "react"
import { useStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LayoutDashboard, Plus, ChevronDown, Users, Settings, Activity, Grid3X3, FileText, Loader2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type View = "board" | "members" | "activity" | "settings" | "info" | "boards"

function CreateProjectDialog({ onProjectCreated }: { onProjectCreated: () => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("Project title is required")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      })

      if (response.ok) {
        toast.success("Project created successfully")
        setTitle("")
        setDescription("")
        setIsOpen(false)
        onProjectCreated()
      } else {
        const data = await response.json()
        toast.error(data.error || "Failed to create project")
      }
    } catch (error) {
      toast.error("An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuItem
        onClick={(e) => {
          e.preventDefault()
          setIsOpen(true)
        }}
        className="text-zinc-200 focus:bg-zinc-800 focus:text-white cursor-pointer"
      >
        <Plus className="mr-2 h-4 w-4" />
        Create New Project
      </DropdownMenuItem>
      <DialogContent className="border-zinc-800 bg-zinc-900 text-white">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Create a new project to start managing your work
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Project Title</Label>
            <Input
              id="title"
              placeholder="My Project"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border-zinc-700 bg-zinc-800"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Project description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="border-zinc-700 bg-zinc-800"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} className="border-zinc-700">
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isLoading}
            className="bg-violet-600 hover:bg-violet-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Project"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function Sidebar() {
  const { projects, currentProjectId, currentBoardId, setCurrentProject, setCurrentBoard, currentUser, setProjects } = useStore()
  const [currentView, setCurrentView] = useState<View>("board")
  const [refreshKey, setRefreshKey] = useState(0)

  const currentProject = projects.find((p) => p.id === currentProjectId)

  const handleViewChange = (view: View) => {
    setCurrentView(view)
    // Dispatch custom event for view changes
    window.dispatchEvent(new CustomEvent("viewChange", { detail: view }))
  }

  return (
    <div className="flex h-full w-64 flex-col border-r border-zinc-800 bg-zinc-950">
      {/* Project Selector */}
      <div className="border-b border-zinc-800 p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-between bg-zinc-900 hover:bg-zinc-800">
              <span className="truncate font-semibold text-white">{currentProject?.title || "Select Project"}</span>
              <ChevronDown className="h-4 w-4 text-zinc-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-zinc-900 border-zinc-800">
            {projects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                onClick={() => setCurrentProject(project.id)}
                className="text-zinc-200 focus:bg-zinc-800 focus:text-white"
              >
                {project.title}
              </DropdownMenuItem>
            ))}
            {projects.length > 0 && <DropdownMenuSeparator className="bg-zinc-800" />}
            <CreateProjectDialog onProjectCreated={() => {
              setRefreshKey(prev => prev + 1)
              // Reload projects
              fetch("/api/projects")
                .then(r => r.json())
                .then(data => setProjects(data))
            }} />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-1">
          <Button
            variant="ghost"
            onClick={() => handleViewChange("board")}
            className={cn(
              "w-full justify-start text-zinc-300 hover:bg-zinc-900 hover:text-white",
              currentView === "board" && "bg-zinc-900 text-white",
            )}
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
          <Button
            variant="ghost"
            onClick={() => handleViewChange("activity")}
            className={cn(
              "w-full justify-start text-zinc-300 hover:bg-zinc-900 hover:text-white",
              currentView === "activity" && "bg-zinc-900 text-white",
            )}
          >
            <Activity className="mr-2 h-4 w-4" />
            Activity
          </Button>
          <Button
            variant="ghost"
            onClick={() => handleViewChange("info")}
            className={cn(
              "w-full justify-start text-zinc-300 hover:bg-zinc-900 hover:text-white",
              currentView === "info" && "bg-zinc-900 text-white",
            )}
          >
            <FileText className="mr-2 h-4 w-4" />
            Project Info
          </Button>
          <Button
            variant="ghost"
            onClick={() => handleViewChange("boards")}
            className={cn(
              "w-full justify-start text-zinc-300 hover:bg-zinc-900 hover:text-white",
              currentView === "boards" && "bg-zinc-900 text-white",
            )}
          >
            <Grid3X3 className="mr-2 h-4 w-4" />
            Boards
          </Button>
          <Button
            variant="ghost"
            onClick={() => handleViewChange("members")}
            className={cn(
              "w-full justify-start text-zinc-300 hover:bg-zinc-900 hover:text-white",
              currentView === "members" && "bg-zinc-900 text-white",
            )}
          >
            <Users className="mr-2 h-4 w-4" />
            Members
          </Button>
          {/* <Button
            variant="ghost"
            onClick={() => handleViewChange("settings")}
            className={cn(
              "w-full justify-start text-zinc-300 hover:bg-zinc-900 hover:text-white",
              currentView === "settings" && "bg-zinc-900 text-white",
            )}
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button> */}
        </div>

        {/* Boards */}
        {currentProject && currentView === "board" && (
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between px-2">
              <h3 className="text-xs font-semibold uppercase text-zinc-500">Boards</h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-zinc-500 hover:bg-zinc-900 hover:text-white"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-1">
              {currentProject.boards.map((board) => (
                <Button
                  key={board.id}
                  variant="ghost"
                  onClick={() => setCurrentBoard(board.id)}
                  className={cn(
                    "w-full justify-start text-zinc-300 hover:bg-zinc-900 hover:text-white",
                    currentBoardId === board.id && "bg-violet-600 text-white hover:bg-violet-700",
                  )}
                >
                  {board.title}
                </Button>
              ))}
            </div>
          </div>
        )}
      </ScrollArea>

      {/* User Profile */}
      <div className="border-t border-zinc-800 p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 bg-violet-600">
            {currentUser.avatar ? (
              <img src={currentUser.avatar} alt="User avatar" className="h-full w-full object-cover" />
            ) : (
              <AvatarFallback className="bg-violet-600 text-white text-xs">
                {(currentUser.firstName?.[0] || "") + (currentUser.lastName?.[0] || "") || "U"}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium text-white">
              {currentUser.firstName && currentUser.lastName
                ? `${currentUser.firstName} ${currentUser.lastName}`
                : currentUser.name}
            </p>
            <p className="text-xs text-zinc-500">{currentUser.email}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
