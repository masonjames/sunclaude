import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { computeCapacity } from '@/services/planning';
import { parseISO } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get('date');
    
    if (!dateParam) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      );
    }
    
    const date = parseISO(dateParam);
    const capacity = await computeCapacity(session.user.id, date);
    
    return NextResponse.json(capacity);
  } catch (error) {
    console.error('Error computing capacity:', error);
    return NextResponse.json(
      { error: 'Failed to compute capacity' },
      { status: 500 }
    );
  }
}