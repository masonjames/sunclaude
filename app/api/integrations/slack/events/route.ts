import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { handleSlashCommand } from '@/services/integrations/slack'
import crypto from 'crypto'

// Required for Slack webhooks
export const runtime = 'nodejs'

/**
 * Verify Slack request signature
 */
function verifySlackSignature(
  signature: string,
  timestamp: string,
  body: string
): boolean {
  const signingSecret = process.env.SLACK_SIGNING_SECRET
  if (!signingSecret) {
    console.error('SLACK_SIGNING_SECRET not configured')
    return false
  }

  // Check timestamp to prevent replay attacks
  const requestTimestamp = parseInt(timestamp)
  const currentTime = Math.floor(Date.now() / 1000)
  if (Math.abs(currentTime - requestTimestamp) > 60 * 5) {
    // Request is older than 5 minutes
    return false
  }

  // Compute signature
  const sigBaseString = `v0:${timestamp}:${body}`
  const hmac = crypto
    .createHmac('sha256', signingSecret)
    .update(sigBaseString)
    .digest('hex')
  const computedSignature = `v0=${hmac}`

  // Compare signatures
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(computedSignature)
  )
}

export async function POST(req: NextRequest) {
  try {
    // Get Slack headers
    const headersList = headers()
    const slackSignature = headersList.get('x-slack-signature')
    const slackTimestamp = headersList.get('x-slack-request-timestamp')

    if (!slackSignature || !slackTimestamp) {
      return NextResponse.json(
        { error: 'Missing Slack headers' },
        { status: 400 }
      )
    }

    // Get request body
    const bodyText = await req.text()
    
    // Verify signature
    if (!verifySlackSignature(slackSignature, slackTimestamp, bodyText)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // Parse body
    const body = new URLSearchParams(bodyText)
    const payload: any = {}
    for (const [key, value] of body.entries()) {
      payload[key] = value
    }

    // Handle URL verification challenge
    if (payload.type === 'url_verification') {
      return NextResponse.json({ challenge: payload.challenge })
    }

    // Handle slash commands
    if (payload.command) {
      const response = await handleSlashCommand({
        user_id: payload.user_id,
        channel_id: payload.channel_id,
        command: payload.command,
        text: payload.text || '',
        team_id: payload.team_id,
      })

      // Return response for Slack
      return NextResponse.json({
        response_type: 'ephemeral', // Only visible to the user
        text: response,
      })
    }

    // Handle other event types if needed
    // For now, just acknowledge
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error handling Slack event:', error)
    return NextResponse.json(
      { error: 'Failed to process Slack event' },
      { status: 500 }
    )
  }
}