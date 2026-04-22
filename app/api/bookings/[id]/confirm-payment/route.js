import { getAdminSupabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(request, { params }) {
  try {
    const auth = await requireAuth(["admin"]);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { id } = await params;
    const adminSupabase = getAdminSupabase();

    const { data: booking, error: bookingError } = await adminSupabase
      .from("bookings")
      .select("id, status, payment_expires_at")
      .eq("id", id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "找不到該預約記錄" }, { status: 404 });
    }

    if (booking.status !== "pending_payment") {
      return NextResponse.json({ error: "只有待付款預約可以確認付款" }, { status: 400 });
    }

    if (booking.payment_expires_at) {
      const expiresAt = new Date(booking.payment_expires_at).getTime();
      if (Number.isFinite(expiresAt) && Date.now() > expiresAt) {
        return NextResponse.json({ error: "付款保留時間已過期，請重新建立預約" }, { status: 409 });
      }
    }

    const { error: updateError } = await adminSupabase
      .from("bookings")
      .update({
        status: "scheduled",
        payment_expires_at: null,
      })
      .eq("id", id);

    if (updateError) throw updateError;

    await adminSupabase.from("audit_logs").insert([{
      admin_id: auth.user.id,
      action: "CONFIRM_BOOKING_PAYMENT",
      target_id: id,
      details: "Confirmed pending_payment booking as scheduled",
    }]);

    return NextResponse.json({ success: true, newStatus: "scheduled" });
  } catch (error) {
    console.error("[CONFIRM PAYMENT ERROR]", error);
    return NextResponse.json({ error: "付款確認失敗" }, { status: 500 });
  }
}
