import { NextRequest, NextResponse } from 'next/server';
import { suggestCandidates } from '@/services/planning';
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
    
    const candidates = await suggestCandidates(userId, date);
    
    return NextResponse.json(candidates);
  } catch (error) {
    console.error('Error fetching planning suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch planning suggestions' },
      { status: 500 }
    );
  }
}