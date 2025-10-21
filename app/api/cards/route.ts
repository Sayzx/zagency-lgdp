import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { title, description, listId, priority, dueDate } = await request.json()

    if (!title || !listId) {
      return NextResponse.json({ error: "Title and listId are required" }, { status: 400 })
    }

    // Check if user is a member of the project (through the list)
    const list = await prisma.list.findUnique({
      where: { id: listId },
      include: { board: { include: { project: true } } },
    })

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 })
    }

    const projectMember = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: session.user.id,
          projectId: list.board.projectId,
        },
      },
    })

    if (!projectMember) {
      return NextResponse.json({ error: "You are not a member of this project" }, { status: 403 })
    }

    // Get the max position for this list
    const maxPosition = await prisma.card.aggregate({
      where: { listId },
      _max: { position: true },
    })

    const newPosition = (maxPosition._max.position ?? -1) + 1

    const card = await prisma.card.create({
      data: {
        title,
        description,
        listId,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        position: newPosition,
        createdById: session.user.id,
      },
      include: {
        createdBy: {
          select: { id: true, username: true, firstName: true, lastName: true },
        },
        assignedTo: {
          select: { id: true, username: true, firstName: true, lastName: true, avatar: true },
        },
      },
    })

    return NextResponse.json(card, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}