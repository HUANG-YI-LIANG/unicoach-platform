export function buildDefaultPlans(coachId, basePrice = 1000) {
  const price = Number(basePrice || 1000);

  return [
    {
      id: `default-${coachId}-60`,
      coach_id: coachId,
      title: '一般單堂課',
      description: '適合首次體驗與一般課程安排',
      duration_minutes: 60,
      price,
      is_active: true,
      is_default: true,
    },
    {
      id: `default-${coachId}-90`,
      coach_id: coachId,
      title: '進階單堂課',
      description: '適合需要更完整練習時間的學員',
      duration_minutes: 90,
      price: Math.round(price * 1.45),
      is_active: true,
      is_default: false,
    },
    {
      id: `default-${coachId}-120`,
      coach_id: coachId,
      title: '加長單堂課',
      description: '適合密集訓練或完整主題課程',
      duration_minutes: 120,
      price: Math.round(price * 1.9),
      is_active: true,
      is_default: false,
    },
  ];
}

export function normalizePlan(plan) {
  if (!plan) return null;

  return {
    ...plan,
    duration_minutes: Number(plan.duration_minutes || 60),
    price: Number(plan.price || 0),
    is_active: plan.is_active !== false,
    is_default: Boolean(plan.is_default),
  };
}

export function pickDefaultPlanById(coachId, basePrice, planId) {
  const defaults = buildDefaultPlans(coachId, basePrice);
  return defaults.find((plan) => plan.id === planId) || defaults[0];
}
