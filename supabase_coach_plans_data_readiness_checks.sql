-- Coach plan data readiness checks
-- Safe to run before salable-coach rollout validation.
-- This script is intentionally read-only. It only reports rows that need manual review.

WITH approved_coaches AS (
  SELECT
    c.user_id AS coach_id,
    u.name AS coach_name,
    c.approval_status,
    c.base_price,
    c.available_times,
    c.service_areas,
    c.location,
    c.university
  FROM public.coaches c
  JOIN public.users u ON u.id = c.user_id
  WHERE c.approval_status = 'approved'
),
active_plan_counts AS (
  SELECT
    coach_id,
    COUNT(*) AS active_plan_count,
    MIN(price) AS min_plan_price,
    MAX(price) AS max_plan_price
  FROM public.coach_plans
  WHERE is_active IS TRUE
  GROUP BY coach_id
),
active_rule_counts AS (
  SELECT
    coach_id,
    COUNT(*) AS active_rule_count
  FROM public.coach_availability_rules
  WHERE is_active IS TRUE
  GROUP BY coach_id
),
coach_saleability_readiness AS (
  SELECT
    ac.coach_id,
    ac.coach_name,
    ac.approval_status,
    ac.base_price,
    COALESCE(ap.active_plan_count, 0) AS active_plan_count,
    COALESCE(ar.active_rule_count, 0) AS active_rule_count,
    ap.min_plan_price,
    ap.max_plan_price,
    CASE WHEN ac.available_times IS NULL OR BTRIM(ac.available_times) = '' THEN false ELSE true END AS has_legacy_available_times,
    CASE
      WHEN COALESCE(ap.active_plan_count, 0) > 0
       AND COALESCE(ar.active_rule_count, 0) > 0
      THEN true
      ELSE false
    END AS can_be_formally_salable,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN COALESCE(ap.active_plan_count, 0) = 0 THEN 'missing_active_coach_plans' END,
      CASE WHEN COALESCE(ar.active_rule_count, 0) = 0 THEN 'missing_active_availability_rules' END,
      CASE WHEN ac.base_price IS NULL OR ac.base_price <= 0 THEN 'invalid_base_price' END
    ], NULL) AS readiness_gaps
  FROM approved_coaches ac
  LEFT JOIN active_plan_counts ap ON ap.coach_id = ac.coach_id
  LEFT JOIN active_rule_counts ar ON ar.coach_id = ac.coach_id
),
coach_plan_seed_candidates AS (
  SELECT
    coach_id,
    coach_name,
    base_price,
    '一般單堂課' AS suggested_title,
    60 AS suggested_duration_minutes,
    GREATEST(COALESCE(base_price, 1000), 100) AS suggested_price,
    'needs_human_approval_before_write' AS action_required
  FROM coach_saleability_readiness
  WHERE active_plan_count = 0
),
coach_availability_rule_seed_candidates AS (
  SELECT
    coach_id,
    coach_name,
    available_times,
    'legacy_available_times_requires_manual_translation' AS action_required
  FROM coach_saleability_readiness
  WHERE active_rule_count = 0
    AND has_legacy_available_times IS TRUE
),
coaches_missing_active_plans AS (
  SELECT *
  FROM coach_saleability_readiness
  WHERE active_plan_count = 0
),
coaches_missing_active_availability_rules AS (
  SELECT *
  FROM coach_saleability_readiness
  WHERE active_rule_count = 0
),
coach_saleability_readiness_summary AS (
  SELECT
    COUNT(*) AS approved_coach_count,
    COUNT(*) FILTER (WHERE can_be_formally_salable IS TRUE) AS formally_salable_coach_count,
    COUNT(*) FILTER (WHERE active_plan_count = 0) AS coaches_missing_active_plans_count,
    COUNT(*) FILTER (WHERE active_rule_count = 0) AS coaches_missing_active_availability_rules_count,
    COUNT(*) FILTER (WHERE active_rule_count = 0 AND has_legacy_available_times IS TRUE) AS coaches_with_legacy_times_needing_translation_count
  FROM coach_saleability_readiness
)
SELECT 'coach_saleability_readiness_summary' AS check_name, row_to_json(t) AS details
FROM coach_saleability_readiness_summary t
UNION ALL
SELECT 'coaches_missing_active_plans' AS check_name, row_to_json(t) AS details
FROM coaches_missing_active_plans t
UNION ALL
SELECT 'coaches_missing_active_availability_rules' AS check_name, row_to_json(t) AS details
FROM coaches_missing_active_availability_rules t
UNION ALL
SELECT 'coach_plan_seed_candidates' AS check_name, row_to_json(t) AS details
FROM coach_plan_seed_candidates t
UNION ALL
SELECT 'coach_availability_rule_seed_candidates' AS check_name, row_to_json(t) AS details
FROM coach_availability_rule_seed_candidates t
ORDER BY check_name;
