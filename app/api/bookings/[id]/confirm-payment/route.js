export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getAdminSupabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import {
  buildConfirmPaymentUpdate,
  buildExpiredPendingPaymentUpdate,
  getPendingPaymentExpirationState,
} from "@/lib/bookingWorkflow";
import { safeErrorDetails } from "@/lib/safeLogging";

export async function POST(request, { params }) {
  try {
    const auth = await requireAuth(["admin"]);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { id } = await params;
    const adminSupabase = getAdminSupabase();

    const { data: booking, error: bookingError } = await adminSupabase
      .from("bookings")
      .select('id, status, payment_status, payment_expires_at, payment_reference')
      .eq("id", id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "找不到此預約" }, { status: 404 });
    }

    if (booking.status !== "pending_payment") {
      return NextResponse.json({ error: "只有待付款預約可以確認付款" }, { status: 400 });
    }

    if (!booking.payment_reference) {
      return NextResponse.json({ error: "請先確認學員已提交付款回報" }, { status: 400 });
    }

    const expiration = getPendingPaymentExpirationState(booking);
    if (expiration.expired) {
      await adminSupabase
        .from("bookings")
        .update(buildExpiredPendingPaymentUpdate())
        .eq("id", id)
        .eq("status", "pending_payment");

      return NextResponse.json({ error: expiration.error }, { status: expiration.status });
    }

    const { data: updatedBooking, error: updateError } = await adminSupabase
      .from("bookings")
      .update(buildConfirmPaymentUpdate())
      .eq("id", id)
      .eq("status", "pending_payment")
      .eq("payment_reference", booking.payment_reference)
      .select("id")
      .maybeSingle();

    if (updateError) throw updateError;
    if (!updatedBooking) {
      return NextResponse.json({ error: "預約狀態或付款回報已變更，請重新整理後再試。" }, { status: 409 });
    }

    try {
      await adminSupabase.from("audit_logs").insert([{
        actor_id: auth.user.id,
        actor_role: "admin",
        action: "CONFIRM_BOOKING_PAYMENT",
        target_id: id,
        details: "Confirmed pending_payment booking as scheduled and marked payment paid",
      }]);
    } catch (auditError) {
      console.warn("[CONFIRM PAYMENT AUDIT WARNING]", safeErrorDetails(auditError));
    }

    return NextResponse.json({ success: true, newStatus: "scheduled" });
  } catch (error) {
    console.error("[CONFIRM PAYMENT ERROR]", safeErrorDetails(error));
    return NextResponse.json({ error: "確認付款失敗" }, { status: 500 });
  }
}
