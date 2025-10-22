"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Tag,
  User,
  Clock,
  MessageSquare,
  Trash2,
  X,
  FileUp,
  Loader2,
  Eye,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import type { Priority, Attachment } from "@/lib/types";

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
  } = useStore();

  const [commentText, setCommentText] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(
    null
  );

  const currentProject = projects.find((p) => p.id === currentProjectId);
  const currentBoard = currentProject?.boards.find(
    (b) => b.id === currentBoardId
  );
  const card = currentBoard?.lists
    .flatMap((l) => l.cards)
    .find((c) => c.id === selectedCardId);

  if (!card) return null;

  const cardLabels =
    currentProject?.labels?.filter((l) => card.labels.includes(l.id)) || [];
  const assignedUsers =
    currentProject?.members?.filter((m) =>
      (card.assignedTo || []).includes(m.id)
    ) || [];
  const availableLabels = (currentProject?.labels ?? []).filter(
    (l) => !(card.labels || []).includes(l.id)
  );
  const availableUsers = (currentProject?.members ?? []).filter(
    (m) => !(card.assignedTo || []).includes(m.id)
  );

  const handleClose = () => {
    setSelectedCard(null);
    setIsEditingTitle(false);
    setIsEditingDescription(false);
  };

  const handleUpdateTitle = async () => {
    if (editedTitle.trim() && editedTitle !== card.title) {
      try {
        setIsUpdating(true);
        await updateCardAsync(card.id, { title: editedTitle });
        toast.success("Title updated");
      } catch (error) {
        toast.error("Failed to update title");
        console.error(error);
      } finally {
        setIsUpdating(false);
      }
    }
    setIsEditingTitle(false);
  };

  const handleUpdateDescription = async () => {
    if (editedDescription !== card.description) {
      try {
        setIsUpdating(true);
        await updateCardAsync(card.id, { description: editedDescription });
        toast.success("Description updated");
      } catch (error) {
        toast.error("Failed to update description");
        console.error(error);
      } finally {
        setIsUpdating(false);
      }
    }
    setIsEditingDescription(false);
  };

  const handleAddComment = async () => {
    if (commentText.trim()) {
      try {
        setIsUpdating(true);
        await addCommentAsync(card.id, commentText);
        setCommentText("");
        toast.success("Comment added");
      } catch (error) {
        toast.error("Failed to add comment");
        console.error(error);
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const handleAddLabel = async (labelId: string) => {
    try {
      setIsUpdating(true);
      const response = await fetch(`/api/cards/${card.id}/labels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labelId, add: true }),
      });
      if (!response.ok) throw new Error("Failed to add label");
      const updatedCard = await response.json();

      // Extract label IDs from the response
      const labelIds =
        updatedCard.labels?.map((l: any) => {
          if (typeof l === "string") return l;
          return l.id;
        }) || [];

      // Update local state
      updateCard(card.id, { labels: labelIds });
      toast.success("Label added");
    } catch (error) {
      toast.error("Failed to add label");
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveLabel = async (labelId: string) => {
    try {
      setIsUpdating(true);
      const response = await fetch(`/api/cards/${card.id}/labels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labelId, add: false }),
      });
      if (!response.ok) throw new Error("Failed to remove label");
      const updatedCard = await response.json();

      // Extract label IDs from the response
      const labelIds =
        updatedCard.labels?.map((l: any) => {
          if (typeof l === "string") return l;
          return l.id;
        }) || [];

      // Update local state
      updateCard(card.id, { labels: labelIds });
      toast.success("Label removed");
    } catch (error) {
      toast.error("Failed to remove label");
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddAssignee = async (userId: string) => {
    try {
      setIsUpdating(true);
      const response = await fetch(`/api/cards/${card.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, assign: true }),
      });
      if (!response.ok) throw new Error("Failed to assign member");
      const updatedCard = await response.json();

      // Extract user IDs from the response
      const userIds =
        updatedCard.assignedTo?.map((u: any) => {
          if (typeof u === "string") return u;
          return u.id;
        }) || [];

      // Update local state
      updateCard(card.id, { assignedTo: userIds });
      toast.success("Member assigned");
    } catch (error) {
      toast.error("Failed to assign member");
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveAssignee = async (userId: string) => {
    try {
      setIsUpdating(true);
      const response = await fetch(`/api/cards/${card.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, assign: false }),
      });
      if (!response.ok) throw new Error("Failed to remove member");
      const updatedCard = await response.json();

      // Extract user IDs from the response
      const userIds =
        updatedCard.assignedTo?.map((u: any) => {
          if (typeof u === "string") return u;
          return u.id;
        }) || [];

      // Update local state
      updateCard(card.id, { assignedTo: userIds });
      toast.success("Member removed");
    } catch (error) {
      toast.error("Failed to remove member");
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAssignToMe = async () => {
    if (!currentUser.id || card.assignedTo.includes(currentUser.id)) {
      return;
    }
    try {
      setIsUpdating(true);
      const response = await fetch(`/api/cards/${card.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, assign: true }),
      });
      if (!response.ok) throw new Error("Failed to assign card");
      const updatedCard = await response.json();

      // Extract user IDs from the response
      const userIds =
        updatedCard.assignedTo?.map((u: any) => {
          if (typeof u === "string") return u;
          return u.id;
        }) || [];

      // Update local state
      updateCard(card.id, { assignedTo: userIds });
      toast.success("Assigned to you");
    } catch (error) {
      toast.error("Failed to assign card");
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdatePriority = async (priority: Priority) => {
    try {
      setIsUpdating(true);
      await updateCardAsync(card.id, { priority });
      toast.success("Priority updated");
    } catch (error) {
      toast.error("Failed to update priority");
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateDueDate = async (date: string) => {
    try {
      setIsUpdating(true);
      await updateCardAsync(card.id, { dueDate: new Date(date) });
      toast.success("Due date updated");
    } catch (error) {
      toast.error("Failed to update due date");
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteCard = () => {
    if (confirm("Are you sure you want to delete this card?")) {
      deleteCard(card.id);
      handleClose();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploadingAttachment(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(`/api/cards/${card.id}/attachments`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to upload attachment");
        }

        const result = await response.json();
        // Update local card with new attachment
        const newAttachments = [...(card.attachments || []), result.attachment];
        updateCard(card.id, { attachments: newAttachments });
        toast.success(`${file.name} uploaded successfully`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload attachment"
      );
      console.error(error);
    } finally {
      setIsUploadingAttachment(false);
      // Reset file input
      if (e.target) {
        e.target.value = "";
      }
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!confirm("Are you sure you want to delete this attachment?")) return;

    setIsUploadingAttachment(true);
    try {
      const response = await fetch(`/api/cards/${card.id}/attachments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attachmentId }),
      });

      if (!response.ok) throw new Error("Failed to delete attachment");

      // Update local card by removing attachment
      const newAttachments = (card.attachments || []).filter(
        (a) => a.id !== attachmentId
      );
      updateCard(card.id, { attachments: newAttachments });
      toast.success("Attachment deleted");
    } catch (error) {
      toast.error("Failed to delete attachment");
      console.error(error);
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const priorityColors = {
    urgent: "bg-red-500",
    high: "bg-orange-500",
    medium: "bg-yellow-500",
    low: "bg-blue-500",
  };

  return (
    <Dialog open={!!selectedCardId} onOpenChange={handleClose}>
      <DialogContent className="max-w-[98vw] max-h-[90vh] w-[98vw] bg-zinc-900 border-zinc-800 text-white p-0 flex flex-col">
        <div className="flex h-full overflow-hidden">
          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col">
            <DialogHeader>
              {isEditingTitle ? (
                <Input
                  autoFocus
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleUpdateTitle();
                    if (e.key === "Escape") setIsEditingTitle(false);
                  }}
                  onBlur={handleUpdateTitle}
                  className="text-xl font-semibold bg-zinc-800 border-zinc-700"
                />
              ) : (
                <DialogTitle
                  onClick={() => {
                    setEditedTitle(card.title);
                    setIsEditingTitle(true);
                  }}
                  className="cursor-pointer text-xl hover:bg-zinc-800 rounded p-2 -ml-2"
                >
                  {card.title}
                </DialogTitle>
              )}
            </DialogHeader>

            {/* Labels */}
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="h-4 w-4 text-zinc-400" />
                <span className="text-sm font-medium text-zinc-400">
                  Labels
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {cardLabels.map((label) => (
                  <Badge
                    key={label.id}
                    style={{ backgroundColor: label.color }}
                    className="text-white border-0 cursor-pointer hover:opacity-80"
                    onClick={() => handleRemoveLabel(label.id)}
                  >
                    {label.name}
                    <X className="ml-1 h-3 w-3" />
                  </Badge>
                ))}
                {availableLabels.length > 0 && (
                  <Select onValueChange={handleAddLabel}>
                    <SelectTrigger className="w-32 h-7 bg-zinc-800 border-zinc-700 text-xs">
                      <SelectValue placeholder="Add label" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      {availableLabels.map((label) => (
                        <SelectItem
                          key={label.id}
                          value={label.id}
                          className="text-zinc-200"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded"
                              style={{ backgroundColor: label.color }}
                            />
                            {label.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-zinc-400">
                  Description
                </span>
              </div>
              {isEditingDescription ? (
                <div>
                  <Textarea
                    autoFocus
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    className="min-h-32 bg-zinc-800 border-zinc-700 text-white"
                    placeholder="Add a more detailed description..."
                  />
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      onClick={handleUpdateDescription}
                      className="bg-violet-600 hover:bg-violet-700"
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditingDescription(false)}
                      className="text-zinc-400"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => {
                    setEditedDescription(card.description || "");
                    setIsEditingDescription(true);
                  }}
                  className="min-h-20 p-3 bg-zinc-800 rounded cursor-pointer hover:bg-zinc-750 text-sm text-zinc-300"
                >
                  {card.description || "Add a more detailed description..."}
                </div>
              )}
            </div>

            {/* Comments */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="h-4 w-4 text-zinc-400" />
                <span className="text-sm font-medium text-zinc-400">
                  Comments ({(card.comments ?? []).length})
                </span>
              </div>

              {/* Add Comment */}
              <div className="flex gap-2 mb-4">
                <Avatar className="h-8 w-8 bg-violet-600">
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
                    className="bg-zinc-800 border-zinc-700 text-white"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.metaKey) {
                        handleAddComment();
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={handleAddComment}
                    disabled={!commentText.trim() || isUpdating}
                    className="mt-2 bg-violet-600 hover:bg-violet-700"
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      "Comment"
                    )}
                  </Button>
                </div>
              </div>

              {/* Comment List */}
              <div className="flex-1 min-h-0 mt-4 border-t border-zinc-800 pt-4">
                <ScrollArea className="h-full">
                  <div className="space-y-4 pr-4">
                    {(card.comments || []).map((comment) => {
                      const commentUser = currentProject?.members.find(
                        (m) => m.id === comment.userId
                      );
                      return (
                        <div key={comment.id} className="flex gap-2">
                          <Avatar className="h-8 w-8 bg-violet-600 flex-shrink-0">
                            <AvatarFallback className="bg-violet-600 text-white text-xs">
                              {commentUser?.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("") || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-white">
                                {commentUser?.name}
                              </span>
                              <span className="text-xs text-zinc-500">
                                {format(
                                  new Date(comment.createdAt),
                                  "MMM d 'at' h:mm a"
                                )}
                              </span>
                            </div>
                            <p className="text-sm text-zinc-300 bg-zinc-800 p-2 rounded break-words">
                              {comment.content}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            </div>

            {/* Attachments */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <FileUp className="h-4 w-4 text-zinc-400" />
                <span className="text-sm font-medium text-zinc-400">
                  Attachments (
                  {(card.attachments?.length || 0) + uploadedFiles.length})
                </span>
              </div>

              {/* File Upload */}
              <div className="mb-4">
                <label className="relative block">
                  <div className="border-2 border-dashed border-zinc-700 rounded-lg p-4 hover:border-zinc-600 cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed">
                    <div className="flex items-center justify-center gap-2 text-zinc-400">
                      {isUploadingAttachment ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm">Uploading...</span>
                        </>
                      ) : (
                        <>
                          <FileUp className="h-4 w-4" />
                          <span className="text-sm">
                            Click to upload files or images
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    disabled={isUploadingAttachment}
                    className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  />
                </label>
              </div>

              {/* Saved Attachments */}
              {card.attachments && card.attachments.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-zinc-500 mb-2">
                    Saved Attachments
                  </p>
                  <div className="space-y-2">
                    {card.attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between p-2 bg-zinc-800 rounded border border-zinc-700"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {attachment.type.startsWith("image/") ? (
                            <div className="h-8 w-8 rounded bg-zinc-700 flex items-center justify-center text-xs flex-shrink-0">
                              🖼️
                            </div>
                          ) : (
                            <div className="h-8 w-8 rounded bg-zinc-700 flex items-center justify-center text-xs flex-shrink-0">
                              📄
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">
                              {attachment.name}
                            </p>
                            <p className="text-xs text-zinc-400">
                              {(attachment.size / 1024).toFixed(2)} KB
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1 ml-2 flex-shrink-0">
                          {attachment.type.startsWith("image/") && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setPreviewAttachment(attachment)}
                              className="h-6 w-6 p-0 text-zinc-400 hover:text-violet-400"
                              title="Preview"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          )}
                          <a
                            href={attachment.url}
                            download={attachment.name}
                            className="h-6 w-6 p-0 text-zinc-400 hover:text-blue-400 inline-flex items-center justify-center"
                            title="Download"
                          >
                            <Download className="h-3 w-3" />
                          </a>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              handleDeleteAttachment(attachment.id)
                            }
                            disabled={isUploadingAttachment}
                            className="h-6 w-6 p-0 text-zinc-400 hover:text-red-400"
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Temporary Files (before upload) */}
              {uploadedFiles.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-500 mb-2">Uploading...</p>
                  <div className="space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-zinc-800 rounded opacity-60"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {file.type.startsWith("image/") ? (
                            <div className="h-8 w-8 rounded bg-zinc-700 flex items-center justify-center text-xs flex-shrink-0">
                              🖼️
                            </div>
                          ) : (
                            <div className="h-8 w-8 rounded bg-zinc-700 flex items-center justify-center text-xs flex-shrink-0">
                              📄
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">
                              {file.name}
                            </p>
                            <p className="text-xs text-zinc-400">
                              {(file.size / 1024).toFixed(2)} KB
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFile(index)}
                          disabled={isUploadingAttachment}
                          className="h-6 w-6 p-0 text-zinc-400 hover:text-red-400 ml-2 flex-shrink-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <ScrollArea className="w-96 border-l border-zinc-800 bg-zinc-900/50">
            <div className="space-y-4 p-4">
              {/* Assigned To */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-zinc-400" />
                    <span className="text-sm font-medium text-zinc-400">
                      Assigned To
                    </span>
                  </div>
                  {!card.assignedTo.includes(currentUser.id) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleAssignToMe}
                      disabled={isUpdating}
                      className="text-xs text-violet-400 hover:text-violet-300 h-auto p-0 py-1 px-2"
                    >
                      {isUpdating ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "Assign to me"
                      )}
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {assignedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-2 bg-zinc-800 rounded hover:bg-zinc-750"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6 bg-violet-600">
                          <AvatarFallback className="bg-violet-600 text-white text-xs">
                            {user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-white">{user.name}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveAssignee(user.id)}
                        className="h-6 w-6 p-0 text-zinc-400 hover:text-white"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  {availableUsers.length > 0 ? (
                    <Select onValueChange={handleAddAssignee}>
                      <SelectTrigger className="w-full bg-zinc-800 border-zinc-700 text-sm">
                        <SelectValue placeholder="Add member" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        {availableUsers.map((user) => {
                          const userName =
                            user.name ||
                            `${user.firstName || ""} ${
                              user.lastName || ""
                            }`.trim() ||
                            user.email ||
                            user.username ||
                            "Unknown";
                          return (
                            <SelectItem
                              key={user.id}
                              value={user.id}
                              className="text-zinc-200"
                            >
                              {userName}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="p-2 text-xs text-zinc-500 bg-zinc-800 rounded text-center">
                      {currentProject?.members?.length === 0
                        ? "No members in project"
                        : "All members assigned"}
                    </div>
                  )}
                </div>
              </div>

              {/* Priority */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-zinc-400" />
                  <span className="text-sm font-medium text-zinc-400">
                    Priority
                  </span>
                </div>
                <Select
                  value={(card.priority || "").toLowerCase()}
                  onValueChange={(value) =>
                    handleUpdatePriority(value.toUpperCase() as Priority)
                  }
                >
                  <SelectTrigger className="w-full bg-zinc-800 border-zinc-700">
                    <SelectValue placeholder="Set priority" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="urgent" className="text-zinc-200">
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-2 w-2 rounded-full ${priorityColors.urgent}`}
                        />
                        Urgent
                      </div>
                    </SelectItem>
                    <SelectItem value="high" className="text-zinc-200">
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-2 w-2 rounded-full ${priorityColors.high}`}
                        />
                        High
                      </div>
                    </SelectItem>
                    <SelectItem value="medium" className="text-zinc-200">
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-2 w-2 rounded-full ${priorityColors.medium}`}
                        />
                        Medium
                      </div>
                    </SelectItem>
                    <SelectItem value="low" className="text-zinc-200">
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-2 w-2 rounded-full ${priorityColors.low}`}
                        />
                        Low
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Due Date */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-zinc-400" />
                  <span className="text-sm font-medium text-zinc-400">
                    Due Date
                  </span>
                </div>
                <Input
                  type="date"
                  value={
                    card.dueDate
                      ? format(new Date(card.dueDate), "yyyy-MM-dd")
                      : ""
                  }
                  onChange={(e) => handleUpdateDueDate(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>

              {/* Delete Card */}
              <Button
                variant="destructive"
                onClick={handleDeleteCard}
                className="w-full bg-red-900/20 text-red-400 hover:bg-red-900/40"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Card
              </Button>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>

      {/* Image Preview Dialog */}
      <Dialog
        open={!!previewAttachment}
        onOpenChange={(open) => !open && setPreviewAttachment(null)}
      >
        <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800 p-4">
          <DialogHeader>
            <DialogTitle className="text-white">
              {previewAttachment?.name}
            </DialogTitle>
          </DialogHeader>
          {previewAttachment && (
            <div className="flex flex-col items-center justify-center">
              <img
                src={previewAttachment.url}
                alt={previewAttachment.name}
                className="max-h-96 max-w-full rounded-lg"
              />
              <p className="mt-4 text-xs text-zinc-400">
                {(previewAttachment.size / 1024).toFixed(2)} KB
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
