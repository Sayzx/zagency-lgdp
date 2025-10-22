import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, username: true, firstName: true, lastName: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, username: true, email: true, firstName: true, lastName: true, avatar: true },
            },
          },
        },
        boards: {
          include: {
            lists: {
              include: {
                cards: {
                  include: {
                    createdBy: {
                      select: { id: true, username: true, firstName: true, lastName: true },
                    },
                    assignedTo: {
                      select: { id: true, username: true, firstName: true, lastName: true, avatar: true },
                    },
                    comments: {
                      include: {
                        user: {
                          select: { id: true, username: true, firstName: true, lastName: true, avatar: true },
                        },
                      },
                    },
                    labels: {
                      select: { id: true, name: true, color: true },
                    },
                  },
                },
              },
            },
            activities: {
              include: {
                user: {
                  select: { id: true, username: true, firstName: true, lastName: true },
                },
              },
            },
          },
        },
        labels: true,
      },
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Check if user is a member of this project
    const isMember = project.members.some((m) => m.userId === session.user.id)
    if (!isMember) {
      return NextResponse.json({ error: "You are not a member of this project" }, { status: 403 })
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { title, description, specifications } = await request.json()

    // Check if user is OWNER or ADMIN of this project
    const projectMember = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: session.user.id,
          projectId: id,
        },
      },
    })

    if (!projectMember || (projectMember.role !== "OWNER" && projectMember.role !== "ADMIN")) {
      return NextResponse.json({ error: "You don't have permission to update this project" }, { status: 403 })
    }

    // Update the project
    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        title: title || undefined,
        description: description !== undefined ? description : undefined,
        specifications: specifications !== undefined ? specifications : undefined,
      },
      include: {
        createdBy: {
          select: { id: true, username: true, firstName: true, lastName: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, username: true, email: true, firstName: true, lastName: true, avatar: true },
            },
          },
        },
        boards: true,
        labels: true,
      },
    })

    return NextResponse.json(updatedProject)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}