/**
 * UniCoach Discount Rules Center
 * Centralized logic for calculating base discounts based on user level and history.
 */

export function calcBaseDiscount(level, isFirstBooking = false) {
  // 1. 首單優惠：固定 15% (根據用戶補充建議)
  if (isFirstBooking) return 15;

  // 2. 基於等級的階梯式折扣
  const lv = parseInt(level) || 1;
  
  if (lv <= 1) return 5;
  if (lv === 2) return 8;
  if (lv === 3) return 10;
  
  // Level >= 4
  return 12;
}
