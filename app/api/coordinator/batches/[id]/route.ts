// ===========================================
// Coordinator Single Batch API
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Batch from '@/models/Batch';

// GET - Get single batch
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
    const batch = await Batch.findById(id).populate('department', 'name code');

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // Verify batch belongs to coordinator's department
    if (batch.department._id.toString() !== session.user.department) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(batch);
  } catch (error) {
    console.error('Error fetching batch:', error);
    return NextResponse.json(
      { error: 'Failed to fetch batch' },
      { status: 500 }
    );
  }
}

// PUT - Update batch
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
    const { name, year, semester, division, studentCount, academicYear, isActive } = body;

    const batch = await Batch.findById(id);

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // Verify batch belongs to coordinator's department
    if (batch.department.toString() !== session.user.department) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check for duplicate if key fields changed
    if (
      year !== batch.year ||
      semester !== batch.semester ||
      division !== batch.division ||
      academicYear !== batch.academicYear
    ) {
      const existingBatch = await Batch.findOne({
        department: session.user.department,
        year,
        semester,
        division,
        academicYear,
        _id: { $ne: id },
      });

      if (existingBatch) {
        return NextResponse.json(
          { error: 'Batch already exists for this year/semester/division' },
          { status: 400 }
        );
      }
    }

    const updatedBatch = await Batch.findByIdAndUpdate(
      id,
      {
        name,
        year,
        semester,
        division,
        studentCount,
        academicYear,
        isActive,
      },
      { new: true, runValidators: true }
    );

    return NextResponse.json(updatedBatch);
  } catch (error) {
    console.error('Error updating batch:', error);
    return NextResponse.json(
      { error: 'Failed to update batch' },
      { status: 500 }
    );
  }
}

// DELETE - Delete batch
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
    const batch = await Batch.findById(id);

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // Verify batch belongs to coordinator's department
    if (batch.department.toString() !== session.user.department) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // TODO: Check if batch is in use in any timetable

    await Batch.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Batch deleted successfully' });
  } catch (error) {
    console.error('Error deleting batch:', error);
    return NextResponse.json(
      { error: 'Failed to delete batch' },
      { status: 500 }
    );
  }
}
