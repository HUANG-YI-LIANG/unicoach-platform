export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';
import { maskEmail, maskIdentifier, safeErrorDetails } from '@/lib/safeLogging';

const LESSON_LOG_BOOKING_SELECT = `
  id,
  user_id,
  coach_id,
  coach_service_id,
  status,
  expected_time,
  service_title,
  users!bookings_user_id_fkey(email, name),
  coaches:users!bookings_coach_id_fkey(name)
`;
const LESSON_LOG_STATUSES = new Set(['completed', 'pending_completion']);
const MAX_FOCUS_AREAS = 12;

function isUuid(value) {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalizeShortText(value, maxLength, required = false) {
  if (value === null || value === undefined) {
    return required ? null : null;
  }
  const normalized = String(value).replace(/\s+/g, ' ').trim();
  if (!normalized) return required ? null : null;
  if ([...normalized].length > maxLength) return null;
  return normalized;
}

function normalizeFocusAreas(value) {
  if (!Array.isArray(value)) return [];

  const seen = new Set();
  const result = [];
  for (const raw of value) {
    const item = normalizeShortText(raw, 40, false);
    if (!item) continue;
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
    if (result.length > MAX_FOCUS_AREAS) break;
  }
  return result.slice(0, MAX_FOCUS_AREAS);
}

function normalizeSafeLink(value, fallback = '/notifications') {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed || !trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.length > 512) {
    return fallback;
  }
  return trimmed;
}

function truncateText(value, maxLength) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  const chars = [...normalized];
  return chars.length > maxLength ? `${chars.slice(0, maxLength - 1).join('')}…` : normalized;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildAbsoluteUrl(path) {
  const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || '';
  if (!appUrl) return path;
  try {
    return new URL(path, appUrl).toString();
  } catch (_) {
    return path;
  }
}

function lessonLogDto(row) {
  return {
    id: row.id,
    bookingId: row.booking_id,
    coachId: row.coach_id,
    studentId: row.student_id,
    serviceId: row.service_id,
    performanceRating: row.performance_rating,
    focusAreas: row.focus_areas || [],
    shortFeedback: row.short_feedback,
    nextStep: row.next_step,
    createdAt: row.created_at,
    booking: row.bookings ? {
      id: row.bookings.id,
      expectedTime: row.bookings.expected_time,
      serviceTitle: row.bookings.service_title,
      status: row.bookings.status,
    } : undefined,
  };
}

async function sendLessonLogEmail({ studentEmail, studentName, coachName, serviceTitle, linkUrl }) {
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_APP_PASSWORD;
  if (!emailUser || !emailPassword || !studentEmail) {
    return { skipped: true };
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPassword,
    },
  });

  const safeStudentName = escapeHtml(studentName || '同學');
  const safeCoachName = escapeHtml(coachName || '教練');
  const safeServiceTitle = escapeHtml(serviceTitle || '課程');
  const absoluteUrl = buildAbsoluteUrl(linkUrl);
  const safeUrl = escapeHtml(absoluteUrl);

  await transporter.sendMail({
    from: `UniCoach <${emailUser}>`,
    to: studentEmail,
    subject: '你的課後日誌已更新',
    text: `${studentName || '同學'}您好，${coachName || '教練'} 已新增 ${serviceTitle || '課程'} 的課後日誌。請登入 UniCoach 查看：${absoluteUrl}`,
    html: `<p>${safeStudentName}您好，</p><p>${safeCoachName} 已新增 ${safeServiceTitle} 的課後日誌。</p><p><a href="${safeUrl}">登入 UniCoach 查看課後日誌</a></p>`,
  });

  return { skipped: false };
}

