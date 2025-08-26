import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { enqueueCalendarSync } from '@/services/sync-engine'

export async function POST(req: NextRequest) {
  const channelId = req.headers.get('X-Goog-Channel-Id') || req.headers.get('x-goog-channel-id') || ''
  const resourceId = req.headers.get('X-Goog-Resource-Id') || req.headers.get('x-goog-resource-id') || ''
  const channelToken = req.headers.get('X-Goog-Channel-Token') || req.headers.get('x-goog-channel-token') || ''

  if (!channelId || !resourceId) {
    return new NextResponse('Missing headers', { status: 400 })
  }

  const state = await prisma.googleSyncState.findFirst({ where: { resourceId } })
  if (!state) {
    // Unknown resource; acknowledge to avoid retries
    return new NextResponse('ok', { status: 200 })
  }

  // Optional validation if you set token: userId in watchCalendar
  if (channelToken && channelToken !== state.userId) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  // Lightweight debounce to avoid floods (e.g., <10s since last sync)
  if (state.lastSyncAt && Date.now() - new Date(state.lastSyncAt).getTime() < 10_000) {
    return new NextResponse('ok', { status: 200 })
  }

  // Use a stable jobKey to dedupe in BullMQ
  await enqueueCalendarSync(state.userId, state.calendarId, { jobKey: `sync:${state.userId}:${state.calendarId}` })

  return new NextResponse('ok', { status: 200 })
}

export async function GET() {
  return new NextResponse('ok', { status: 200 })
}