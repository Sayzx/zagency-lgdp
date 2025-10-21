import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const projects = await prisma.project.findMany({
      where: {
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
      include: {
        boards: {
          include: {
            lists: {
              include: {
                cards: {
                  include: {
                    assignedTo: {
                      select: {
                        id: true,
                        email: true,
                        username: true,
                        firstName: true,
                        lastName: true,
                        avatar: true,
                      },
                    },
                    labels: {
                      select: {
                        id: true,
                        name: true,
                        color: true,
                      },
                    },
                    comments: {
                      include: {
                        user: {
                          select: {
                            id: true,
                            email: true,
                            username: true,
                            firstName: true,
                            lastName: true,
                            avatar: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
        labels: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Transform data for consistency
    const transformedProjects = projects.map((project: any) => {
      // Transform members
      const members = project.members.map((member: any) => ({
        id: member.user.id,
        email: member.user.email,
        username: member.user.username,
        firstName: member.user.firstName,
        lastName: member.user.lastName,
        avatar: member.user.avatar,
        role: member.role,
        name: `${member.user.firstName || ""} ${member.user.lastName || ""}`.trim() || member.user.username || member.user.email,
      }))

      // Transform boards and cards
      const boards = project.boards.map((board: any) => ({
        ...board,
        lists: board.lists.map((list: any) => ({
          ...list,
          cards: list.cards.map((card: any) => ({
            ...card,
            assignedTo: card.assignedTo.map((user: any) => ({
              ...user,
              name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username || user.email,
            })),
          })),
        })),
      }))

      return {
        ...project,
        members,
        boards,
      }
    })

    return NextResponse.json(transformedProjects)
  } catch (error) {
    console.error("Error fetching projects:", error)
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { title, description } = body

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    const project = await prisma.project.create({
      data: {
        title,
        description,
        createdById: session.user.id,
        members: {
          create: {
            userId: session.user.id,
            role: "OWNER",
          },
        },
      },
      include: {
        boards: true,
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
        labels: true,
      },
    })

    // Transform members format
    const transformedProject = {
      ...project,
      members: project.members.map((member: any) => ({
        id: member.user.id,
        email: member.user.email,
        username: member.user.username,
        firstName: member.user.firstName,
        lastName: member.user.lastName,
        avatar: member.user.avatar,
        role: member.role,
        name: `${member.user.firstName || ""} ${member.user.lastName || ""}`.trim() || member.user.username || member.user.email,
      })),
    }

    return NextResponse.json(transformedProject)
  } catch (error) {
    console.error("Error creating project:", error)
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 })
  }
}