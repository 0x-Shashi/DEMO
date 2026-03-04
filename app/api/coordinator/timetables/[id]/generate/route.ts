// ===========================================
// Generate Timetable API
// POST /api/coordinator/timetables/[id]/generate
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Timetable from '@/models/Timetable';
import Subject from '@/models/Subject';
import User from '@/models/User';
import Room from '@/models/Room';
import Batch from '@/models/Batch';
import TimeSlot from '@/models/TimeSlot';
import {
  TimetableGenerator,
  SubjectRequirement,
  FacultyInfo,
  RoomInfo,
  BatchInfo,
  TimeSlotInfo,
  GenerationOptions,
} from '@/lib/timetable-generator';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only coordinators can generate timetables
    if (session.user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id } = await context.params;
    await dbConnect();

    // Get the timetable
    const timetable = await Timetable.findById(id);
    if (!timetable) {
      return NextResponse.json({ error: 'Timetable not found' }, { status: 404 });
    }

    // Check ownership
    if (timetable.department.toString() !== session.user.department) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Only draft timetables can be regenerated
    if (timetable.status !== 'draft') {
      return NextResponse.json(
        { error: 'Only draft timetables can be regenerated' },
        { status: 400 }
      );
    }

    // Parse generation options from request body
    const body = await request.json().catch(() => ({}));
    const options: GenerationOptions = {
      maxGapsPerDay: body.maxGapsPerDay ?? 2,
      preferConsecutiveLectures: body.preferConsecutiveLectures ?? true,
      balanceFacultyLoad: body.balanceFacultyLoad ?? true,
      prioritizePreferredSlots: body.prioritizePreferredSlots ?? true,
      maxRetries: body.maxRetries ?? 100,
    };

    // Fetch all required data
    const [subjects, faculty, rooms, batches, timeSlots] = await Promise.all([
      // Get subjects for this semester and department
      Subject.find({
        department: timetable.department,
        semester: timetable.semester,
        isActive: true,
      }),
      // Get faculty members in department
      User.find({
        department: timetable.department,
        role: 'faculty',
        isActive: true,
      }),
      // Get available rooms (department-specific + shared)
      Room.find({
        $or: [
          { department: timetable.department },
          { department: { $exists: false } },
          { department: null },
        ],
        isAvailable: true,
      }),
      // Get batches for this timetable
      Batch.find({
        _id: { $in: timetable.batches },
        isActive: true,
      }),
      // Get active time slots
      TimeSlot.find({ isActive: true }).sort({ slotNumber: 1 }),
    ]);

    // Check if we have enough data to generate
    if (subjects.length === 0) {
      return NextResponse.json(
        { error: 'No subjects found for this semester' },
        { status: 400 }
      );
    }

    if (rooms.length === 0) {
      return NextResponse.json(
        { error: 'No rooms available' },
        { status: 400 }
      );
    }

    if (batches.length === 0) {
      return NextResponse.json(
        { error: 'No batches assigned to this timetable' },
        { status: 400 }
      );
    }

    if (timeSlots.length === 0) {
      return NextResponse.json(
        { error: 'No time slots configured. Please configure time slots first.' },
        { status: 400 }
      );
    }

    // Transform data for generator
    const subjectReqs: SubjectRequirement[] = subjects.map(s => ({
      subjectId: s._id.toString(),
      subjectName: s.name,
      subjectCode: s.code,
      type: s.type,
      lecturesPerWeek: s.lecturesPerWeek,
      theoryHoursPerWeek: s.theoryHoursPerWeek,
      practicalHoursPerWeek: s.practicalHoursPerWeek,
      assignedFaculty: s.assignedFaculty?.toString(),
    }));

    const facultyInfo: FacultyInfo[] = faculty.map(f => ({
      facultyId: f._id.toString(),
      name: f.name,
      email: f.email,
      maxHoursPerDay: 6,
      maxHoursPerWeek: 30,
    }));

    const roomInfo: RoomInfo[] = rooms.map(r => ({
      roomId: r._id.toString(),
      name: r.name,
      type: r.type,
      capacity: r.capacity,
      building: r.building,
      floor: r.floor,
    }));

    const batchInfo: BatchInfo[] = batches.map(b => ({
      batchId: b._id.toString(),
      name: b.name,
      studentCount: b.studentCount,
      semester: b.semester,
    }));

    const timeSlotInfo: TimeSlotInfo[] = timeSlots.map(ts => ({
      slotNumber: ts.slotNumber,
      name: ts.name,
      startTime: ts.startTime,
      endTime: ts.endTime,
      type: ts.type,
      duration: ts.duration,
    }));

    // Run the generator
    const generator = new TimetableGenerator(
      subjectReqs,
      facultyInfo,
      roomInfo,
      batchInfo,
      timeSlotInfo,
      options
    );

    const result = await generator.generate();

    // Update timetable with generated entries
    timetable.entries = result.entries;
    timetable.hardConstraintViolations = result.hardConstraintViolations;
    timetable.softConstraintViolations = result.softConstraintViolations;
    timetable.optimizationScore = result.optimizationScore;
    
    await timetable.save();

    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? 'Timetable generated successfully' 
        : 'Timetable generated with conflicts',
      stats: result.stats,
      conflicts: result.conflicts,
      optimizationScore: result.optimizationScore,
      hardConstraintViolations: result.hardConstraintViolations,
      softConstraintViolations: result.softConstraintViolations,
      entriesCount: result.entries.length,
    });
  } catch (error) {
    console.error('Error generating timetable:', error);
    return NextResponse.json(
      { error: 'Failed to generate timetable' },
      { status: 500 }
    );
  }
}
