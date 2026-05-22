import { NextResponse } from "next/server";

import { clearAuthCookies } from "@/core/auth/auth-cookies";
import { getSupabaseServerClient } from "@/core/api/supabase";

export async function POST(request: Request) {
  const supabase = getSupabaseServerClient();

  try {
    await supabase.auth.signOut();
  } catch {
    // Clear local cookies even if the upstream sign-out call fails.
  }

  await clearAuthCookies();
  return NextResponse.redirect(new URL("/auth/sign-in", request.url));
}

