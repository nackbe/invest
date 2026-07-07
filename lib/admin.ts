import "server-only";
import { cookies } from "next/headers";

export function isAdmin(): boolean {
  return cookies().get("admin")?.value === process.env.ADMIN_PASSCODE;
}