export async function POST(request) {
  try {
    const auth = await requireAuth(['coach', 'admin'], { requireApprovedCoach: true });
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.warn('[LESSON LOG JSON WARNING]', safeErrorDetails(parseError));
      return NextResponse.json({ error: '請求格式錯誤' }, { status: 400 });
    }

    const bookingId = body?.bookingId || body?.booking_id;
    if (!isUuid(bookingId)) {
      return NextResponse.json({ error: '缺少有效的預約 ID' }, { status: 400 });
    }

    const rating = Number(body?.performanceRating ?? body?.performance_rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: '表現評分必須介於 1 到 5' }, { status: 400 });
    }

    const shortFeedback = normalizeShortText(body?.shortFeedback ?? body?.short_feedback, 120, true);
    if (!shortFeedback) {
      return NextResponse.json({ error: '課後回饋為必填，且不可超過 120 字' }, { status: 400 });
    }

    const nextStep = normalizeShortText(body?.nextStep ?? body?.next_step, 120, false);
    if ((body?.nextStep || body?.next_step) && !nextStep) {
      return NextResponse.json({ error: '下次建議不可超過 120 字' }, { status: 400 });
    }

    const focusAreas = normalizeFocusAreas(body?.focusAreas ?? body?.focus_areas);
    const adminSupabase = getAdminSupabase();

    const { data: booking, error: bookingError } = await adminSupabase
      .from('bookings')
      .select(LESSON_LOG_BOOKING_SELECT)
      .eq('id', bookingId)
      .maybeSingle();

    if (bookingError) throw bookingError;
    if (!booking) return NextResponse.json({ error: '找不到預約' }, { status: 404 });

    if (auth.user.role !== 'admin' && String(booking.coach_id) !== String(auth.user.id)) {
      return NextResponse.json({ error: '只能為自己的課程建立課後日誌' }, { status: 403 });
    }

    if (!LESSON_LOG_STATUSES.has(booking.status)) {
      return NextResponse.json({ error: '課程完成後才能建立課後日誌' }, { status: 400 });
    }

    if (!booking.coach_service_id) {
      return NextResponse.json({ error: '此預約缺少服務 ID，無法建立 P2 課後日誌' }, { status: 400 });
    }

    const { data: existingLog, error: existingError } = await adminSupabase
      .from('lesson_logs')
      .select('id')
      .eq('booking_id', bookingId)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existingLog) {
      return NextResponse.json({ error: '此預約已建立課後日誌' }, { status: 409 });
    }

    const { data: lessonLog, error: insertError } = await adminSupabase
      .from('lesson_logs')
      .insert({
        booking_id: booking.id,
        coach_id: booking.coach_id,
        student_id: booking.user_id,
        service_id: booking.coach_service_id,
        performance_rating: rating,
        focus_areas: focusAreas,
        short_feedback: shortFeedback,
        next_step: nextStep,
      })
      .select('id, booking_id, coach_id, student_id, service_id, performance_rating, focus_areas, short_feedback, next_step, created_at')
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ error: '此預約已建立課後日誌' }, { status: 409 });
      }
      throw insertError;
    }

    const linkUrl = normalizeSafeLink(`/lesson-logs?booking=${booking.id}`);
    const notificationTitle = truncateText('你的課後日誌已更新', 120);
    const notificationMessage = truncateText(`${booking.coaches?.name || '教練'} 已新增 ${booking.service_title || '課程'} 的課後紀錄`, 500);

    const { error: notificationError } = await adminSupabase
      .from('notifications')
      .insert({
        user_id: booking.user_id,
        type: 'lesson_log_created',
        title: notificationTitle,
        message: notificationMessage,
        link_url: linkUrl,
      });

    if (notificationError) {
      console.warn('[LESSON LOG NOTIFICATION WARNING]', safeErrorDetails(notificationError));
    }

    try {
      const emailResult = await sendLessonLogEmail({
        studentEmail: booking.users?.email,
        studentName: booking.users?.name,
        coachName: booking.coaches?.name,
        serviceTitle: booking.service_title,
        linkUrl,
      });
      if (!emailResult.skipped) {
        console.info('[LESSON LOG EMAIL SENT]', { to: maskEmail(booking.users?.email), lessonLogId: maskIdentifier(lessonLog.id) });
      }
    } catch (emailError) {
      console.warn('[LESSON LOG EMAIL WARNING]', safeErrorDetails(emailError));
    }

    return NextResponse.json({ success: true, lessonLog: lessonLogDto(lessonLog) }, { status: 201 });
  } catch (error) {
    console.error('[LESSON LOG CREATE ERROR]', safeErrorDetails(error));
    return NextResponse.json({ error: '建立課後日誌失敗' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('bookingId') || searchParams.get('booking_id') || searchParams.get('booking');
    const limitRaw = Number(searchParams.get('limit') || 30);
    const limit = Number.isInteger(limitRaw) ? Math.max(1, Math.min(limitRaw, 50)) : 30;

    if (bookingId && !isUuid(bookingId)) {
      return NextResponse.json({ error: '預約 ID 格式錯誤' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();
    let query = adminSupabase
      .from('lesson_logs')
      .select(`
        id,
        booking_id,
        coach_id,
        student_id,
        service_id,
        performance_rating,
        focus_areas,
        short_feedback,
        next_step,
        created_at,
        bookings!lesson_logs_booking_id_fkey(id, expected_time, service_title, status)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (bookingId) query = query.eq('booking_id', bookingId);

    if (auth.user.role === 'admin') {
      // Admin support/debug visibility.
    } else if (auth.user.role === 'coach') {
      query = query.eq('coach_id', auth.user.id);
    } else {
      query = query.eq('student_id', auth.user.id);
    }

    const { data: logs, error } = await query;
    if (error) throw error;

    return NextResponse.json({ lessonLogs: (logs || []).map(lessonLogDto) });
  } catch (error) {
    console.error('[LESSON LOG LIST ERROR]', safeErrorDetails(error));
    return NextResponse.json({ error: '無法取得課後日誌' }, { status: 500 });
  }
}
