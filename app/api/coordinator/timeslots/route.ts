// ===========================================
// Coordinator Time Slots API
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/db';
import TimeSlot from '@/models/TimeSlot';

// GET - List all time slots
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const timeSlots = await TimeSlot.find().sort({ slotNumber: 1 });

    return NextResponse.json({ timeSlots });
  } catch (error) {
    console.error('Error fetching time slots:', error);
    return NextResponse.json(
      { error: 'Failed to fetch time slots' },
      { status: 500 }
    );
  }
}

// POST - Create new time slot
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const body = await request.json();
    const { name, startTime, endTime, slotNumber, type, duration } = body;

    // Validate required fields
    if (!name || !startTime || !endTime || !slotNumber || !duration) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if slot number already exists
    const existingSlot = await TimeSlot.findOne({ slotNumber });
    if (existingSlot) {
      return NextResponse.json(
        { error: 'Slot number already exists' },
        { status: 400 }
      );
    }

    // Check for time overlap
    const overlappingSlot = await TimeSlot.findOne({
      $or: [
        { startTime: { $lt: endTime }, endTime: { $gt: startTime } },
      ],
      isActive: true,
    });

    if (overlappingSlot) {
      return NextResponse.json(
        { error: 'Time slot overlaps with existing slot' },
        { status: 400 }
      );
    }

    const timeSlot = await TimeSlot.create({
      name,
      startTime,
      endTime,
      slotNumber,
      type: type || 'theory',
      duration,
      isActive: true,
    });

    return NextResponse.json(timeSlot, { status: 201 });
  } catch (error) {
    console.error('Error creating time slot:', error);
    return NextResponse.json(
      { error: 'Failed to create time slot' },
      { status: 500 }
    );
  }
}
