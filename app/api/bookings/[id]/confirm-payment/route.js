import { getAdminSupabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import {
  buildConfirmPaymentUpdate,
  buildExpiredPendingPaymentUpdate,
  getPendingPaymentExpirationState,
} from "@/lib/bookingWorkflow";

export async function POST(request, { params }) {
  try {
    const auth = await requireAuth(["admin"]);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { id } = await params;
    const adminSupabase = getAdminSupabase();

    const { data: booking, error: bookingError } = await adminSupabase
      .from("bookings")
      .select(`
        id, status, payment_status, payment_expires_at, payment_reference, user_id,
        users!bookings_user_id_fkey ( referred_by )
      `)
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

    const { error: updateError } = await adminSupabase
      .from("bookings")
      .update(buildConfirmPaymentUpdate())
      .eq("id", id);

    if (updateError) throw updateError;

    try {
      await adminSupabase.from("audit_logs").insert([{
        actor_id: auth.user.id,
        actor_role: "admin",
        action: "CONFIRM_BOOKING_PAYMENT",
        target_id: id,
        details: "Confirmed pending_payment booking as scheduled and marked payment paid",
      }]);
    } catch (auditError) {
      console.warn("[CONFIRM PAYMENT AUDIT WARNING]", auditError);
    }

    const referredBy = booking.users?.referred_by;
    if (referredBy) {
      const { data: existingReward } = await adminSupabase
        .from("wallet_transactions")
        .select("id")
        .eq("user_id", referredBy)
        .eq("transaction_type", "referral_reward")
        .eq("reference_id", booking.user_id)
        .maybeSingle();

      if (!existingReward) {
        const REWARD_AMOUNT = 100;

        try {
          await adminSupabase.from("wallet_transactions").insert([{
            user_id: referredBy,
            amount: REWARD_AMOUNT,
            transaction_type: "referral_reward",
            reference_id: booking.user_id,
            description: "Referral reward after first successful payment",
          }]);

          const { data: referrerData } = await adminSupabase
            .from("users")
            .select("wallet_balance")
            .eq("id", referredBy)
            .single();

          if (referrerData) {
            await adminSupabase
              .from("users")
              .update({ wallet_balance: (referrerData.wallet_balance || 0) + REWARD_AMOUNT })
              .eq("id", referredBy);
          }
        } catch (rewardError) {
          console.warn("[REFERRAL REWARD WARNING]", rewardError);
        }
      }
    }

    return NextResponse.json({ success: true, newStatus: "scheduled" });
  } catch (error) {
    console.error("[CONFIRM PAYMENT ERROR]", error);
    return NextResponse.json({ error: "確認付款失敗" }, { status: 500 });
  }
}
