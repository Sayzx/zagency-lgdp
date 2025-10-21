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

    const { title, description, projectId } = await request.json()

    if (!title || !projectId) {
      return NextResponse.json({ error: "Title and projectId are required" }, { status: 400 })
    }

    // Check if user is a member of the project
    const projectMember = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: session.user.id,
          projectId,
        },
      },
    })

    if (!projectMember) {
      return NextResponse.json({ error: "You are not a member of this project" }, { status: 403 })
    }

    // Only OWNER and ADMIN can create boards
    if (projectMember.role !== "OWNER" && projectMember.role !== "ADMIN") {
      return NextResponse.json({ error: "Only owners and admins can create boards" }, { status: 403 })
    }

    const board = await prisma.board.create({
      data: {
        title,
        description,
        projectId,
      },
      include: {
        lists: {
          include: {
            cards: true,
          },
        },
      },
    })

    return NextResponse.json(board, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}