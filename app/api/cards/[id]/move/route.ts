import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function PATCH(
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
    const { listId, position } = body

    if (!listId || position === undefined) {
      return NextResponse.json({ error: "List ID and position are required" }, { status: 400 })
    }

    // Update the card's list and position
    const card = await prisma.card.update({
      where: { id: params.id },
      data: {
        listId,
        position,
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
      },
    })

    // Log activity
    await prisma.activity.create({
      data: {
        type: "CARD_MOVED",
        description: `moved card "${card.title}"`,
        userId: session.user.id,
        cardId: card.id,
        listId: card.listId,
      },
    })

    return NextResponse.json(card)
  } catch (error) {
    console.error("Error moving card:", error)
    return NextResponse.json({ error: "Failed to move card" }, { status: 500 })
  }
}