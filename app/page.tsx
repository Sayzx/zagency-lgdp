"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useStore } from "@/lib/store"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { KanbanBoard } from "@/components/kanban-board"
import { CardDetailModal } from "@/components/card-detail-modal"
import { MembersPanel } from "@/components/members-panel"
import { ActivityPanel } from "@/components/activity-panel"
import { ProjectInfo } from "@/components/project-info"
import { BoardsManagement } from "@/components/boards-management"
import { ProjectSettings } from "@/components/project-settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Loader2, Plus, Settings } from "lucide-react"
import { toast } from "sonner"

type View = "board" | "members" | "activity" | "settings" | "info" | "boards" | "admin"

function CreateProjectButton({ onProjectCreated }: { onProjectCreated: () => void }) {
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
      <DialogTrigger asChild>
        <Button className="bg-violet-600 hover:bg-violet-700">
          <Plus className="mr-2 h-4 w-4" />
          Create Project
        </Button>
      </DialogTrigger>
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

export default function Home() {
  const router = useRouter()
  const { status, data: session } = useSession()
  const { projects, currentProjectId, setProjects, setCurrentUser, setCurrentProject, setCurrentBoard } = useStore()
  const [currentView, setCurrentView] = useState<View>("board")
  const [isLoading, setIsLoading] = useState(true)
  const [projectsLoaded, setProjectsLoaded] = useState(false)

  // Check authentication
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])
  
  const currentProject = projects.find((p) => p.id === currentProjectId)

  // Load projects from database - wrapped in useCallback to prevent infinite loops
  const loadProjects = useCallback(async () => {
    if (projectsLoaded && status === "authenticated") return
    
    try {
      setIsLoading(true)
      const response = await fetch("/api/projects")
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login")
        }
        return
      }

      const data = await response.json()
      setProjects(data)
      setProjectsLoaded(true)

      // Set current project and board if they exist
      if (data.length > 0) {
        setCurrentProject(data[0].id)
        if (data[0].boards.length > 0) {
          setCurrentBoard(data[0].boards[0].id)
        }
      }
    } catch (error) {
      console.error("Failed to load projects:", error)
    } finally {
      setIsLoading(false)
    }
  }, [projectsLoaded, status, setProjects, setCurrentProject, setCurrentBoard, router])

  useEffect(() => {
    if (status !== "authenticated") return
    loadProjects()
  }, [status, loadProjects])

  // Update current user info in store
  useEffect(() => {
    if (session?.user) {
      setCurrentUser({
        id: session.user.id,
        name: session.user.name || "",
        email: session.user.email || "",
        firstName: session.user.firstName || "",
        lastName: session.user.lastName || "",
        avatar: session.user.avatar || "",
        role: session.user.role || "MEMBER",
      })
    }
  }, [session?.user?.id, setCurrentUser])

  // Listen to sidebar navigation changes
  useEffect(() => {
    const handleViewChange = (e: CustomEvent<View>) => {
      setCurrentView(e.detail)
    }
    window.addEventListener("viewChange" as any, handleViewChange)
    return () => window.removeEventListener("viewChange" as any, handleViewChange)
  }, [])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="flex h-full w-64 flex-col border-r border-zinc-800 bg-zinc-950">
          {/* User Profile */}
          <div className="border-t border-zinc-800 p-4 mt-auto">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8 bg-violet-600">
                {session?.user?.avatar ? (
                  <img src={session.user.avatar} alt="User avatar" className="h-full w-full object-cover" />
                ) : (
                  <AvatarFallback className="bg-violet-600 text-white text-xs">
                    {(session?.user?.firstName?.[0] || "") + (session?.user?.lastName?.[0] || "") || "U"}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium text-white">
                  {session?.user?.firstName && session?.user?.lastName
                    ? `${session?.user?.firstName} ${session?.user?.lastName}`
                    : session?.user?.name}
                </p>
                <p className="text-xs text-zinc-500">{session?.user?.email}</p>
              </div>
            </div>
          </div>
          {/* Admin Button */}
          {(session?.user?.role === "ADMIN" || session?.user?.role === "OWNER") && (
            <div className="border-t border-zinc-800 p-4">
              <Button 
                onClick={() => router.push("/admin")}
                variant="outline"
                className="w-full border-zinc-700 text-zinc-300 hover:text-white"
              >
                <Settings className="mr-2 h-4 w-4" />
                Admin
              </Button>
            </div>
          )}
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">No projects yet</h1>
            <p className="text-zinc-400 mb-6">Create your first project to get started</p>
            <CreateProjectButton onProjectCreated={() => {
              setProjectsLoaded(false)
              loadProjects()
            }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {currentView === "board" && (
          <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
            <Header />
            {(session?.user?.role === "ADMIN" || session?.user?.role === "OWNER") && (
              <Button 
                onClick={() => router.push("/admin")}
                variant="outline"
                className="border-zinc-700 text-zinc-300 hover:text-white"
              >
                <Settings className="mr-2 h-4 w-4" />
                Admin
              </Button>
            )}
          </div>
        )}
        <main className="flex-1 overflow-auto">
          {currentView === "board" && (
            <div className="p-6">
              <KanbanBoard />
            </div>
          )}
          {currentView === "members" && <MembersPanel />}
          {currentView === "activity" && <ActivityPanel />}
          {currentView === "info" && <ProjectInfo />}
          {currentView === "boards" && <BoardsManagement />}
          {currentView === "settings" && <ProjectSettings />}
        </main>
      </div>
      <CardDetailModal />
    </div>
  )
}
