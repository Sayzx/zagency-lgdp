import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { unlink } from "fs/promises"
import { join } from "path"

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string; mediaId: string }> }
) {
  try {
    const params = await props.params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check authorization
    const projectMember = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: session.user.id,
          projectId: params.id,
        },
      },
    })

    if (!projectMember || (projectMember.role !== "OWNER" && projectMember.role !== "ADMIN")) {
      return NextResponse.json({ error: "You don't have permission to delete files" }, { status: 403 })
    }

    // Get current project to access existing media
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      select: { media: true },
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Parse existing media and remove the entry
    const existingMedia = Array.isArray(project.media) ? project.media : []
    const mediaToDelete = existingMedia.find((m: any) => m.id === params.mediaId)
    
    if (!mediaToDelete) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 })
    }

    const updatedMedia = existingMedia.filter((m: any) => m.id !== params.mediaId)

    // Try to delete the file from disk
    try {
      const filePath = join(process.cwd(), "public", mediaToDelete.url.replace(/^\//, ""))
      await unlink(filePath)
    } catch (error) {
      console.error("Error deleting file from disk:", error)
      // Continue even if file deletion fails
    }

    // Update project
    await prisma.project.update({
      where: { id: params.id },
      data: {
        media: updatedMedia,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting media:", error)
    return NextResponse.json({ error: "Failed to delete media" }, { status: 500 })
  }
}