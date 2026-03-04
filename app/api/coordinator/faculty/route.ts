// ===========================================
// Get Faculty for Timetable (Coordinator)
// ===========================================

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/db';
import User from '@/models/User';

// GET - Get all faculty for coordinator's department
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

    const faculty = await User.find({
      department: departmentId,
      role: 'faculty',
      isActive: true,
    })
      .select('name email')
      .sort({ name: 1 });

    return NextResponse.json({ faculty });
  } catch (error) {
    console.error('Error fetching faculty:', error);
    return NextResponse.json(
      { error: 'Failed to fetch faculty' },
      { status: 500 }
    );
  }
}
