// ===========================================
// Faculty Schedule API
// GET /api/faculty/schedule
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Timetable from '@/models/Timetable';
import TimeSlot from '@/models/TimeSlot';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'faculty') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await dbConnect();

    const facultyId = session.user.id;
    const departmentId = session.user.department;
    
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'week'; // 'week' or 'day'
    const dayParam = searchParams.get('day'); // 0-5 for specific day

    // Get published timetables for faculty's department
    const timetables = await Timetable.find({
      department: departmentId,
      status: 'published',
    })
      .populate('entries.subject', 'name code type')
      .populate('entries.room', 'name building floor')
      .populate('entries.batch', 'name year semester division');

    // Get time slots
    const timeSlots = await TimeSlot.find({ isActive: true }).sort({ slotNumber: 1 });

    // Build schedule for this faculty
    const schedule: Record<number, Array<{
      slot: number;
      slotName: string;
      startTime: string;
      endTime: string;
      subject: { _id: string; name: string; code: string; type: string } | null;
      room: { _id: string; name: string; building: string; floor: string } | null;
      batch: { _id: string; name: string; year: number; semester: number; division: string } | null;
      type: string;
      timetableName: string;
    }>> = {};

    // Initialize days
    for (let day = 0; day < 6; day++) {
      schedule[day] = [];
    }

    for (const timetable of timetables) {
      const facultyEntries = timetable.entries.filter(
        (entry) => {
          const entryFacultyId = typeof entry.faculty === 'object' && entry.faculty !== null
            ? (entry.faculty as { _id?: { toString(): string } })._id?.toString() 
            : String(entry.faculty);
          return entryFacultyId === facultyId;
        }
      );

      for (const entry of facultyEntries) {
        const timeSlot = timeSlots.find((ts) => ts.slotNumber === entry.slot);
        
        schedule[entry.day].push({
          slot: entry.slot,
          slotName: timeSlot?.name || `Slot ${entry.slot}`,
          startTime: timeSlot?.startTime || '',
          endTime: timeSlot?.endTime || '',
          subject: entry.subject as unknown as { _id: string; name: string; code: string; type: string } | null,
          room: entry.room as unknown as { _id: string; name: string; building: string; floor: string } | null,
          batch: entry.batch as unknown as { _id: string; name: string; year: number; semester: number; division: string } | null,
          type: entry.type,
          timetableName: timetable.name,
        });
      }
    }

    // Sort each day's classes by slot
    for (const day in schedule) {
      schedule[day].sort((a, b) => a.slot - b.slot);
    }

    // If view is 'day', return only that day
    if (view === 'day' && dayParam !== null) {
      const dayIndex = parseInt(dayParam);
      return NextResponse.json({
        view: 'day',
        day: dayIndex,
        dayName: DAYS[dayIndex],
        classes: schedule[dayIndex] || [],
        timeSlots: timeSlots.filter((ts) => ts.type !== 'break' && ts.type !== 'lunch'),
      });
    }

    // Return full week view
    return NextResponse.json({
      view: 'week',
      schedule,
      days: DAYS,
      timeSlots: timeSlots.filter((ts) => ts.type !== 'break' && ts.type !== 'lunch'),
    });
  } catch (error) {
    console.error('Error fetching faculty schedule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedule' },
      { status: 500 }
    );
  }
}
