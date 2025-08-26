import { NextRequest, NextResponse } from 'next/server';
import { commitPlan, CandidateSource } from '@/services/planning';
import { parseISO } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, selections, autoSchedule = false } = body;
    
    if (!date || !selections || !Array.isArray(selections)) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    const userId = 'default-user'; // TODO: Get from auth context
    const planDate = parseISO(date);
    
    const result = await commitPlan(
      userId,
      planDate,
      selections.map(s => ({
        source: s.source as CandidateSource,
        sourceId: s.sourceId,
        taskId: s.taskId,
        title: s.title,
        description: s.description,
        estimateMinutes: s.estimateMinutes,
        priority: s.priority,
      })),
      autoSchedule
    );
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error committing plan:', error);
    return NextResponse.json(
      { error: 'Failed to commit plan' },
      { status: 500 }
    );
  }
}