// ===========================================
// Seed Default Time Slots
// ===========================================

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/db';
import TimeSlot from '@/models/TimeSlot';

const defaultTimeSlots = [
  { name: 'Slot 1', startTime: '09:00', endTime: '10:00', slotNumber: 1, type: 'theory', duration: 60 },
  { name: 'Slot 2', startTime: '10:00', endTime: '11:00', slotNumber: 2, type: 'theory', duration: 60 },
  { name: 'Short Break', startTime: '11:00', endTime: '11:15', slotNumber: 3, type: 'break', duration: 15 },
  { name: 'Slot 3', startTime: '11:15', endTime: '12:15', slotNumber: 4, type: 'theory', duration: 60 },
  { name: 'Slot 4', startTime: '12:15', endTime: '13:15', slotNumber: 5, type: 'theory', duration: 60 },
  { name: 'Lunch Break', startTime: '13:15', endTime: '14:00', slotNumber: 6, type: 'lunch', duration: 45 },
  { name: 'Slot 5', startTime: '14:00', endTime: '15:00', slotNumber: 7, type: 'theory', duration: 60 },
  { name: 'Slot 6', startTime: '15:00', endTime: '16:00', slotNumber: 8, type: 'theory', duration: 60 },
  { name: 'Slot 7', startTime: '16:00', endTime: '17:00', slotNumber: 9, type: 'theory', duration: 60 },
];

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    // Check if slots already exist
    const existingCount = await TimeSlot.countDocuments();
    if (existingCount > 0) {
      return NextResponse.json(
        { error: 'Time slots already exist. Delete existing slots first.' },
        { status: 400 }
      );
    }

    // Create default slots
    const slots = await TimeSlot.insertMany(
      defaultTimeSlots.map(slot => ({
        ...slot,
        isActive: true,
      }))
    );

    return NextResponse.json({
      message: 'Default time slots created successfully',
      count: slots.length,
      slots,
    });
  } catch (error) {
    console.error('Error seeding time slots:', error);
    return NextResponse.json(
      { error: 'Failed to seed time slots' },
      { status: 500 }
    );
  }
}
