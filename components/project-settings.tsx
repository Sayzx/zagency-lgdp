"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Spinner } from "@/components/ui/spinner"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Plus, Trash2, X, Eye, Upload } from "lucide-react"

interface ProjectData {
  id: string
  title: string
  imageUrl?: string
}

interface ProjectMember {
  userId: string
  projectId: string
  role: string
  user: {
    id: string
    email: string
    name: string
    firstName?: string
    lastName?: string
    avatar?: string
  }
}

interface Label {
  id: string
  name: string
  color: string
  projectId: string
}

interface SearchUser {
  id: string
  email: string
  name: string
  firstName?: string
  lastName?: string
  avatar?: string
}

interface ProjectSettingsProps {
  projectId: string
  projectTitle: string
}

export function ProjectSettings({ projectId, projectTitle }: ProjectSettingsProps) {
  const [activeTab, setActiveTab] = useState("members")
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [labels, setLabels] = useState<Label[]>([])
  const [projectData, setProjectData] = useState<ProjectData>({ id: projectId, title: projectTitle })
  const [loading, setLoading] = useState(false)
  const [imageLoading, setImageLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [searching, setSearching] = useState(false)
  const [newLabelName, setNewLabelName] = useState("")
  const [newLabelColor, setNewLabelColor] = useState("#3b82f6")
  const [showImagePreview, setShowImagePreview] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadSettings()
  }, [projectId])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const [projectRes, membersRes, labelsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/members`),
        fetch(`/api/projects/${projectId}/labels`),
      ])

      if (projectRes.ok) {
        const data = await projectRes.json()
        setProjectData(data)
      }

      if (membersRes.ok) {
        setMembers(await membersRes.json())
      }

      if (labelsRes.ok) {
        setLabels(await labelsRes.json())
      }
    } catch (error) {
      console.error("Error loading project settings:", error)
      toast({
        title: "Error",
        description: "Failed to load project settings",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSearchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      const res = await fetch(
        `/api/users/search?q=${encodeURIComponent(query)}&projectId=${projectId}`
      )

      if (res.ok) {
        setSearchResults(await res.json())
      }
    } catch (error) {
      console.error("Error searching users:", error)
    } finally {
      setSearching(false)
    }
  }

  const handleAddMember = async (userId: string, userName: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: "member" }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to add member")
      }

      const newMember = await res.json()
      setMembers([...members, newMember])
      setSearchQuery("")
      setSearchResults([])

      toast({
        title: "Success",
        description: `${userName} added to project`,
      })
    } catch (error) {
      console.error("Error adding member:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add member",
        variant: "destructive",
      })
    }
  }

  const handleRemoveMember = async (userId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/members/${userId}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Failed to remove member")

      setMembers(members.filter((m) => m.userId !== userId))

      toast({
        title: "Success",
        description: "Member removed from project",
      })
    } catch (error) {
      console.error("Error removing member:", error)
      toast({
        title: "Error",
        description: "Failed to remove member",
        variant: "destructive",
      })
    }
  }

  const handleAddLabel = async () => {
    if (!newLabelName) {
      toast({
        title: "Error",
        description: "Label name is required",
        variant: "destructive",
      })
      return
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/labels`, {
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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "Please select an image file",
        variant: "destructive",
      })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image must be less than 5MB",
        variant: "destructive",
      })
      return
    }

    setImageLoading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch(`/api/projects/${projectId}/image`, {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to upload image")
      }

      const data = await res.json()
      setProjectData(data)

      toast({
        title: "Success",
        description: "Image uploaded successfully",
      })
    } catch (error) {
      console.error("Error uploading image:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive",
      })
    } finally {
      setImageLoading(false)
    }
  }

  const handleDeleteImage = async () => {
    setImageLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/image`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Failed to delete image")

      const data = await res.json()
      setProjectData(data)

      toast({
        title: "Success",
        description: "Image deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting image:", error)
      toast({
        title: "Error",
        description: "Failed to delete image",
        variant: "destructive",
      })
    } finally {
      setImageLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Project Settings</CardTitle>
        <CardDescription>{projectTitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="labels">Labels</TabsTrigger>
            <TabsTrigger value="image">Image</TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-4 mt-6">
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Member to Project</DialogTitle>
                  <DialogDescription>
                    Search for users to add to {projectTitle}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="search-users">Search Users</Label>
                    <Input
                      id="search-users"
                      placeholder="Search by email or name..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value)
                        handleSearchUsers(e.target.value)
                      }}
                    />
                  </div>

                  {searching && (
                    <div className="flex justify-center py-4">
                      <Spinner />
                    </div>
                  )}

                  {searchResults.length > 0 && (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {searchResults.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            {user.avatar && (
                              <img
                                src={user.avatar}
                                alt={user.name}
                                className="w-8 h-8 rounded-full"
                              />
                            )}
                            <div>
                              <p className="font-medium">{user.name}</p>
                              <p className="text-xs text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleAddMember(user.id, user.name)}
                          >
                            Add
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchQuery && !searching && searchResults.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No users found
                    </p>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <div className="space-y-2">
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No members added yet</p>
              ) : (
                members.map((member) => (
                  <div
                    key={member.userId}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {member.user.avatar && (
                        <img
                          src={member.user.avatar}
                          alt={member.user.name}
                          className="w-8 h-8 rounded-full"
                        />
                      )}
                      <div>
                        <p className="font-medium">{member.user.name}</p>
                        <p className="text-xs text-muted-foreground">{member.user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {member.role}
                      </span>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogTitle>Remove Member</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove {member.user.name} from this
                            project?
                          </AlertDialogDescription>
                          <div className="flex justify-end gap-2">
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemoveMember(member.userId)}
                              className="bg-red-500 hover:bg-red-600"
                            >
                              Remove
                            </AlertDialogAction>
                          </div>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="labels" className="space-y-4 mt-6">
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Label
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Label</DialogTitle>
                  <DialogDescription>Add a new label for organizing cards</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="label-name">Label Name</Label>
                    <Input
                      id="label-name"
                      placeholder="e.g., Bug, Feature, Documentation"
                      value={newLabelName}
                      onChange={(e) => setNewLabelName(e.target.value)}
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
                      <Input
                        value={newLabelColor}
                        onChange={(e) => setNewLabelColor(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button onClick={handleAddLabel} className="w-full">
                    Create Label
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <div className="space-y-2">
              {labels.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No labels created yet</p>
              ) : (
                labels.map((label) => (
                  <div
                    key={label.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
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
                          Are you sure you want to delete this label? This action cannot be
                          undone.
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
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="image" className="space-y-4 mt-6">
            <div className="space-y-4">
              {projectData.imageUrl ? (
                <div className="space-y-4">
                  <div className="relative border rounded-lg overflow-hidden bg-muted">
                    <img 
                      src={projectData.imageUrl} 
                      alt={projectData.title}
                      className="w-full h-64 object-cover"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Project Image</DialogTitle>
                        </DialogHeader>
                        <img 
                          src={projectData.imageUrl} 
                          alt={projectData.title}
                          className="w-full h-auto"
                        />
                      </DialogContent>
                    </Dialog>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogTitle>Delete Image</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete the project image? This action cannot be undone.
                        </AlertDialogDescription>
                        <div className="flex justify-end gap-2">
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteImage}
                            className="bg-red-500 hover:bg-red-600"
                            disabled={imageLoading}
                          >
                            {imageLoading ? "Deleting..." : "Delete"}
                          </AlertDialogAction>
                        </div>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  <div className="border-t pt-4">
                    <Label htmlFor="new-image">Replace Image</Label>
                    <div className="mt-2">
                      <input
                        id="new-image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={imageLoading}
                        className="hidden"
                      />
                      <Button
                        asChild
                        variant="outline"
                        disabled={imageLoading}
                        className="w-full"
                      >
                        <label className="cursor-pointer">
                          <Upload className="w-4 h-4 mr-2" />
                          {imageLoading ? "Uploading..." : "Choose Image"}
                        </label>
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg">
                  <Upload className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-sm font-medium text-muted-foreground mb-4">
                    No image uploaded yet
                  </p>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={imageLoading}
                    className="hidden"
                  />
                  <Button
                    asChild
                    disabled={imageLoading}
                  >
                    <label className="cursor-pointer">
                      <Upload className="w-4 h-4 mr-2" />
                      {imageLoading ? "Uploading..." : "Upload Image"}
                    </label>
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Max 5MB, supported formats: JPG, PNG, GIF, WebP
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}