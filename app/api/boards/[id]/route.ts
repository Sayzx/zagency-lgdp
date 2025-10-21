import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const boardId = id
    const body = await request.json()
    const { title, description } = body

    // Get board and check permissions
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: { project: true },
    })

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 })
    }

    // Check if user is ADMIN or OWNER of project
    const member = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: session.user.id,
          projectId: board.projectId,
        },
      },
    })

    if (!member || (member.role !== "ADMIN" && member.role !== "OWNER")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const updatedBoard = await prisma.board.update({
      where: { id: boardId },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
      },
    })

    return NextResponse.json(updatedBoard)
  } catch (error) {
    console.error("Error updating board:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const boardId = params.id

    // Get board and check permissions
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: { project: true },
    })

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 })
    }

    // Check if user is ADMIN or OWNER of project
    const member = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: session.user.id,
          projectId: board.projectId,
        },
      },
    })

    if (!member || (member.role !== "ADMIN" && member.role !== "OWNER")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Delete all lists and cards in this board first
    const lists = await prisma.list.findMany({
      where: { boardId },
    })

    for (const list of lists) {
      await prisma.card.deleteMany({
        where: { listId: list.id },
      })
    }

    await prisma.list.deleteMany({
      where: { boardId },
    })

    // Delete the board
    await prisma.board.delete({
      where: { id: boardId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting board:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}