// ===========================================
// Subjects API Route
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Subject from '@/models/Subject';

// GET - Fetch all subjects
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');
    const semester = searchParams.get('semester');

    const filter: any = { isActive: true };
    if (department) filter.department = department;
    if (semester) filter.semester = parseInt(semester);

    const subjects = await Subject.find(filter)
      .populate('department', 'name code')
      .populate('assignedFaculty', 'name email')
      .sort({ code: 1 });

    return NextResponse.json({ success: true, subjects });
  } catch (error) {
    console.error('Subjects fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch subjects' },
      { status: 500 }
    );
  }
}

// POST - Create new subject
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !['admin', 'hod'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const body = await request.json();
    const subject = await Subject.create(body);

    return NextResponse.json({ success: true, subject }, { status: 201 });
  } catch (error: any) {
    console.error('Subject create error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create subject' },
      { status: 500 }
    );
  }
}
