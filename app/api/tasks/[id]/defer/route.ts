import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { deferTask } from '@/services/planning';
import { parseISO } from 'date-fns';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = await params;
    const body = await request.json();
    const { deferredTo, reason } = body;
    
    if (!deferredTo) {
      return NextResponse.json(
        { error: 'deferredTo date is required' },
        { status: 400 }
      );
    }
    
    const deferDate = parseISO(deferredTo);
    const updatedTask = await deferTask(id, deferDate, reason);
    
    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('Error deferring task:', error);
    return NextResponse.json(
      { error: 'Failed to defer task' },
      { status: 500 }
    );
  }
}