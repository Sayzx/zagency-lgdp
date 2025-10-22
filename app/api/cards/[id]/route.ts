import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, priority, dueDate, listId, position, assignedTo, labels } = body

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

    // Update card
    const updatedCard = await prisma.card.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(priority !== undefined && { priority: priority?.toUpperCase() }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(listId !== undefined && { listId }),
        ...(position !== undefined && { position }),
        ...(assignedTo !== undefined && {
          assignedTo: {
            set: assignedTo.map((id: string) => ({ id })),
          },
        }),
        ...(labels !== undefined && {
          labels: {
            set: labels.map((id: string) => ({ id })),
          },
        }),
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
        comments: {
          include: {
            user: {
              select: { id: true, username: true, firstName: true, lastName: true, avatar: true },
            },
          },
        },
        list: {
          select: { boardId: true },
        },
      },
    })

    // Log activity
    await prisma.activity.create({
      data: {
        type: "CARD_UPDATED",
        description: `updated card "${updatedCard.title}"`,
        userId: session.user.id,
        cardId: updatedCard.id,
        listId: updatedCard.listId,
        boardId: updatedCard.list.boardId,
      },
    })

    return NextResponse.json(updatedCard)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
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

    // Store card info before deletion for activity log
    const cardTitle = card.title
    const boardId = card.list.board.id

    // Delete card
    await prisma.card.delete({
      where: { id },
    })

    // Log activity
    await prisma.activity.create({
      data: {
        type: "CARD_UPDATED",
        description: `deleted card "${cardTitle}"`,
        userId: session.user.id,
        cardId: id,
        listId: card.listId,
        boardId: boardId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}