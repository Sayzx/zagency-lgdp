import { NextResponse } from 'next/server';

export async function POST() {
    // Clear authentication cookies or session
    const response = NextResponse.json({ message: 'Logged out successfully' });
    response.cookies.set('authToken', '', { maxAge: 0 }); // Clear the auth token cookie
    return response;
}
