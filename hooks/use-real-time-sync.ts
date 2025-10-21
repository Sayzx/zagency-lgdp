"use client"

import { useEffect, useRef } from "react"
import { useStore } from "@/lib/store"

/**
 * Hook for real-time synchronization of project data
 * Polls the server for updates every 3 seconds while a project is active
 */
export function useRealTimeSync(enabled = true) {
  const { currentProjectId, refreshCurrentProject } = useStore()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!enabled || !currentProjectId) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Initial refresh
    refreshCurrentProject()

    // Set up polling
    intervalRef.current = setInterval(() => {
      refreshCurrentProject()
    }, 3000) // Refresh every 3 seconds

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [currentProjectId, enabled, refreshCurrentProject])
}