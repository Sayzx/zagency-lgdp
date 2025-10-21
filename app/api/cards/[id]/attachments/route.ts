import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

interface Attachment {
  id: string
  name: string
  url: string
  size: number
  type: string
  uploadedAt: string
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get card and check permissions
    const card = await prisma.card.findUnique({
      where: { id },
      include: { list: { include: { board: { include: { project: true } } } } },
    })

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 })
    }

    const projectMember = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: session.user.id,
          projectId: card.list.board.projectId,
        },
      },
    })

    if (!projectMember) {
      return NextResponse.json({ error: "You are not a member of this project" }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be less than 10MB" }, { status: 400 })
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "public", "uploads", "attachments")
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Generate filename
    const timestamp = Date.now()
    const filename = `${id}-${timestamp}-${file.name.replace(/\s+/g, "-")}`
    const filepath = join(uploadsDir, filename)
    const fileUrl = `/uploads/attachments/${filename}`

    // Save file
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filepath, buffer)

    // Create attachment object
    const attachment: Attachment = {
      id: `${timestamp}`,
      name: file.name,
      url: fileUrl,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
    }

    // Get existing attachments
    const existingAttachments = (card.attachments || []) as Attachment[]
    const updatedAttachments = [...existingAttachments, attachment]

    // Update card with new attachment
    await prisma.card.update({
      where: { id },
      data: {
        attachments: updatedAttachments,
      },
    })

    return NextResponse.json({ attachment })
  } catch (error) {
    console.error("Error uploading attachment:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { attachmentId } = await request.json()

    if (!attachmentId) {
      return NextResponse.json({ error: "Attachment ID is required" }, { status: 400 })
    }

    // Get card and check permissions
    const card = await prisma.card.findUnique({
      where: { id },
      include: { list: { include: { board: { include: { project: true } } } } },
    })

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 })
    }

    const projectMember = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: session.user.id,
          projectId: card.list.board.projectId,
        },
      },
    })

    if (!projectMember) {
      return NextResponse.json({ error: "You are not a member of this project" }, { status: 403 })
    }

    // Remove attachment from list
    const existingAttachments = (card.attachments || []) as Attachment[]
    const updatedAttachments = existingAttachments.filter((a) => a.id !== attachmentId)

    // Update card
    const updatedCard = await prisma.card.update({
      where: { id },
      data: {
        attachments: updatedAttachments,
      },
      include: {
        createdBy: {
          select: { id: true, username: true, firstName: true, lastName: true },
        },
        assignedTo: {
          select: { id: true, username: true, firstName: true, lastName: true, avatar: true },
        },
        labels: {
          select: { id: true, name: true, color: true },
        },
      },
    })

    return NextResponse.json(updatedCard)
  } catch (error) {
    console.error("Error deleting attachment:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}