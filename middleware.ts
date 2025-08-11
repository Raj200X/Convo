import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Temporarily allow all routes; client-side checks handle auth and redirects
export async function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};

