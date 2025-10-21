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

    const { title, boardId, position } = await request.json()

    if (!title || !boardId) {
      return NextResponse.json({ error: "Title and boardId are required" }, { status: 400 })
    }

    // Check if user is a member of the project (through the board)
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: { project: true },
    })

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 })
    }

    const projectMember = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: session.user.id,
          projectId: board.projectId,
        },
      },
    })

    if (!projectMember) {
      return NextResponse.json({ error: "You are not a member of this project" }, { status: 403 })
    }

    // Get the max position for this board
    const maxPosition = await prisma.list.aggregate({
      where: { boardId },
      _max: { position: true },
    })

    const newPosition = position ?? ((maxPosition._max.position ?? -1) + 1)

    const list = await prisma.list.create({
      data: {
        title,
        boardId,
        position: newPosition,
      },
      include: {
        cards: true,
      },
    })

    return NextResponse.json(list, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}