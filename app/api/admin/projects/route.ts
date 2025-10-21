import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only ADMIN and OWNER can view all projects
    if (session.user.role !== "ADMIN" && session.user.role !== "OWNER") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const projects = await prisma.project.findMany({
      include: {
        createdBy: {
          select: { id: true, username: true, firstName: true, lastName: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, username: true, firstName: true, lastName: true, avatar: true },
            },
          },
        },
        boards: true,
        labels: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(projects)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only ADMIN and OWNER can create projects for others
    if (session.user.role !== "ADMIN" && session.user.role !== "OWNER") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const body = await request.json()
    const { title, description, creatorId } = body

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    // Create project with specified creator or current user
    const project = await prisma.project.create({
      data: {
        title,
        description,
        createdById: creatorId || session.user.id,
      },
      include: {
        createdBy: {
          select: { id: true, username: true, firstName: true, lastName: true },
        },
      },
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}