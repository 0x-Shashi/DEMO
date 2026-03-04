// ===========================================
// Get Subjects for Timetable (Coordinator)
// ===========================================

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Subject from '@/models/Subject';

// GET - Get all subjects for coordinator's department
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

    const subjects = await Subject.find({
      department: departmentId,
      isActive: true,
    })
      .populate('assignedFaculty', 'name email')
      .sort({ semester: 1, code: 1 });

    return NextResponse.json({ subjects });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subjects' },
      { status: 500 }
    );
  }
}
