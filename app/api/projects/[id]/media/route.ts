import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { randomUUID } from "crypto"

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
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

    if (!projectMember || (projectMember.role !== "OWNER" && projectMember.role !== "ADMIN" && projectMember.role !== "MEMBER")) {
      return NextResponse.json({ error: "You don't have permission to upload files" }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Get current project to access existing media
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      select: { media: true },
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "public", "uploads", "projects", params.id)
    try {
      await mkdir(uploadsDir, { recursive: true })
    } catch (error) {
      console.error("Error creating directory:", error)
    }

    // Generate unique filename
    const fileId = randomUUID()
    const fileExtension = file.name.split(".").pop()
    const filename = `${fileId}.${fileExtension}`
    const filePath = join(uploadsDir, filename)

    // Write file to disk
    const buffer = await file.arrayBuffer()
    await writeFile(filePath, Buffer.from(buffer))

    // Create media entry
    const mediaEntry = {
      id: fileId,
      name: file.name,
      url: `/uploads/projects/${params.id}/${filename}`,
      type: file.type,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    }

    // Parse existing media and add new entry
    const existingMedia = Array.isArray(project.media) ? project.media : []
    const updatedMedia = [...existingMedia, mediaEntry]

    // Update project with new media
    await prisma.project.update({
      where: { id: params.id },
      data: {
        media: updatedMedia,
      },
    })

    return NextResponse.json(mediaEntry, { status: 201 })
  } catch (error) {
    console.error("Error uploading file:", error)
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
  }
}