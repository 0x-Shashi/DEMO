// ===========================================
// Coordinator Single Timetable API
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Timetable from '@/models/Timetable';

// GET - Get single timetable with all entries
export async function GET(
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
    const timetable = await Timetable.findById(id)
      .populate('department', 'name code')
      .populate('batch', 'name year semester division studentCount')
      .populate('batches', 'name year semester division studentCount')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate({
        path: 'entries.subject',
        select: 'name code type credits lecturesPerWeek',
      })
      .populate({
        path: 'entries.faculty',
        select: 'name email',
      })
      .populate({
        path: 'entries.room',
        select: 'name building floor type capacity',
      })
      .populate({
        path: 'entries.batch',
        select: 'name division',
      });

    if (!timetable) {
      return NextResponse.json({ error: 'Timetable not found' }, { status: 404 });
    }

    // Verify timetable belongs to coordinator's department
    if (timetable.department._id.toString() !== session.user.department) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(timetable);
  } catch (error) {
    console.error('Error fetching timetable:', error);
    return NextResponse.json(
      { error: 'Failed to fetch timetable' },
      { status: 500 }
    );
  }
}

// PUT - Update timetable (entries, status, etc.)
export async function PUT(
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
    const body = await request.json();

    const timetable = await Timetable.findById(id);

    if (!timetable) {
      return NextResponse.json({ error: 'Timetable not found' }, { status: 404 });
    }

    // Verify timetable belongs to coordinator's department
    if (timetable.department.toString() !== session.user.department) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if timetable can be edited
    if (timetable.status === 'published') {
      return NextResponse.json(
        { error: 'Published timetable cannot be edited' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.batch !== undefined) updateData.batch = body.batch;
    if (body.batches !== undefined) updateData.batches = body.batches;
    if (body.academicYear !== undefined) updateData.academicYear = body.academicYear;
    if (body.semester !== undefined) updateData.semester = body.semester;
    if (body.entries !== undefined) updateData.entries = body.entries;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.hardConstraintViolations !== undefined)
      updateData.hardConstraintViolations = body.hardConstraintViolations;
    if (body.softConstraintViolations !== undefined)
      updateData.softConstraintViolations = body.softConstraintViolations;
    if (body.optimizationScore !== undefined)
      updateData.optimizationScore = body.optimizationScore;

    const updatedTimetable = await Timetable.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('batch', 'name year semester division')
      .populate('createdBy', 'name');

    return NextResponse.json(updatedTimetable);
  } catch (error) {
    console.error('Error updating timetable:', error);
    return NextResponse.json(
      { error: 'Failed to update timetable' },
      { status: 500 }
    );
  }
}

// DELETE - Delete timetable
export async function DELETE(
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

    // Cannot delete published timetables
    if (timetable.status === 'published') {
      return NextResponse.json(
        { error: 'Published timetable cannot be deleted' },
        { status: 400 }
      );
    }

    await Timetable.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Timetable deleted successfully' });
  } catch (error) {
    console.error('Error deleting timetable:', error);
    return NextResponse.json(
      { error: 'Failed to delete timetable' },
      { status: 500 }
    );
  }
}
