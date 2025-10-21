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

    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")
    const projectId = searchParams.get("projectId")

    if (!query || !projectId) {
      return NextResponse.json({ error: "Query and projectId are required" }, { status: 400 })
    }

    // Get existing members
    const existingMembers = await prisma.projectMember.findMany({
      where: { projectId },
      select: { userId: true },
    })
    const memberIds = existingMembers.map((m) => m.userId)

    // Search users
    const users = await prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { email: { contains: query } },
              { username: { contains: query } },
              { firstName: { contains: query } },
              { lastName: { contains: query } },
            ],
          },
          {
            id: {
              notIn: memberIds,
            },
          },
        ],
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
      },
      take: 10,
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error("Error searching users:", error)
    return NextResponse.json({ error: "Failed to search users" }, { status: 500 })
  }
}