// ===========================================
// Submit Timetable for Approval API
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Timetable from '@/models/Timetable';

// POST - Submit timetable for HOD approval
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const { id } = await params;
    const timetable = await Timetable.findById(id);

    if (!timetable) {
      return NextResponse.json({ error: 'Timetable not found' }, { status: 404 });
    }

    // Verify timetable belongs to coordinator's department
    if (timetable.department.toString() !== session.user.department) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if timetable can be submitted
    if (timetable.status !== 'draft' && timetable.status !== 'rejected') {
      return NextResponse.json(
        { error: 'Only draft or rejected timetables can be submitted for approval' },
        { status: 400 }
      );
    }

    // Check if timetable has entries
    if (!timetable.entries || timetable.entries.length === 0) {
      return NextResponse.json(
        { error: 'Timetable must have at least one entry before submission' },
        { status: 400 }
      );
    }

    // Check for hard constraint violations
    if (timetable.hardConstraintViolations > 0) {
      return NextResponse.json(
        { error: 'Timetable has conflicts that must be resolved before submission' },
        { status: 400 }
      );
    }

    const updatedTimetable = await Timetable.findByIdAndUpdate(
      id,
      {
        status: 'pending',
        comments: null,
        rejectionReason: null,
      },
      { new: true }
    );

    return NextResponse.json({
      message: 'Timetable submitted for approval',
      timetable: updatedTimetable,
    });
  } catch (error) {
    console.error('Error submitting timetable:', error);
    return NextResponse.json(
      { error: 'Failed to submit timetable' },
      { status: 500 }
    );
  }
}
