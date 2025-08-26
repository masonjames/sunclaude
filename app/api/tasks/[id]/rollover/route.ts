import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { rolloverTask } from '@/services/planning';
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
    const { newDate } = body;
    
    const targetDate = newDate ? parseISO(newDate) : undefined;
    const updatedTask = await rolloverTask(id, targetDate);
    
    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('Error rolling over task:', error);
    return NextResponse.json(
      { error: 'Failed to rollover task' },
      { status: 500 }
    );
  }
}