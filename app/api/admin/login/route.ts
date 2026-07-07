import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { passcode } = await req.json();
  if (passcode !== process.env.ADMIN_PASSCODE) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin", process.env.ADMIN_PASSCODE!, { httpOnly: true, sameSite: "lax", path: "/" });
  return res;
}
