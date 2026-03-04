// ===========================================
// Coordinator Stats API
// ===========================================

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Timetable from '@/models/Timetable';
import Room from '@/models/Room';
import Batch from '@/models/Batch';
import TimeSlot from '@/models/TimeSlot';

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

    const departmentId = session.user.department;

    // Get stats
    const [
      activeTimetables,
      draftTimetables,
      pendingTimetables,
      totalRooms,
      totalBatches,
      totalTimeSlots,
    ] = await Promise.all([
      Timetable.countDocuments({ department: departmentId, status: 'published' }),
      Timetable.countDocuments({ department: departmentId, status: 'draft' }),
      Timetable.countDocuments({ department: departmentId, status: 'pending' }),
      Room.countDocuments({ $or: [{ department: departmentId }, { department: null }] }),
      Batch.countDocuments({ department: departmentId, isActive: true }),
      TimeSlot.countDocuments({ isActive: true }),
    ]);

    // Get conflicts count (timetables with hard constraint violations)
    const conflictedTimetables = await Timetable.countDocuments({
      department: departmentId,
      status: { $in: ['draft', 'pending'] },
      hardConstraintViolations: { $gt: 0 },
    });

    // Get recent timetables
    const recentTimetables = await Timetable.find({ department: departmentId })
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate('batch', 'name')
      .select('name status updatedAt batch');

    return NextResponse.json({
      activeTimetables,
      draftTimetables,
      pendingTimetables,
      conflicts: conflictedTimetables,
      totalRooms,
      totalBatches,
      totalTimeSlots,
      recentTimetables,
    });
  } catch (error) {
    console.error('Error fetching coordinator stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
