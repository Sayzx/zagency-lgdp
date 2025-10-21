"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Spinner } from "@/components/ui/spinner"
import { Trash2, Plus, Users, Tags, FileText, Edit, ArrowLeft } from "lucide-react"

interface Label {
  id: string
  name: string
  color: string
  projectId: string
}

interface User {
  id: string
  email: string
  username: string
  firstName?: string
  lastName?: string
  role: string
  createdAt: string
}

interface Project {
  id: string
  title: string
  description?: string
  createdAt: string
  _count?: {
    members: number
    boards: number
  }
}

interface Board {
  id: string
  title: string
  description?: string
  projectId: string
  createdAt: string
}

export default function AdminPage() {
  const router = useRouter()
  const { status, data: session } = useSession()
  const [activeTab, setActiveTab] = useState("projects")
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [labels, setLabels] = useState<Label[]>([])
  const [boards, setBoards] = useState<Board[]>([])
  
  // New project dialog
  const [newProjectOpen, setNewProjectOpen] = useState(false)
  const [newProjectTitle, setNewProjectTitle] = useState("")
  const [newProjectDescription, setNewProjectDescription] = useState("")
  
  // New user dialog
  const [newUserOpen, setNewUserOpen] = useState(false)
  const [newUserData, setNewUserData] = useState({
    email: "",
    username: "",
    firstName: "",
    lastName: "",
    password: "",
    role: "MEMBER",
  })
  
  // New board dialog
  const [newBoardOpen, setNewBoardOpen] = useState(false)
  const [newBoardData, setNewBoardData] = useState({
    projectId: "",
    title: "",
    description: "",
  })
  
  const [newLabelName, setNewLabelName] = useState("")
  const [newLabelColor, setNewLabelColor] = useState("#3b82f6")
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const { toast } = useToast()

  // Check authorization and redirect
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (status === "authenticated" && session?.user?.role !== "ADMIN" && session?.user?.role !== "OWNER") {
      router.push("/")
    }
  }, [status, session, router])

  // Check authorization - return loading while redirecting
  if (status === "loading" || status === "unauthenticated" || (status === "authenticated" && session?.user?.role !== "ADMIN" && session?.user?.role !== "OWNER")) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <div className="text-center">
          <Spinner />
          <p className="text-muted-foreground mt-4">Loading...</p>
        </div>
      </div>
    )
  }

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load projects
      const projectsRes = await fetch("/api/admin/projects")
      if (projectsRes.ok) {
        const data = await projectsRes.json()
        setProjects(data)
      }

      // Load users
      const usersRes = await fetch("/api/admin/users")
      if (usersRes.ok) {
        const data = await usersRes.json()
        setUsers(data.users || [])
      }

      // Load boards
      const boardsRes = await fetch("/api/admin/projects/boards")
      if (boardsRes.ok) {
        const data = await boardsRes.json()
        setBoards(data)
      }
    } catch (error) {
      console.error("Error loading data:", error)
      toast({
        title: "Error",
        description: "Failed to load admin data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadLabels = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/labels`)
      if (res.ok) {
        const data = await res.json()
        setLabels(data)
      }
    } catch (error) {
      console.error("Error loading labels:", error)
    }
  }

  // Project management
  const handleCreateProject = async () => {
    if (!newProjectTitle) {
      toast({
        title: "Error",
        description: "Project title is required",
        variant: "destructive",
      })
      return
    }

    try {
      const res = await fetch("/api/admin/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newProjectTitle,
          description: newProjectDescription,
        }),
      })

      if (!res.ok) throw new Error("Failed to create project")

      setNewProjectTitle("")
      setNewProjectDescription("")
      setNewProjectOpen(false)
      toast({
        title: "Success",
        description: "Project created successfully",
      })
      loadData()
    } catch (error) {
      console.error("Error creating project:", error)
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive",
      })
    }
  }

  // User management
  const handleCreateUser = async () => {
    if (!newUserData.email || !newUserData.username || !newUserData.password) {
      toast({
        title: "Error",
        description: "Email, username, and password are required",
        variant: "destructive",
      })
      return
    }

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUserData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create user")
      }

      setNewUserData({
        email: "",
        username: "",
        firstName: "",
        lastName: "",
        password: "",
        role: "MEMBER",
      })
      setNewUserOpen(false)
      toast({
        title: "Success",
        description: "User created successfully",
      })
      loadData()
    } catch (error: any) {
      console.error("Error creating user:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      })
    }
  }

  const handleDeleteUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Failed to delete user")

      toast({
        title: "Success",
        description: "User deleted successfully",
      })
      loadData()
    } catch (error) {
      console.error("Error deleting user:", error)
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      })
    }
  }

  // Board management
  const handleCreateBoard = async () => {
    if (!newBoardData.projectId || !newBoardData.title) {
      toast({
        title: "Error",
        description: "Project and board title are required",
        variant: "destructive",
      })
      return
    }

    try {
      const res = await fetch("/api/admin/projects/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBoardData),
      })

      if (!res.ok) throw new Error("Failed to create board")

      setNewBoardData({
        projectId: "",
        title: "",
        description: "",
      })
      setNewBoardOpen(false)
      toast({
        title: "Success",
        description: "Board created successfully",
      })
      loadData()
    } catch (error) {
      console.error("Error creating board:", error)
      toast({
        title: "Error",
        description: "Failed to create board",
        variant: "destructive",
      })
    }
  }

  // Label management
  const handleAddLabel = async () => {
    if (!selectedProjectId || !newLabelName) {
      toast({
        title: "Error",
        description: "Project and label name are required",
        variant: "destructive",
      })
      return
    }

    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/labels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newLabelName,
          color: newLabelColor,
        }),
      })

      if (!res.ok) throw new Error("Failed to create label")

      const newLabel = await res.json()
      setLabels([...labels, newLabel])
      setNewLabelName("")
      setNewLabelColor("#3b82f6")

      toast({
        title: "Success",
        description: `Label "${newLabelName}" created`,
      })
    } catch (error) {
      console.error("Error creating label:", error)
      toast({
        title: "Error",
        description: "Failed to create label",
        variant: "destructive",
      })
    }
  }

  const handleDeleteLabel = async (labelId: string) => {
    try {
      const res = await fetch(`/api/admin/labels/${labelId}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Failed to delete label")

      setLabels(labels.filter((l) => l.id !== labelId))

      toast({
        title: "Success",
        description: "Label deleted",
      })
    } catch (error) {
      console.error("Error deleting label:", error)
      toast({
        title: "Error",
        description: "Failed to delete label",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-2">Manage projects, users, boards, and labels</p>
          </div>
          <Button variant="outline" onClick={() => router.push("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-3xl grid-cols-4">
            <TabsTrigger value="projects" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Projects
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="boards" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Boards
            </TabsTrigger>
            <TabsTrigger value="labels" className="flex items-center gap-2">
              <Tags className="w-4 h-4" />
              Labels
            </TabsTrigger>
          </TabsList>

          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-4 mt-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">All Projects</h2>
              <Dialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Project
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Project</DialogTitle>
                    <DialogDescription>Create a new project for your team</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="project-title">Project Title</Label>
                      <Input
                        id="project-title"
                        value={newProjectTitle}
                        onChange={(e) => setNewProjectTitle(e.target.value)}
                        placeholder="Project name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="project-description">Description</Label>
                      <Input
                        id="project-description"
                        value={newProjectDescription}
                        onChange={(e) => setNewProjectDescription(e.target.value)}
                        placeholder="Project description"
                      />
                    </div>
                    <Button onClick={handleCreateProject} className="w-full">
                      Create Project
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : (
              <div className="grid gap-4">
                {projects.map((project) => (
                  <Card key={project.id}>
                    <CardHeader>
                      <CardTitle>{project.title}</CardTitle>
                      {project.description && <CardDescription>{project.description}</CardDescription>}
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Members:</span>
                          <p className="font-semibold text-lg">{project._count?.members || 0}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Boards:</span>
                          <p className="font-semibold text-lg">{project._count?.boards || 0}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Created:</span>
                          <p className="font-semibold">{new Date(project.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4 mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">All Users</h2>
              <Dialog open={newUserOpen} onOpenChange={setNewUserOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New User</DialogTitle>
                    <DialogDescription>Create a new user account</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="user-first-name">First Name</Label>
                        <Input
                          id="user-first-name"
                          value={newUserData.firstName}
                          onChange={(e) => setNewUserData({ ...newUserData, firstName: e.target.value })}
                          placeholder="First name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="user-last-name">Last Name</Label>
                        <Input
                          id="user-last-name"
                          value={newUserData.lastName}
                          onChange={(e) => setNewUserData({ ...newUserData, lastName: e.target.value })}
                          placeholder="Last name"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="user-email">Email</Label>
                      <Input
                        id="user-email"
                        type="email"
                        value={newUserData.email}
                        onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                        placeholder="user@example.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="user-username">Username</Label>
                      <Input
                        id="user-username"
                        value={newUserData.username}
                        onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                        placeholder="username"
                      />
                    </div>
                    <div>
                      <Label htmlFor="user-password">Password</Label>
                      <Input
                        id="user-password"
                        type="password"
                        value={newUserData.password}
                        onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                        placeholder="password"
                      />
                    </div>
                    <div>
                      <Label htmlFor="user-role">Role</Label>
                      <Select value={newUserData.role} onValueChange={(role) => setNewUserData({ ...newUserData, role })}>
                        <SelectTrigger className="bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MEMBER">Member</SelectItem>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                          <SelectItem value="OWNER">Owner</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleCreateUser} className="w-full">
                      Create User
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-6 py-3 text-left font-semibold">Name</th>
                      <th className="px-6 py-3 text-left font-semibold">Email</th>
                      <th className="px-6 py-3 text-left font-semibold">Username</th>
                      <th className="px-6 py-3 text-left font-semibold">Role</th>
                      <th className="px-6 py-3 text-left font-semibold">Created</th>
                      <th className="px-6 py-3 text-left font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-muted/50">
                        <td className="px-6 py-3">{`${user.firstName || ""} ${user.lastName || ""}`.trim() || "N/A"}</td>
                        <td className="px-6 py-3">{user.email}</td>
                        <td className="px-6 py-3">{user.username}</td>
                        <td className="px-6 py-3">
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-3">{new Date(user.createdAt).toLocaleDateString()}</td>
                        <td className="px-6 py-3">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogTitle>Delete User</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this user? This action cannot be undone.
                              </AlertDialogDescription>
                              <div className="flex justify-end gap-2">
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Delete
                                </AlertDialogAction>
                              </div>
                            </AlertDialogContent>
                          </AlertDialog>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* Boards Tab */}
          <TabsContent value="boards" className="space-y-4 mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">All Boards</h2>
              <Dialog open={newBoardOpen} onOpenChange={setNewBoardOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Board
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Board</DialogTitle>
                    <DialogDescription>Create a new board for a project</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="board-project">Project</Label>
                      <Select value={newBoardData.projectId} onValueChange={(projectId) => setNewBoardData({ ...newBoardData, projectId })}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="board-title">Board Title</Label>
                      <Input
                        id="board-title"
                        value={newBoardData.title}
                        onChange={(e) => setNewBoardData({ ...newBoardData, title: e.target.value })}
                        placeholder="Board name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="board-description">Description</Label>
                      <Input
                        id="board-description"
                        value={newBoardData.description}
                        onChange={(e) => setNewBoardData({ ...newBoardData, description: e.target.value })}
                        placeholder="Board description"
                      />
                    </div>
                    <Button onClick={handleCreateBoard} className="w-full">
                      Create Board
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : (
              <div className="grid gap-4">
                {boards.map((board) => {
                  const project = projects.find((p) => p.id === board.projectId)
                  return (
                    <Card key={board.id}>
                      <CardHeader>
                        <CardTitle>{board.title}</CardTitle>
                        <CardDescription>Project: {project?.title || "Unknown"}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {board.description && <p className="text-sm text-muted-foreground">{board.description}</p>}
                          <p className="text-xs text-muted-foreground">Created: {new Date(board.createdAt).toLocaleDateString()}</p>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* Labels Tab */}
          <TabsContent value="labels" className="space-y-4 mt-6">
            <div className="space-y-4">
              <div className="flex gap-2">
                <select
                  value={selectedProjectId || ""}
                  onChange={(e) => {
                    setSelectedProjectId(e.target.value || null)
                    if (e.target.value) {
                      loadLabels(e.target.value)
                    } else {
                      setLabels([])
                    }
                  }}
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select a project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </select>
              </div>

              {selectedProjectId && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Label
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Label</DialogTitle>
                      <DialogDescription>Create a new label for this project</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="label-name">Label Name</Label>
                        <Input
                          id="label-name"
                          value={newLabelName}
                          onChange={(e) => setNewLabelName(e.target.value)}
                          placeholder="e.g., Bug, Feature, Documentation"
                        />
                      </div>
                      <div>
                        <Label htmlFor="label-color">Color</Label>
                        <div className="flex gap-2">
                          <input
                            id="label-color"
                            type="color"
                            value={newLabelColor}
                            onChange={(e) => setNewLabelColor(e.target.value)}
                            className="w-12 h-10 rounded border border-input cursor-pointer"
                          />
                          <Input value={newLabelColor} onChange={(e) => setNewLabelColor(e.target.value)} />
                        </div>
                      </div>
                      <Button onClick={handleAddLabel} className="w-full">
                        Create Label
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {labels.length > 0 && (
                <div className="grid gap-2">
                  {labels.map((label) => (
                    <div key={label.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: label.color }}
                        />
                        <span className="font-medium">{label.name}</span>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogTitle>Delete Label</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this label? This action cannot be undone.
                          </AlertDialogDescription>
                          <div className="flex justify-end gap-2">
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteLabel(label.id)}
                              className="bg-red-500 hover:bg-red-600"
                            >
                              Delete
                            </AlertDialogAction>
                          </div>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
