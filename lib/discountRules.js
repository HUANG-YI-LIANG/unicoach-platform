/**
 * UniCoach Discount Rules Center
 * Centralized logic for calculating base discounts based on user level and history.
 */

export function calcBaseDiscount(calculatedBaseDiscount = 0, isFirstBooking = false) {
  // 首單優惠：固定 15% (根據用戶補充建議)
  // 若現有的 calculatedBaseDiscount 已經超過 15% 則保留較高的折扣
  if (isFirstBooking) return Math.max(15, calculatedBaseDiscount);
  
  return calculatedBaseDiscount;
}
