// ===========================================
// Timetables API Route
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Timetable from '@/models/Timetable';
import User from '@/models/User';

// GET - Fetch timetables based on role
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');
    const batch = searchParams.get('batch');
    const status = searchParams.get('status');

    let filter: any = {};

    // Admin and coordinator can see all
    if (['admin', 'coordinator'].includes(session.user.role)) {
      if (department) filter.department = department;
      if (batch) filter.batch = batch;
      if (status) filter.status = status;
    }
    // HOD can see their department timetables
    else if (session.user.role === 'hod') {
      const user = await User.findById(session.user.id);
      if (user?.department) {
        filter.department = user.department;
      }
      if (status) filter.status = status;
    }
    // Faculty can see timetables where they have entries
    else if (session.user.role === 'faculty') {
      filter['entries.faculty'] = session.user.id;
    }
    // Students can see their batch timetable
    else if (session.user.role === 'student') {
      const user = await User.findById(session.user.id);
      if (user?.department) {
        filter.department = user.department;
        // Find batches matching student's year and section
        // For now, return all published timetables for the department
        filter.status = 'published';
      }
    }

    const timetables = await Timetable.find(filter)
      .populate('department', 'name code')
      .populate('batch', 'name year division')
      .populate('createdBy', 'name')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, timetables });
  } catch (error) {
    console.error('Timetables fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch timetables' },
      { status: 500 }
    );
  }
}

// POST - Create new timetable
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !['admin', 'coordinator'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const body = await request.json();
    body.createdBy = session.user.id;
    body.status = 'draft';

    const timetable = await Timetable.create(body);

    return NextResponse.json({ success: true, timetable }, { status: 201 });
  } catch (error: any) {
    console.error('Timetable create error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create timetable' },
      { status: 500 }
    );
  }
}
