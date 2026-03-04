// ===========================================
// Faculty Stats API
// GET /api/faculty/stats
// ===========================================

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Timetable from '@/models/Timetable';
import Subject from '@/models/Subject';
import Leave from '@/models/Leave';

export async function GET() {
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

    // Get today's date info
    const today = new Date();
    const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1; // Convert to 0-5 (Mon-Sat)

    // Get published timetables for faculty's department
    const timetables = await Timetable.find({
      department: departmentId,
      status: 'published',
    });

    // Find all entries where this faculty is assigned
    let totalClassesThisWeek = 0;
    const todaysClasses: Array<{
      slot: number;
      subject: string;
      room: string;
      batch: string;
      type: string;
    }> = [];

    for (const timetable of timetables) {
      const facultyEntries = timetable.entries.filter(
        (entry) => entry.faculty.toString() === facultyId
      );
      
      totalClassesThisWeek += facultyEntries.length;
      
      // Get today's classes
      const todayEntries = facultyEntries.filter((entry) => entry.day === dayOfWeek);
      
      for (const entry of todayEntries) {
        // We'll populate these with basic info for now
        todaysClasses.push({
          slot: entry.slot,
          subject: entry.subject.toString(),
          room: entry.room.toString(),
          batch: entry.batch.toString(),
          type: entry.type,
        });
      }
    }

    // Get assigned subjects count
    const assignedSubjects = await Subject.countDocuments({
      assignedFaculty: facultyId,
      isActive: true,
    });

    // Get leave stats
    const pendingLeaves = await Leave.countDocuments({
      faculty: facultyId,
      status: 'pending',
    });

    const approvedLeaves = await Leave.countDocuments({
      faculty: facultyId,
      status: 'approved',
      endDate: { $gte: new Date() },
    });

    // Get this week's leave (if any)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const leavesThisWeek = await Leave.countDocuments({
      faculty: facultyId,
      status: 'approved',
      startDate: { $lte: endOfWeek },
      endDate: { $gte: startOfWeek },
    });

    return NextResponse.json({
      todaysClasses: todaysClasses.length,
      totalClassesThisWeek,
      assignedSubjects,
      pendingLeaves,
      approvedLeaves,
      leavesThisWeek,
      dayOfWeek,
    });
  } catch (error) {
    console.error('Error fetching faculty stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
