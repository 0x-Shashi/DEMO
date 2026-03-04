// ===========================================
// Coordinator Timetables API
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Timetable from '@/models/Timetable';

// GET - List all timetables for department
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const departmentId = session.user.department;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { department: departmentId };

    if (status) query.status = status;
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const timetables = await Timetable.find(query)
      .populate('batch', 'name year semester division')
      .populate('createdBy', 'name')
      .populate('approvedBy', 'name')
      .sort({ updatedAt: -1 });

    return NextResponse.json({ timetables });
  } catch (error) {
    console.error('Error fetching timetables:', error);
    return NextResponse.json(
      { error: 'Failed to fetch timetables' },
      { status: 500 }
    );
  }
}

// POST - Create new timetable
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
    const { name, batch, academicYear, semester, batches } = body;

    // Validate required fields
    if (!name || !academicYear || !semester) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const departmentId = session.user.department;

    const timetable = await Timetable.create({
      name,
      department: departmentId,
      batch,
      academicYear,
      semester,
      batches: batches || [],
      status: 'draft',
      entries: [],
      createdBy: session.user.id,
      hardConstraintViolations: 0,
      softConstraintViolations: 0,
    });

    return NextResponse.json(timetable, { status: 201 });
  } catch (error) {
    console.error('Error creating timetable:', error);
    return NextResponse.json(
      { error: 'Failed to create timetable' },
      { status: 500 }
    );
  }
}
