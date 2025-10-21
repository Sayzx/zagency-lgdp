import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { userId, assign = true } = body

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    let card

    if (assign) {
      card = await prisma.card.update({
        where: { id: params.id },
        data: {
          assignedTo: {
            connect: { id: userId },
          },
        },
        include: {
          comments: {
            select: {
              id: true,
              content: true,
              userId: true,
              createdAt: true,
              updatedAt: true,
              user: {
                select: {
                  id: true,
                  username: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                },
              },
            },
          },
          labels: true,
          assignedTo: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
      })
    } else {
      card = await prisma.card.update({
        where: { id: params.id },
        data: {
          assignedTo: {
            disconnect: { id: userId },
          },
        },
        include: {
          comments: {
            select: {
              id: true,
              content: true,
              userId: true,
              createdAt: true,
              updatedAt: true,
              user: {
                select: {
                  id: true,
                  username: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                },
              },
            },
          },
          labels: true,
          assignedTo: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
      })
    }

    return NextResponse.json(card)
  } catch (error) {
    console.error("Error updating card assignment:", error)
    return NextResponse.json({ error: "Failed to update card assignment" }, { status: 500 })
  }
}