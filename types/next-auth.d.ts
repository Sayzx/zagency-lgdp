import "next-auth"

declare module "next-auth" {
  interface User {
    role?: string
    firstName?: string | null
    lastName?: string | null
    avatar?: string | null
  }

  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      firstName?: string | null
      lastName?: string | null
      avatar?: string | null
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: string
    firstName?: string | null
    lastName?: string | null
    avatar?: string | null
  }
}
