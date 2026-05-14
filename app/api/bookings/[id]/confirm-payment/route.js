export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getAdminSupabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { safeErrorDetails } from "@/lib/safeLogging";

export async function POST(request, { params }) {
  try {
    const auth = await requireAuth(["admin"]);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { id } = await params;
    const adminSupabase = getAdminSupabase();

    const { data, error } = await adminSupabase.rpc('confirm_booking_payment', {
      p_booking_id: id,
      p_actor_id: auth.user.id,
    });

    if (error) {
      console.error("[CONFIRM PAYMENT ERROR]", safeErrorDetails(error));
      return NextResponse.json({ error: "確認付款失敗" }, { status: 500 });
    }

    if (!data.ok) {
      return NextResponse.json({ error: data.error }, { status: data.status || 400 });
    }

    return NextResponse.json({ success: true, newStatus: data.newStatus });
  } catch (error) {
    console.error("[CONFIRM PAYMENT ERROR]", safeErrorDetails(error));
    return NextResponse.json({ error: "確認付款發生未預期錯誤" }, { status: 500 });
  }
}
