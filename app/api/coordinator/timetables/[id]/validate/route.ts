// ===========================================
// Validate Timetable API
// POST /api/coordinator/timetables/[id]/validate
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Timetable from '@/models/Timetable';
import { checkConflicts } from '@/lib/timetable-generator';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only coordinators and HODs can validate timetables
    if (!['coordinator', 'hod'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id } = await context.params;
    await dbConnect();

    // Get the timetable
    const timetable = await Timetable.findById(id);
    if (!timetable) {
      return NextResponse.json({ error: 'Timetable not found' }, { status: 404 });
    }

    // Check department access
    if (timetable.department.toString() !== session.user.department) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Parse validation options from request body
    const body = await request.json().catch(() => ({}));
    const options = {
      maxGapsPerDay: body.maxGapsPerDay ?? 2,
      maxHoursPerDay: body.maxHoursPerDay ?? 6,
    };

    // Run conflict detection
    const result = checkConflicts(timetable.entries, options);

    // Update timetable with validation results
    timetable.hardConstraintViolations = result.hardConflicts.length;
    timetable.softConstraintViolations = result.softConflicts.length;
    timetable.optimizationScore = result.score;
    await timetable.save();

    return NextResponse.json({
      valid: !result.hasConflicts,
      hardConflicts: result.hardConflicts,
      softConflicts: result.softConflicts,
      score: result.score,
      totalConflicts: result.hardConflicts.length + result.softConflicts.length,
    });
  } catch (error) {
    console.error('Error validating timetable:', error);
    return NextResponse.json(
      { error: 'Failed to validate timetable' },
      { status: 500 }
    );
  }
}
