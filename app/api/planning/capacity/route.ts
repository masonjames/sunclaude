import { NextRequest, NextResponse } from 'next/server';
import { computeCapacity } from '@/services/planning';
import { parseISO } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get('date');
    
    if (!dateParam) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      );
    }
    
    const date = parseISO(dateParam);
    const userId = 'default-user'; // TODO: Get from auth context
    
    const capacity = await computeCapacity(userId, date);
    
    return NextResponse.json(capacity);
  } catch (error) {
    console.error('Error computing capacity:', error);
    return NextResponse.json(
      { error: 'Failed to compute capacity' },
      { status: 500 }
    );
  }
}