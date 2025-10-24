"use client"

import { useState, useEffect } from "react"
import { useStore } from "@/lib/store"
import { useRealTimeSync } from "@/hooks/use-real-time-sync"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { UserPlus, Crown, Shield, User, Eye, MoreVertical, Trash2, Loader2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "sonner"

type UserRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER"

interface Member {
  id: string
  userId: string
  role: UserRole
  user: {
    id: string
    firstName?: string
    lastName?: string
    email: string
    avatar?: string
  }
}

interface Project {
  id: string
  title: string
  members: Member[]
}

export function MembersPanel() {
  const { projects, currentProjectId, currentUser } = useStore()
  const [members, setMembers] = useState<Member[]>([])
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [memberEmail, setMemberEmail] = useState("")
  const [memberRole, setMemberRole] = useState<UserRole>("MEMBER")

  // Enable real-time synchronization
  useRealTimeSync(true)

  const currentProject = projects.find((p) => p.id === currentProjectId) as Project | undefined

  const currentRole = (currentUser?.role ?? "").toString().toUpperCase()
  const canManageMembers = currentRole === "OWNER" || currentRole === "ADMIN"

  const roleIcons: Record<UserRole, any> = {
    OWNER: Crown,
    ADMIN: Shield,
    MEMBER: User,
    VIEWER: Eye,
  }

  const roleColors = {
    OWNER: "bg-violet-600 text-white",
    ADMIN: "bg-blue-600 text-white",
    MEMBER: "bg-zinc-600 text-white",
    VIEWER: "bg-zinc-700 text-white",
  }

  const roleDescriptions = {
    OWNER: "Full access to all features and settings",
    ADMIN: "Can manage members and project settings",
    MEMBER: "Can create and edit cards",
    VIEWER: "Can only view cards and boards",
  }

  useEffect(() => {
    if (currentProject?.members) {
      setMembers(currentProject.members)
    }
  }, [currentProject])

  const handleAddMember = async () => {
    if (!memberEmail.trim()) {
      toast.error("Email is required")
      return
    }

    if (!currentProjectId) {
      toast.error("No project selected")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/projects/${currentProjectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail: memberEmail, role: memberRole }),
      })

      if (response.ok) {
        const newMember = await response.json()
        setMembers([...members, newMember])
        toast.success("Member added successfully")
        setMemberEmail("")
        setMemberRole("MEMBER")
        setIsAddingMember(false)
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

  const handleUpdateRole = async (memberId: string, userId: string, newRole: UserRole) => {
    if (!currentProjectId) {
      toast.error("No project selected")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/projects/${currentProjectId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      })

      if (response.ok) {
        setMembers(members.map(m => m.id === memberId ? { ...m, role: newRole } : m))
        toast.success("Member role updated successfully")
      } else {
        const data = await response.json()
        toast.error(data.error || "Failed to update member")
      }
    } catch (error) {
      toast.error("An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveMember = async (memberId: string, userId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/projects/${currentProjectId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })

      if (response.ok) {
        setMembers(members.filter(m => m.id !== memberId))
        toast.success("Member removed successfully")
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

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Team Members</h2>
          <p className="text-sm text-zinc-500">Manage your project team and permissions</p>
        </div>
        {canManageMembers && (
          <Dialog open={isAddingMember} onOpenChange={setIsAddingMember}>
            <DialogTrigger asChild>
              <Button className="bg-violet-600 text-white hover:bg-violet-700">
                <UserPlus className="mr-2 h-4 w-4" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
              <DialogHeader>
                <DialogTitle>Add Team Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-zinc-400">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    placeholder="member@example.com"
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="role" className="text-zinc-400">
                    Role
                  </Label>
                  <Select value={memberRole} onValueChange={(value) => setMemberRole(value as UserRole)}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      <SelectItem value="MEMBER" className="text-zinc-200">
                        Member
                      </SelectItem>
                      <SelectItem value="ADMIN" className="text-zinc-200">
                        Admin
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-xs text-zinc-500">{roleDescriptions[memberRole]}</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddMember} disabled={isLoading} className="flex-1 bg-violet-600 hover:bg-violet-700">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                    Add Member
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setIsAddingMember(false)}
                    className="flex-1 text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Role Legend */}
      <Card className="mb-6 bg-zinc-900 border-zinc-800 p-4">
        <h3 className="mb-3 text-sm font-semibold text-white">Role Permissions</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(["OWNER", "ADMIN", "MEMBER", "VIEWER"] as UserRole[]).map((role) => {
            const Icon = roleIcons[role]
            return (
              <div key={role} className="flex items-start gap-2">
                <div className={`mt-0.5 rounded p-1 ${roleColors[role]}`}>
                  <Icon className="h-3 w-3" />
                </div>
                <div>
                  <p className="text-sm font-medium capitalize text-white">{role}</p>
                  <p className="text-xs text-zinc-500">{roleDescriptions[role]}</p>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Members List */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => {
          const Icon = roleIcons[member.role] || User
          const isCurrentUser = member.user?.id === currentUser?.id
          const canModify = canManageMembers && !isCurrentUser && member.role !== "OWNER"
          const memberName = member.user ? `${member.user.firstName || ""} ${member.user.lastName || ""}`.trim() || "Unknown" : "Unknown"

          return (
            <Card key={member.id} className="bg-zinc-900 border-zinc-800 p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12 bg-violet-600">
                    <AvatarFallback className="bg-violet-600 text-white">
                      {memberName.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-white">{memberName}</h4>
                      {isCurrentUser && (
                        <Badge variant="outline" className="border-violet-600 text-violet-400 text-xs">
                          You
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-zinc-500">{member.user?.email || "No email available"}</p>
                    <div className="mt-2 flex items-center gap-1">
                      <div className={`rounded px-2 py-1 ${roleColors[member.role]}`}>
                        <div className="flex items-center gap-1">
                          <Icon className="h-3 w-3" />
                          <span className="text-xs font-medium capitalize">{member.role}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {canModify && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-zinc-400 hover:text-white">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                      <DropdownMenuItem
                        onClick={() => handleUpdateRole(member.id, member.user.id, "ADMIN")}
                        className="text-zinc-200 focus:bg-zinc-800 focus:text-white"
                      >
                        Make Admin
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleUpdateRole(member.id, member.user.id, "MEMBER")}
                        className="text-zinc-200 focus:bg-zinc-800 focus:text-white"
                      >
                        Make Member
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleUpdateRole(member.id, member.user.id, "VIEWER")}
                        className="text-zinc-200 focus:bg-zinc-800 focus:text-white"
                      >
                        Make Viewer
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleRemoveMember(member.id, member.user.id)}
                        className="text-red-400 focus:bg-zinc-800 focus:text-red-300"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
