import { NextRequest } from 'next/server'
import { WebSocketServer } from 'ws'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Store active connections
const connections = new Map<string, Set<WebSocket>>()

// Handle WebSocket upgrade
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const upgrade = request.headers.get('upgrade')
  
  if (upgrade !== 'websocket') {
    return new Response('Expected websocket', { status: 426 })
  }

  try {
    // Note: In a real application, you'd need a proper WebSocket server
    // This is a simplified example for demonstration
    return new Response('WebSocket server would be initialized here', { 
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      }
    })
  } catch (error) {
    console.error('WebSocket connection error:', error)
    return new Response('WebSocket connection failed', { status: 500 })
  }
}

// Utility functions for WebSocket management
export function broadcastToUser(userId: string, message: any) {
  const userConnections = connections.get(userId)
  if (userConnections) {
    const messageStr = JSON.stringify(message)
    userConnections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr)
      }
    })
  }
}

export function addConnection(userId: string, ws: WebSocket) {
  if (!connections.has(userId)) {
    connections.set(userId, new Set())
  }
  connections.get(userId)!.add(ws)
  
  // Clean up on close
  ws.addEventListener('close', () => {
    removeConnection(userId, ws)
  })
}

export function removeConnection(userId: string, ws: WebSocket) {
  const userConnections = connections.get(userId)
  if (userConnections) {
    userConnections.delete(ws)
    if (userConnections.size === 0) {
      connections.delete(userId)
    }
  }
}

// Broadcast task changes to relevant users
export function broadcastTaskChange(taskData: any, userIds: string[]) {
  const message = {
    type: 'task_update',
    data: taskData,
    timestamp: new Date().toISOString()
  }
  
  userIds.forEach(userId => {
    broadcastToUser(userId, message)
  })
}