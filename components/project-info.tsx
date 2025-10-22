"use client"

import { useState, useEffect } from "react"
import { useStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Edit2, Save, X, Plus, Trash2, FileUp, Download } from "lucide-react"
import { toast } from "sonner"
import { Textarea } from "@/components/ui/textarea"

interface User {
  id: string
  firstName?: string
  lastName?: string
  email: string
  username?: string
  avatar?: string
  name?: string
  role?: string
}

interface Member {
  id: string
  firstName?: string
  lastName?: string
  email: string
  username?: string
  avatar?: string
  name?: string
  role?: string
}

interface ProjectMedia {
  id: string
  name: string
  url: string
  type: string
  size: number
  uploadedAt: string
}

interface Project {
  id: string
  title: string
  description?: string
  specifications?: string
  media?: ProjectMedia[]
  createdAt: string
  createdBy?: { firstName?: string; lastName?: string; email: string }
  members: (Member | User)[]
  boards: { id: string; title: string }[]
}

export function ProjectInfo() {
  const { projects, currentProjectId } = useStore()
  const [project, setProject] = useState<Project | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editSpecifications, setEditSpecifications] = useState("")
  const [isEditingSpecs, setIsEditingSpecs] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [addMemberEmail, setAddMemberEmail] = useState("")
  const [addMemberRole, setAddMemberRole] = useState("MEMBER")
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [isUploadingMedia, setIsUploadingMedia] = useState(false)

  const currentProject = projects.find((p) => p.id === currentProjectId)

  // Load available users
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await fetch("/api/admin/users")
        if (response.ok) {
          const data = await response.json()
          setAvailableUsers(data.users || [])
        }
      } catch (error) {
        console.error("Failed to load users:", error)
      }
    }
    loadUsers()
  }, [])

  useEffect(() => {
    if (currentProject) {
      setProject(currentProject as any)
      setEditTitle(currentProject.title)
      setEditDescription(currentProject.description || "")
      setEditSpecifications((currentProject as any).specifications || "")
    }
  }, [currentProject])

  const handleAddMember = async () => {
    if (!addMemberEmail.trim() || !currentProjectId) {
      toast.error("Please fill in all fields")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/projects/${currentProjectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userEmail: addMemberEmail,
          role: addMemberRole
        }),
      })

      if (response.ok) {
        toast.success("Member added successfully")
        setAddMemberEmail("")
        setAddMemberRole("MEMBER")
        setIsAddingMember(false)
        // Reload project data
        const projectsRes = await fetch("/api/projects")
        if (projectsRes.ok) {
          const data = await projectsRes.json()
          const updated = data.find((p: any) => p.id === currentProjectId)
          if (updated) {
            setProject(updated)
          }
        }
      } else {
        const data = await response.json()
        toast.error(data.error || "Failed to add member")
      }
    } catch (error) {
      toast.error("An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!currentProjectId) return
    
    if (!confirm("Are you sure you want to remove this member?")) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/projects/${currentProjectId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: memberId }),
      })

      if (response.ok) {
        toast.success("Member removed successfully")
        // Reload project data
        const projectsRes = await fetch("/api/projects")
        if (projectsRes.ok) {
          const data = await projectsRes.json()
          const updated = data.find((p: any) => p.id === currentProjectId)
          if (updated) {
            setProject(updated)
          }
        }
      } else {
        const data = await response.json()
        toast.error(data.error || "Failed to remove member")
      }
    } catch (error) {
      toast.error("An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveProject = async () => {
    if (!editTitle.trim()) {
      toast.error("Project title is required")
      return
    }

    if (!currentProjectId) {
      toast.error("No project selected")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/projects/${currentProjectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title: editTitle, 
          description: editDescription,
          specifications: editSpecifications 
        }),
      })

      if (response.ok) {
        const updatedProject = await response.json()
        setProject(updatedProject)
        setIsEditing(false)
        setIsEditingSpecs(false)
        toast.success("Project updated successfully")
      } else {
        const data = await response.json()
        toast.error(data.error || "Failed to update project")
      }
    } catch (error) {
      toast.error("An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveSpecifications = async () => {
    if (!currentProjectId) {
      toast.error("No project selected")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/projects/${currentProjectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specifications: editSpecifications }),
      })

      if (response.ok) {
        const updatedProject = await response.json()
        setProject(updatedProject)
        setIsEditingSpecs(false)
        toast.success("Specifications saved successfully")
      } else {
        const data = await response.json()
        toast.error(data.error || "Failed to save specifications")
      }
    } catch (error) {
      toast.error("An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleMediaUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !currentProjectId) return

    setIsUploadingMedia(true)
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch(`/api/projects/${currentProjectId}/media`, {
          method: "POST",
          body: formData,
        })

        if (response.ok) {
          const data = await response.json()
          // Update project with new media
          const projectsRes = await fetch("/api/projects")
          if (projectsRes.ok) {
            const projectsData = await projectsRes.json()
            const updated = projectsData.find((p: any) => p.id === currentProjectId)
            if (updated) {
              setProject(updated)
            }
          }
          toast.success(`${file.name} uploaded successfully`)
        } else {
          const data = await response.json()
          toast.error(data.error || `Failed to upload ${file.name}`)
        }
      }
    } catch (error) {
      toast.error("An error occurred during upload")
    } finally {
      setIsUploadingMedia(false)
    }
  }

  const handleRemoveMedia = async (mediaId: string) => {
    if (!currentProjectId) return

    if (!confirm("Are you sure you want to delete this file?")) return

    try {
      const response = await fetch(`/api/projects/${currentProjectId}/media/${mediaId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setProject((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            media: (prev.media || []).filter((m) => m.id !== mediaId),
          }
        })
        toast.success("File deleted successfully")
      } else {
        const data = await response.json()
        toast.error(data.error || "Failed to delete file")
      }
    } catch (error) {
      toast.error("An error occurred")
    }
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="text-white">Loading project information...</div>
      </div>
    )
  }

  const createdByName = project.createdBy
    ? `${project.createdBy.firstName || ""} ${project.createdBy.lastName || ""}`.trim() || project.createdBy.email
    : "Unknown"

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Project Information</h2>
          <p className="text-sm text-zinc-500">View and manage your project details</p>
        </div>
        {!isEditing && (
          <Button
            onClick={() => setIsEditing(true)}
            className="bg-violet-600 hover:bg-violet-700"
          >
            <Edit2 className="mr-2 h-4 w-4" />
            Edit Project
          </Button>
        )}
      </div>

      {/* Project Details Card */}
      <Card className="bg-zinc-900 border-zinc-800 p-6 space-y-4">
        <div>
          <Label className="text-zinc-400">Project Title</Label>
          {isEditing ? (
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="mt-2 bg-zinc-800 border-zinc-700 text-white"
            />
          ) : (
            <p className="mt-2 text-lg font-semibold text-white">{project.title}</p>
          )}
        </div>

        <div>
          <Label className="text-zinc-400">Description</Label>
          {isEditing ? (
            <Input
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Project description..."
              className="mt-2 bg-zinc-800 border-zinc-700 text-white"
            />
          ) : (
            <p className="mt-2 text-zinc-300">{project.description || "No description"}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
          <div>
            <Label className="text-zinc-400">Created Date</Label>
            <p className="mt-2 text-sm text-zinc-300">
              {new Date(project.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div>
            <Label className="text-zinc-400">Total Members</Label>
            <p className="mt-2 text-sm text-zinc-300">{project.members.length} members</p>
          </div>
          <div>
            <Label className="text-zinc-400">Total Boards</Label>
            <p className="mt-2 text-sm text-zinc-300">{project.boards.length} boards</p>
          </div>
          <div>
            <Label className="text-zinc-400">Project Owner</Label>
            <p className="mt-2 text-sm text-zinc-300">{createdByName}</p>
          </div>
        </div>

        {isEditing && (
          <div className="flex gap-2 pt-4 border-t border-zinc-800">
            <Button
              onClick={handleSaveProject}
              disabled={isLoading}
              className="flex-1 bg-violet-600 hover:bg-violet-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
            <Button
              onClick={() => {
                setIsEditing(false)
                setEditTitle(project.title)
                setEditDescription(project.description || "")
              }}
              variant="outline"
              className="flex-1 border-zinc-700"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </div>
        )}
      </Card>

      {/* Team Members */}
      <Card className="bg-zinc-900 border-zinc-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Team Members ({project.members.length})</h3>
          <Dialog open={isAddingMember} onOpenChange={setIsAddingMember}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
              <DialogHeader>
                <DialogTitle>Add Team Member</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  Add a new member to this project
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="member-email">Member Email</Label>
                  <Input
                    id="member-email"
                    type="email"
                    placeholder="member@example.com"
                    value={addMemberEmail}
                    onChange={(e) => setAddMemberEmail(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="member-role">Role</Label>
                  <Select value={addMemberRole} onValueChange={setAddMemberRole}>
                    <SelectTrigger id="member-role" className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      <SelectItem value="MEMBER" className="text-zinc-200">Member</SelectItem>
                      <SelectItem value="ADMIN" className="text-zinc-200">Admin</SelectItem>
                      <SelectItem value="VIEWER" className="text-zinc-200">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleAddMember}
                    disabled={isLoading}
                    className="flex-1 bg-violet-600 hover:bg-violet-700"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      "Add Member"
                    )}
                  </Button>
                  <Button
                    onClick={() => setIsAddingMember(false)}
                    variant="outline"
                    className="flex-1 border-zinc-700"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="space-y-3">
          {project.members.map((member) => {
            const memberName = member.name || `${member.user?.firstName || member.firstName || ""} ${member.user?.lastName || member.lastName || ""}`.trim() || "Unknown"
            const memberEmail = member.user?.email || member.email || member.username || "No email"
            const roleColors: Record<string, string> = {
              OWNER: "bg-violet-600",
              ADMIN: "bg-blue-600",
              MEMBER: "bg-zinc-600",
              VIEWER: "bg-zinc-700",
            }

            return (
              <div key={member.id} className="flex items-center justify-between p-3 bg-zinc-800 rounded border border-zinc-700">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 bg-violet-600">
                    <AvatarFallback className="bg-violet-600 text-white text-xs">
                      {memberName.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-white">{memberName}</p>
                    <p className="text-xs text-zinc-500">{memberEmail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`${roleColors[member.role || "MEMBER"] || "bg-zinc-600"} text-white`}>
                    {member.role || "MEMBER"}
                  </Badge>
                  {member.role !== "OWNER" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveMember(member.id)}
                      disabled={isLoading}
                      className="text-zinc-400 hover:text-red-400 h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Boards */}
      <Card className="bg-zinc-900 border-zinc-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Project Boards ({project.boards.length})</h3>
        <div className="space-y-2">
          {project.boards.length > 0 ? (
            project.boards.map((board) => (
              <div key={board.id} className="p-3 bg-zinc-800 rounded border border-zinc-700 text-sm text-zinc-300">
                {board.title}
              </div>
            ))
          ) : (
            <p className="text-sm text-zinc-500">No boards created yet</p>
          )}
        </div>
      </Card>

      {/* Specifications/Cahier des Charges */}
      <Card className="bg-zinc-900 border-zinc-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Specifications & Requirements</h3>
          {!isEditingSpecs && (
            <Button
              onClick={() => setIsEditingSpecs(true)}
              className="bg-violet-600 hover:bg-violet-700"
              size="sm"
            >
              <Edit2 className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
        
        {isEditingSpecs ? (
          <div className="space-y-3">
            <Textarea
              value={editSpecifications}
              onChange={(e) => setEditSpecifications(e.target.value)}
              placeholder="Enter project specifications, requirements, and cahier des charges..."
              className="min-h-[250px] bg-zinc-800 border-zinc-700 text-white resize-vertical"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleSaveSpecifications}
                disabled={isLoading}
                className="flex-1 bg-violet-600 hover:bg-violet-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Specifications
                  </>
                )}
              </Button>
              <Button
                onClick={() => {
                  setIsEditingSpecs(false)
                  setEditSpecifications(project.specifications || "")
                }}
                variant="outline"
                className="border-zinc-700"
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-zinc-800 rounded border border-zinc-700 text-zinc-300 whitespace-pre-wrap max-h-[300px] overflow-y-auto">
            {project.specifications || "No specifications added yet. Click Edit to add project requirements and cahier des charges."}
          </div>
        )}
      </Card>

      {/* Media Section */}
      <Card className="bg-zinc-900 border-zinc-800 p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-2">Project Media & Documents</h3>
          <p className="text-sm text-zinc-400">Upload and manage project files, images, and documents</p>
        </div>

        {/* Upload Area */}
        <div className="mb-6 p-6 border-2 border-dashed border-zinc-700 rounded bg-zinc-800/50 hover:bg-zinc-800 transition-colors cursor-pointer relative group">
          <input
            type="file"
            multiple
            onChange={(e) => handleMediaUpload(e.target.files)}
            disabled={isUploadingMedia}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          <div className="text-center pointer-events-none">
            <FileUp className="h-8 w-8 text-zinc-500 mx-auto mb-2" />
            <p className="text-sm text-zinc-300 font-medium">
              {isUploadingMedia ? "Uploading..." : "Drag files here or click to upload"}
            </p>
            <p className="text-xs text-zinc-500 mt-1">Supported: Images, PDFs, documents, and more</p>
          </div>
        </div>

        {/* Media List */}
        {project.media && project.media.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-zinc-400 font-medium">
              Files ({project.media.length})
            </p>
            {project.media.map((media) => (
              <div
                key={media.id}
                className="flex items-center justify-between p-3 bg-zinc-800 rounded border border-zinc-700 hover:border-zinc-600 transition-colors group"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="h-10 w-10 rounded bg-violet-600/20 flex items-center justify-center flex-shrink-0">
                    <FileUp className="h-5 w-5 text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{media.name}</p>
                    <p className="text-xs text-zinc-500">
                      {(media.size / 1024 / 1024).toFixed(2)} MB • {new Date(media.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <a
                    href={media.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-zinc-700 rounded transition-colors"
                    title="Download"
                  >
                    <Download className="h-4 w-4 text-zinc-400 hover:text-white" />
                  </a>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveMedia(media.id)}
                    className="text-zinc-400 hover:text-red-400 h-8 w-8 p-0"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500 text-center py-8">
            No media uploaded yet. Start by uploading project files and documents.
          </p>
        )}
      </Card>
    </div>
  )
}