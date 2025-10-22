"use client"

import type React from "react"

import { useState } from "react"
import { useStore } from "@/lib/store"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Tag, User, Clock, MessageSquare, Trash2, X, FileUp, Loader2, Eye, Download } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import type { Priority, Attachment } from "@/lib/types"

export function CardDetailModal() {
  const {
    projects,
    currentProjectId,
    currentBoardId,
    selectedCardId,
    setSelectedCard,
    updateCard,
    updateCardAsync,
    deleteCard,
    addComment,
    addCommentAsync,
    currentUser,
  } = useStore()

  const [commentText, setCommentText] = useState("")
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState("")
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [editedDescription, setEditedDescription] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false)
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null)

  const currentProject = projects.find((p) => p.id === currentProjectId)
  const currentBoard = currentProject?.boards.find((b) => b.id === currentBoardId)
  const card = currentBoard?.lists.flatMap((l) => l.cards).find((c) => c.id === selectedCardId)

  if (!card) return null

  const cardLabels = currentProject?.labels?.filter((l) => card.labels.includes(l.id)) || []
  const assignedUsers = card.assignedTo || []
  const availableLabels = (currentProject?.labels ?? []).filter((l) => !(card.labels || []).includes(l.id))
  const availableUsers = (currentProject?.members ?? []).filter((m) => !assignedUsers.some((u) => u.id === m.id))

  const handleClose = () => {
    setSelectedCard(null)
    setIsEditingTitle(false)
    setIsEditingDescription(false)
  }

  const handleUpdateTitle = async () => {
    if (editedTitle.trim() && editedTitle !== card.title) {
      try {
        setIsUpdating(true)
        await updateCardAsync(card.id, { title: editedTitle })
        toast.success("Title updated")
      } catch (error) {
        toast.error("Failed to update title")
        console.error(error)
      } finally {
        setIsUpdating(false)
      }
    }
    setIsEditingTitle(false)
  }

  const handleUpdateDescription = async () => {
    if (editedDescription !== card.description) {
      try {
        setIsUpdating(true)
        await updateCardAsync(card.id, { description: editedDescription })
        toast.success("Description updated")
      } catch (error) {
        toast.error("Failed to update description")
        console.error(error)
      } finally {
        setIsUpdating(false)
      }
    }
    setIsEditingDescription(false)
  }

  const handleAddComment = async () => {
    if (commentText.trim()) {
      try {
        setIsUpdating(true)
        await addCommentAsync(card.id, commentText)
        setCommentText("")
        toast.success("Comment added")
      } catch (error) {
        toast.error("Failed to add comment")
        console.error(error)
      } finally {
        setIsUpdating(false)
      }
    }
  }

  const handleAddLabel = async (labelId: string) => {
    try {
      setIsUpdating(true)
      const response = await fetch(`/api/cards/${card.id}/labels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labelId, add: true }),
      })
      if (!response.ok) throw new Error("Failed to add label")
      const updatedCard = await response.json()

      const labelIds =
        updatedCard.labels?.map((l: any) => {
          if (typeof l === "string") return l
          return l.id
        }) || []

      updateCard(card.id, { labels: labelIds })
      toast.success("Label added")
    } catch (error) {
      toast.error("Failed to add label")
      console.error(error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRemoveLabel = async (labelId: string) => {
    try {
      setIsUpdating(true)
      const response = await fetch(`/api/cards/${card.id}/labels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labelId, add: false }),
      })
      if (!response.ok) throw new Error("Failed to remove label")
      const updatedCard = await response.json()

      const labelIds =
        updatedCard.labels?.map((l: any) => {
          if (typeof l === "string") return l
          return l.id
        }) || []

      updateCard(card.id, { labels: labelIds })
      toast.success("Label removed")
    } catch (error) {
      toast.error("Failed to remove label")
      console.error(error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleAddAssignee = async (userId: string) => {
    try {
      // Get the user object to add
      const userToAdd = currentProject?.members?.find((m) => m.id === userId)
      if (!userToAdd) {
        toast.error("User not found")
        return
      }

      // Optimistic update
      const currentAssignedTo = card.assignedTo || []
      const isAlreadyAssigned = currentAssignedTo.some((u) => u.id === userId)
      if (!isAlreadyAssigned) {
        updateCard(card.id, { assignedTo: [...currentAssignedTo, userToAdd] })
      }

      setIsUpdating(true)
      const response = await fetch(`/api/cards/${card.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, assign: true }),
      })
      if (!response.ok) {
        // Rollback on error
        updateCard(card.id, { assignedTo: currentAssignedTo })
        throw new Error("Failed to assign member")
      }
      const updatedCard = await response.json()
      updateCard(card.id, { assignedTo: updatedCard.assignedTo || [] })
      toast.success("Member assigned")
    } catch (error) {
      toast.error("Failed to assign member")
      console.error(error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRemoveAssignee = async (userId: string) => {
    try {
      // Optimistic update
      const currentAssignedTo = card.assignedTo || []
      const previousAssignedTo = currentAssignedTo
      updateCard(card.id, { assignedTo: currentAssignedTo.filter((u) => u.id !== userId) })

      setIsUpdating(true)
      const response = await fetch(`/api/cards/${card.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, assign: false }),
      })
      if (!response.ok) {
        // Rollback on error
        updateCard(card.id, { assignedTo: previousAssignedTo })
        throw new Error("Failed to remove member")
      }
      const updatedCard = await response.json()
      updateCard(card.id, { assignedTo: updatedCard.assignedTo || [] })
      toast.success("Member removed")
    } catch (error) {
      toast.error("Failed to remove member")
      console.error(error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleAssignToMe = async () => {
    if (!currentUser.id || card.assignedTo.some((u) => u.id === currentUser.id)) {
      return
    }
    try {
      setIsUpdating(true)
      const response = await fetch(`/api/cards/${card.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, assign: true }),
      })
      if (!response.ok) throw new Error("Failed to assign card")
      const updatedCard = await response.json()
      updateCard(card.id, { assignedTo: updatedCard.assignedTo || [] })
      toast.success("Assigned to you")
    } catch (error) {
      toast.error("Failed to assign card")
      console.error(error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleUpdatePriority = async (priority: Priority) => {
    try {
      setIsUpdating(true)
      // Optimistic update for instant feedback
      const previousPriority = card.priority
      updateCard(card.id, { priority })
      
      // Then sync with server
      await updateCardAsync(card.id, { priority })
      toast.success("Priority updated")
    } catch (error) {
      // Rollback on error
      updateCard(card.id, { priority: previousPriority })
      toast.error("Failed to update priority")
      console.error(error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleUpdateDueDate = async (date: string) => {
    try {
      setIsUpdating(true)
      await updateCardAsync(card.id, { dueDate: new Date(date) })
      toast.success("Due date updated")
    } catch (error) {
      toast.error("Failed to update due date")
      console.error(error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteCard = () => {
    if (confirm("Are you sure you want to delete this card?")) {
      deleteCard(card.id)
      handleClose()
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setIsUploadingAttachment(true)
    try {
      for (const file of files) {
        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch(`/api/cards/${card.id}/attachments`, {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || "Failed to upload attachment")
        }

        const result = await response.json()
        const newAttachments = [...(card.attachments || []), result.attachment]
        updateCard(card.id, { attachments: newAttachments })
        toast.success(`${file.name} uploaded successfully`)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload attachment")
      console.error(error)
    } finally {
      setIsUploadingAttachment(false)
      if (e.target) {
        e.target.value = ""
      }
    }
  }

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!confirm("Are you sure you want to delete this attachment?")) return

    setIsUploadingAttachment(true)
    try {
      const response = await fetch(`/api/cards/${card.id}/attachments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attachmentId }),
      })

      if (!response.ok) throw new Error("Failed to delete attachment")

      const newAttachments = (card.attachments || []).filter((a) => a.id !== attachmentId)
      updateCard(card.id, { attachments: newAttachments })
      toast.success("Attachment deleted")
    } catch (error) {
      toast.error("Failed to delete attachment")
      console.error(error)
    } finally {
      setIsUploadingAttachment(false)
    }
  }

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const priorityColors = {
    urgent: "bg-red-500",
    high: "bg-orange-500",
    medium: "bg-yellow-500",
    low: "bg-blue-500",
  }

  return (
    <Dialog open={!!selectedCardId} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-7xl max-h-[95vh] bg-zinc-900 border-zinc-800 text-white p-0 flex flex-col">
        <DialogTitle className="sr-only">Card Details: {card?.title}</DialogTitle>
        <div className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-900 px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="flex items-start sm:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              {isEditingTitle ? (
                <Input
                  autoFocus
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleUpdateTitle()
                    if (e.key === "Escape") setIsEditingTitle(false)
                  }}
                  onBlur={handleUpdateTitle}
                  className="text-xl sm:text-2xl font-bold bg-zinc-800 border-zinc-700 text-white"
                />
              ) : (
                <h2
                  onClick={() => {
                    setEditedTitle(card.title)
                    setIsEditingTitle(true)
                  }}
                  className="cursor-pointer text-xl sm:text-2xl font-bold hover:text-violet-400 transition truncate"
                >
                  {card.title}
                </h2>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClose}
              className="text-zinc-400 hover:text-white flex-shrink-0"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto scrollbar-custom">
            <div className="p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8">
              <section className="bg-zinc-800/50 rounded-lg p-4 sm:p-6 border border-zinc-700">
                <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
                  <span className="text-violet-400">📝</span>
                  Description
                </h3>
                {isEditingDescription ? (
                  <div className="space-y-3">
                    <Textarea
                      autoFocus
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      className="min-h-[200px] bg-zinc-800 border-zinc-700 text-white resize-none"
                      placeholder="Add a detailed description..."
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleUpdateDescription} className="bg-violet-600 hover:bg-violet-700">
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsEditingDescription(false)}
                        className="text-zinc-400 hover:text-white"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => {
                      setEditedDescription(card.description || "")
                      setIsEditingDescription(true)
                    }}
                    className="min-h-[120px] p-4 bg-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-700 transition text-sm text-zinc-300 leading-relaxed"
                  >
                    {card.description || "Click to add a description..."}
                  </div>
                )}
              </section>

              <section className="bg-zinc-800/50 rounded-lg p-4 sm:p-6 border border-zinc-700">
                <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
                  <FileUp className="h-4 w-4 text-violet-400" />
                  Attachments ({(card.attachments?.length || 0) + uploadedFiles.length})
                </h3>

                <div className="mb-6">
                  <label className="relative block">
                    <div className="border-2 border-dashed border-zinc-700 rounded-lg p-6 sm:p-8 hover:border-violet-500 hover:bg-zinc-800/50 cursor-pointer transition-all duration-200">
                      <div className="flex flex-col items-center justify-center gap-3 text-zinc-400">
                        {isUploadingAttachment ? (
                          <>
                            <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
                            <span className="text-sm font-medium">Uploading...</span>
                          </>
                        ) : (
                          <>
                            <FileUp className="h-8 w-8" />
                            <div className="text-center">
                              <span className="text-sm font-medium block">Click to upload files</span>
                              <span className="text-xs text-zinc-500 mt-1 block">
                                Images, PDFs, documents up to 10MB
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      disabled={isUploadingAttachment}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                    />
                  </label>
                </div>

                {card.attachments && card.attachments.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    {card.attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg border border-zinc-700 hover:border-zinc-600 transition group"
                      >
                        <div className="flex-shrink-0">
                          {attachment.type.startsWith("image/") ? (
                            <div className="w-12 h-12 rounded bg-violet-500/10 flex items-center justify-center text-2xl">
                              🖼️
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded bg-blue-500/10 flex items-center justify-center text-2xl">
                              📄
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{attachment.name}</p>
                          <p className="text-xs text-zinc-400">{(attachment.size / 1024).toFixed(2)} KB</p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          {attachment.type.startsWith("image/") && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setPreviewAttachment(attachment)}
                              className="h-8 w-8 p-0 text-zinc-400 hover:text-violet-400"
                              title="Preview"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          <a
                            href={attachment.url}
                            download={attachment.name}
                            className="h-8 w-8 p-0 text-zinc-400 hover:text-blue-400 inline-flex items-center justify-center rounded hover:bg-zinc-700"
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteAttachment(attachment.id)}
                            disabled={isUploadingAttachment}
                            className="h-8 w-8 p-0 text-zinc-400 hover:text-red-400"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {uploadedFiles.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg opacity-60">
                        <div className="flex-shrink-0">
                          {file.type.startsWith("image/") ? (
                            <div className="w-12 h-12 rounded bg-violet-500/10 flex items-center justify-center text-2xl">
                              🖼️
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded bg-blue-500/10 flex items-center justify-center text-2xl">
                              📄
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{file.name}</p>
                          <p className="text-xs text-zinc-400">{(file.size / 1024).toFixed(2)} KB</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFile(index)}
                          disabled={isUploadingAttachment}
                          className="h-8 w-8 p-0 text-zinc-400 hover:text-red-400 flex-shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="bg-zinc-800/50 rounded-lg p-4 sm:p-6 border border-zinc-700">
                <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-violet-400" />
                  Comments ({(card.comments ?? []).length})
                </h3>

                <div className="flex gap-3 mb-6 pb-6 border-b border-zinc-700">
                  <Avatar className="h-9 w-9 bg-violet-600 flex-shrink-0">
                    <AvatarFallback className="bg-violet-600 text-white text-xs">
                      {currentUser.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Write a comment..."
                      className="min-h-[100px] bg-zinc-800 border-zinc-700 text-white text-sm resize-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && e.metaKey) {
                          handleAddComment()
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={handleAddComment}
                      disabled={!commentText.trim() || isUpdating}
                      className="mt-3 bg-violet-600 hover:bg-violet-700"
                    >
                      {isUpdating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        "Add Comment"
                      )}
                    </Button>
                  </div>
                </div>

                <ScrollArea className="max-h-[400px] scrollbar-custom">
                  <div className="space-y-4 pr-4">
                    {(card.comments || []).map((comment) => {
                      const commentUser = comment.user
                      const displayName =
                        `${commentUser?.firstName || ""} ${commentUser?.lastName || ""}`.trim() ||
                        commentUser?.username ||
                        commentUser?.email ||
                        "Unknown"
                      const initials = displayName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .substring(0, 2)
                        .toUpperCase()
                      return (
                        <div key={comment.id} className="flex gap-3">
                          <Avatar className="h-9 w-9 bg-violet-600 flex-shrink-0">
                            {commentUser?.avatar && <AvatarImage src={commentUser.avatar} alt={displayName} />}
                            <AvatarFallback className="bg-violet-600 text-white text-xs font-semibold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className="font-medium text-white text-sm">{displayName}</span>
                              <span className="text-xs text-zinc-500">
                                {format(new Date(comment.createdAt), "MMM d 'at' h:mm a")}
                              </span>
                            </div>
                            <p className="text-sm text-zinc-300 bg-zinc-800 p-3 rounded-lg leading-relaxed">
                              {comment.content}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              </section>
            </div>
          </div>

          <aside className="w-full lg:w-[380px] xl:w-[420px] border-t lg:border-t-0 lg:border-l border-zinc-800 bg-zinc-900/50">
            <ScrollArea className="h-full scrollbar-custom">
              <div className="p-4 sm:p-6 space-y-5">
                <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
                  <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
                    <Tag className="h-4 w-4 text-violet-400" />
                    Labels
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {cardLabels.map((label) => (
                      <Badge
                        key={label.id}
                        style={{ backgroundColor: label.color }}
                        className="text-white border-0 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => handleRemoveLabel(label.id)}
                      >
                        {label.name}
                        <X className="ml-1.5 h-3 w-3" />
                      </Badge>
                    ))}
                  </div>
                  {availableLabels.length > 0 && (
                    <Select onValueChange={handleAddLabel}>
                      <SelectTrigger className="w-full bg-zinc-800 border-zinc-700 text-sm h-10">
                        <SelectValue placeholder="Add label" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        {availableLabels.map((label) => (
                          <SelectItem key={label.id} value={label.id} className="text-zinc-200">
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded" style={{ backgroundColor: label.color }} />
                              {label.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                      <User className="h-4 w-4 text-violet-400" />
                      Assigned To
                    </h3>
                    {!assignedUsers.some((u) => u.id === currentUser.id) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleAssignToMe}
                        disabled={isUpdating}
                        className="text-xs text-violet-400 hover:text-violet-300 h-auto p-0 py-1 px-2"
                      >
                        {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Assign me"}
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {assignedUsers.map((user) => {
                      const displayName =
                        `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
                        user.username ||
                        user.email ||
                        "Unknown"
                      const initials = displayName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .substring(0, 2)
                        .toUpperCase()
                      return (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-2.5 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition group"
                        >
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-7 w-7 bg-violet-600">
                              {user.avatar && <AvatarImage src={user.avatar} alt={displayName} />}
                              <AvatarFallback className="bg-violet-600 text-white text-xs font-semibold">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-white">{displayName}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveAssignee(user.id)}
                            className="h-7 w-7 p-0 text-zinc-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )
                    })}
                    {availableUsers.length > 0 ? (
                      <Select onValueChange={handleAddAssignee}>
                        <SelectTrigger className="w-full bg-zinc-800 border-zinc-700 text-sm h-10">
                          <SelectValue placeholder="Add member" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800">
                          {availableUsers.map((user) => {
                            const userName =
                              `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
                              user.username ||
                              user.email ||
                              "Unknown"
                            return (
                              <SelectItem key={user.id} value={user.id} className="text-zinc-200">
                                {userName}
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="p-2.5 text-xs text-zinc-500 bg-zinc-800 rounded-lg text-center">
                        {currentProject?.members?.length === 0 ? "No members" : "All assigned"}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
                  <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-violet-400" />
                    Priority
                  </h3>
                  <Select
                    value={(card.priority || "").toLowerCase()}
                    onValueChange={(value) => handleUpdatePriority(value as Priority)}
                  >
                    <SelectTrigger className="w-full bg-zinc-800 border-zinc-700 text-sm h-10">
                      <SelectValue placeholder="Set priority" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      <SelectItem value="urgent" className="text-zinc-200">
                        <div className="flex items-center gap-2.5">
                          <div className={`h-2.5 w-2.5 rounded-full ${priorityColors.urgent}`} />
                          <span>Urgent</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="high" className="text-zinc-200">
                        <div className="flex items-center gap-2.5">
                          <div className={`h-2.5 w-2.5 rounded-full ${priorityColors.high}`} />
                          <span>High</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="medium" className="text-zinc-200">
                        <div className="flex items-center gap-2.5">
                          <div className={`h-2.5 w-2.5 rounded-full ${priorityColors.medium}`} />
                          <span>Medium</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="low" className="text-zinc-200">
                        <div className="flex items-center gap-2.5">
                          <div className={`h-2.5 w-2.5 rounded-full ${priorityColors.low}`} />
                          <span>Low</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
                  <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-violet-400" />
                    Due Date
                  </h3>
                  <Input
                    type="date"
                    value={card.dueDate ? format(new Date(card.dueDate), "yyyy-MM-dd") : ""}
                    onChange={(e) => handleUpdateDueDate(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white text-sm h-10"
                  />
                </div>

                <Button
                  variant="destructive"
                  onClick={handleDeleteCard}
                  className="w-full bg-red-900/20 text-red-400 hover:bg-red-900/40 border border-red-900/30 h-10"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Card
                </Button>
              </div>
            </ScrollArea>
          </aside>
        </div>
      </DialogContent>

      <Dialog open={!!previewAttachment} onOpenChange={(open) => !open && setPreviewAttachment(null)}>
        <DialogContent className="max-w-4xl bg-zinc-900 border-zinc-800 p-6">
          <DialogHeader>
            <DialogTitle className="text-white text-lg">{previewAttachment?.name}</DialogTitle>
          </DialogHeader>
          {previewAttachment && (
            <div className="flex flex-col items-center justify-center gap-4">
              <img
                src={previewAttachment.url || "/placeholder.svg"}
                alt={previewAttachment.name}
                className="max-h-[70vh] max-w-full rounded-lg border border-zinc-700"
              />
              <p className="text-sm text-zinc-400">{(previewAttachment.size / 1024).toFixed(2)} KB</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
export default CardDetailModal