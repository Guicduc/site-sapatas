import { assertAdminAccess } from "@/lib/admin-session";

export async function assertAdminRequest(request) {
  const bearer = String(request.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i)?.[1] || "";
  const token = request.headers.get("x-admin-token") || bearer;
  return assertAdminAccess(token);
}
