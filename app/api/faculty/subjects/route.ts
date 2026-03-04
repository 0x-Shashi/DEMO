import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/db';
import Subject from '@/models/Subject';
import User from '@/models/User';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get faculty user with department
    const faculty = await User.findById(session.user.id);
    if (!faculty) {
      return NextResponse.json({ error: 'Faculty not found' }, { status: 404 });
    }

    // Find subjects where this faculty is assigned
    const subjects = await Subject.find({ assignedFaculty: faculty._id })
      .populate('department', 'name code')
      .sort({ semester: 1, name: 1 });

    return NextResponse.json({ subjects });
  } catch (error) {
    console.error('Error fetching faculty subjects:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
