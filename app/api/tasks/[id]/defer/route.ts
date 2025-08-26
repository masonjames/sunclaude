import { NextRequest, NextResponse } from 'next/server';
import { deferTask } from '@/services/planning';
import { parseISO } from 'date-fns';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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