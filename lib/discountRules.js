/**
 * UniCoach Discount Rules Center
 * Centralized logic for calculating base discounts based on user level and history.
 */

export function calcBaseDiscount(level, isFirstBooking = false) {
  // 1. 基於等級的階梯式折扣
  const lv = parseInt(level) || 1;
  let baseDiscount = 0;
  
  if (lv <= 1) baseDiscount = 0;
  else if (lv === 2) baseDiscount = 5;
  else if (lv === 3) baseDiscount = 10;
  else baseDiscount = 12;

  // 2. 首單優惠：固定 15% (根據用戶補充建議)
  if (isFirstBooking) return Math.max(15, baseDiscount);
  
  return baseDiscount;
}
