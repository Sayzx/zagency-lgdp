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
    const { labelId, add = true } = body

    if (!labelId) {
      return NextResponse.json({ error: "Label ID is required" }, { status: 400 })
    }

    let card

    if (add) {
      card = await prisma.card.update({
        where: { id: params.id },
        data: {
          labels: {
            connect: { id: labelId },
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
                  name: true,
                  email: true,
                  avatar: true,
                },
              },
            },
          },
          labels: true,
          assignedUsers: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
      })
    } else {
      card = await prisma.card.update({
        where: { id: params.id },
        data: {
          labels: {
            disconnect: { id: labelId },
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
                  name: true,
                  email: true,
                  avatar: true,
                },
              },
            },
          },
          labels: true,
          assignedUsers: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
      })
    }

    return NextResponse.json(card)
  } catch (error) {
    console.error("Error updating card labels:", error)
    return NextResponse.json({ error: "Failed to update card labels" }, { status: 500 })
  }
}