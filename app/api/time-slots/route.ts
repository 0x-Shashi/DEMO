// ===========================================
// Time Slots API Route
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/db';
import TimeSlot from '@/models/TimeSlot';

// GET - Fetch all time slots
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const timeSlots = await TimeSlot.find({ isActive: true }).sort({ slotNumber: 1 });

    return NextResponse.json({ success: true, timeSlots });
  } catch (error) {
    console.error('Time slots fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch time slots' },
      { status: 500 }
    );
  }
}

// POST - Create new time slot
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const body = await request.json();
    const timeSlot = await TimeSlot.create(body);

    return NextResponse.json({ success: true, timeSlot }, { status: 201 });
  } catch (error: any) {
    console.error('Time slot create error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create time slot' },
      { status: 500 }
    );
  }
}
