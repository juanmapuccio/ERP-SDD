import { cookies } from "next/headers";

const CUIT_COOKIE = "erp_active_cuit";

const cookieOptions = {
  httpOnly: false, // Let client components read it if needed
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function setActiveCuitCookie(cuit: string) {
  const store = await cookies();
  store.set(CUIT_COOKIE, cuit, { ...cookieOptions, maxAge: 60 * 60 * 24 * 365 }); // 1 year
}

export async function clearActiveCuitCookie() {
  const store = await cookies();
  store.delete(CUIT_COOKIE);
}

export async function getActiveCuitCookie() {
  const store = await cookies();
  return store.get(CUIT_COOKIE)?.value ?? null;
}
