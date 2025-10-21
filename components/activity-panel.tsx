"use client"

import { useStore } from "@/lib/store"
import { useRealTimeSync } from "@/hooks/use-real-time-sync"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatDistanceToNow } from "date-fns"
import { ActivityIcon } from "lucide-react"

export function ActivityPanel() {
  const { activities, projects, currentProjectId } = useStore()

  // Enable real-time synchronization
  useRealTimeSync(true)

  const currentProject = projects.find((p) => p.id === currentProjectId)

  const activityIcons = {
    CARD_CREATED: "🆕",
    CARD_MOVED: "➡️",
    CARD_UPDATED: "✏️",
    COMMENT_ADDED: "💬",
    MEMBER_ADDED: "👤",
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Activity Feed</h2>
        <p className="text-sm text-zinc-500">Recent project activity and updates</p>
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="space-y-3">
          {activities.length === 0 ? (
            <Card className="bg-zinc-900 border-zinc-800 p-8 text-center">
              <ActivityIcon className="mx-auto h-12 w-12 text-zinc-600 mb-3" />
              <p className="text-zinc-500">No activity yet</p>
              <p className="text-sm text-zinc-600 mt-1">Activity will appear here as you work on your project</p>
            </Card>
          ) : (
            activities.map((activity) => {
              // Try to get user from activity.user first (from API), then fallback to member lookup
              let userName = "Unknown"
              
              if ((activity as any).user) {
                // Activity has user data from API
                const user = (activity as any).user
                userName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username || "Unknown"
              } else {
                // Fallback to member lookup
                const member = currentProject?.members.find((m) => m.user?.id === activity.userId)
                if (member?.user) {
                  userName = `${member.user.firstName || ""} ${member.user.lastName || ""}`.trim() || member.user.username || "Unknown"
                }
              }
              
              const initials = userName
                .split(" ")
                .filter(n => n.length > 0)
                .map((n) => n[0])
                .join("")
                .substring(0, 2)
                .toUpperCase() || "?"
              
              return (
                <Card key={activity.id} className="bg-zinc-900 border-zinc-800 p-4">
                  <div className="flex gap-3">
                    <Avatar className="h-10 w-10 bg-violet-600">
                      <AvatarFallback className="bg-violet-600 text-white text-sm">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm text-white">
                            <span className="font-semibold">{userName}</span>{" "}
                            <span className="text-zinc-400">{activity.description}</span>
                          </p>
                          <p className="text-xs text-zinc-500 mt-1">
                            {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        <span className="text-lg">{activityIcons[activity.type as keyof typeof activityIcons] || "📝"}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
