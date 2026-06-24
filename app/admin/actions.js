"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  ADMIN_COOKIE,
  canUseAdminToken,
  createAdminSessionToken,
  getAdminCookieOptions
} from "@/lib/admin-session";

function normalizeNextPath(value) {
  const path = String(value || "/admin/pedidos").trim();
  if (!path.startsWith("/admin")) return "/admin/pedidos";
  if (path.startsWith("//")) return "/admin/pedidos";
  return path;
}

export async function loginAdmin(formData) {
  const token = String(formData.get("token") || "").trim();
  const nextPath = normalizeNextPath(formData.get("next"));

  if (!canUseAdminToken(token)) {
    redirect(`/admin?error=invalid_token&next=${encodeURIComponent(nextPath)}`);
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, createAdminSessionToken(), getAdminCookieOptions());
  redirect(nextPath);
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, "", { ...getAdminCookieOptions(), maxAge: 0 });
  redirect("/admin");
}
