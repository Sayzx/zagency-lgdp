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

    const { content, cardId } = await request.json()

    if (!content || !cardId) {
      return NextResponse.json({ error: "Content and cardId are required" }, { status: 400 })
    }

    // Get card and check permissions
    const card = await prisma.card.findUnique({
      where: { id: cardId },
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

    // Create comment
    const comment = await prisma.comment.create({
      data: {
        content,
        cardId,
        userId: session.user.id,
      },
      include: {
        user: {
          select: { id: true, username: true, firstName: true, lastName: true, avatar: true },
        },
      },
    })

    // Transform response to match expected format
    const response = {
      id: comment.id,
      content: comment.content,
      cardId: comment.cardId,
      userId: comment.userId,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      user: comment.user,
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}