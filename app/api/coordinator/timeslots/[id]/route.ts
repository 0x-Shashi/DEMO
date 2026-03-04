// ===========================================
// Coordinator Single Time Slot API
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/db';
import TimeSlot from '@/models/TimeSlot';

// GET - Get single time slot
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
    const timeSlot = await TimeSlot.findById(id);

    if (!timeSlot) {
      return NextResponse.json({ error: 'Time slot not found' }, { status: 404 });
    }

    return NextResponse.json(timeSlot);
  } catch (error) {
    console.error('Error fetching time slot:', error);
    return NextResponse.json(
      { error: 'Failed to fetch time slot' },
      { status: 500 }
    );
  }
}

// PUT - Update time slot
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
    const { name, startTime, endTime, slotNumber, type, duration, isActive } = body;

    const timeSlot = await TimeSlot.findById(id);

    if (!timeSlot) {
      return NextResponse.json({ error: 'Time slot not found' }, { status: 404 });
    }

    // Check if slot number already exists (if changed)
    if (slotNumber !== timeSlot.slotNumber) {
      const existingSlot = await TimeSlot.findOne({ slotNumber, _id: { $ne: id } });
      if (existingSlot) {
        return NextResponse.json(
          { error: 'Slot number already exists' },
          { status: 400 }
        );
      }
    }

    const updatedTimeSlot = await TimeSlot.findByIdAndUpdate(
      id,
      {
        name,
        startTime,
        endTime,
        slotNumber,
        type,
        duration,
        isActive,
      },
      { new: true, runValidators: true }
    );

    return NextResponse.json(updatedTimeSlot);
  } catch (error) {
    console.error('Error updating time slot:', error);
    return NextResponse.json(
      { error: 'Failed to update time slot' },
      { status: 500 }
    );
  }
}

// DELETE - Delete time slot
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
    const timeSlot = await TimeSlot.findById(id);

    if (!timeSlot) {
      return NextResponse.json({ error: 'Time slot not found' }, { status: 404 });
    }

    await TimeSlot.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Time slot deleted successfully' });
  } catch (error) {
    console.error('Error deleting time slot:', error);
    return NextResponse.json(
      { error: 'Failed to delete time slot' },
      { status: 500 }
    );
  }
}
