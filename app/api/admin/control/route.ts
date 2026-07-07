import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { getServiceClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { code, action } = (await req.json()) as { code: string; action: "launch" | "reveal" | "end" };
  const db = getServiceClient();
  const { data: s } = await db.from("sessions").select("*").eq("code", code).single();
  if (!s) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (action === "reveal") {
    await db.from("sessions").update({ phase: "reveal" }).eq("id", s.id);
  } else if (action === "end") {
    await db.from("sessions").update({ phase: "ended", status: "ended" }).eq("id", s.id);
  } else {
    const { count } = await db.from("session_questions").select("*", { count: "exact", head: true }).eq("session_id", s.id);
    const next = s.current_index + 1;
    if (next >= (count ?? 0)) {
      await db.from("sessions").update({ phase: "ended", status: "ended" }).eq("id", s.id);
    } else {
      await db.from("sessions").update({
        current_index: next, phase: "question", status: "running", question_started_at: new Date().toISOString(),
      }).eq("id", s.id);
    }
  }
  return NextResponse.json({ ok: true });
}
