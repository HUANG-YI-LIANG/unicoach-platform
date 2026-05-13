import { normalizePlan } from './coachPlans.js';

const DEFAULT_PLAN_PREFIX = 'default-';

function isValidFormalRule(rule) {
  if (!rule || rule.is_active === false) {
    return false;
  }

  const weekday = Number(rule.weekday);
  return Number.isInteger(weekday)
    && weekday >= 0
    && weekday <= 6
    && Boolean(rule.start_time)
    && Boolean(rule.end_time)
    && String(rule.end_time).slice(0, 5) > String(rule.start_time).slice(0, 5);
}

export function isDefaultPlanId(planId) {
  return typeof planId === 'string' && planId.startsWith(DEFAULT_PLAN_PREFIX);
}

export function getFormalActivePlans(plans = []) {
  return (Array.isArray(plans) ? plans : [])
    .map(normalizePlan)
    .filter((plan) => plan && plan.is_active && !isDefaultPlanId(plan.id) && plan.price > 0 && plan.duration_minutes > 0);
}

export function getFormalActiveAvailabilityRules(rules = []) {
  return (Array.isArray(rules) ? rules : []).filter(isValidFormalRule);
}

export function getCoachSaleability({ coach, plans = [], availabilityRules = [] } = {}) {
  const reasons = [];

  if (coach?.approval_status !== 'approved') {
    reasons.push('coach_not_approved');
  }

  if (!getFormalActivePlans(plans).length) {
    reasons.push('missing_formal_plan');
  }

  if (!getFormalActiveAvailabilityRules(availabilityRules).length) {
    reasons.push('missing_formal_schedule');
  }

  return {
    canSell: reasons.length === 0,
    reasons,
  };
}

export function pickFormalPlanForBooking({ requestedPlanId, plans = [] } = {}) {
  if (!requestedPlanId || isDefaultPlanId(String(requestedPlanId))) {
    return { ok: false, status: 400, error: '請選擇教練已正式建立的課程方案' };
  }

  const plan = getFormalActivePlans(plans).find((item) => item.id === requestedPlanId);
  if (!plan) {
    return { ok: false, status: 400, error: '找不到可預約的教練方案' };
  }

  return { ok: true, plan };
}
