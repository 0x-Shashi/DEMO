// ===========================================
// Timetable [id] API Route
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Timetable from '@/models/Timetable';

// GET - Fetch single timetable with full details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;

    const timetable = await Timetable.findById(id)
      .populate('department', 'name code')
      .populate('batch', 'name year division semester')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate({
        path: 'entries.subject',
        select: 'name code credits type',
      })
      .populate({
        path: 'entries.faculty',
        select: 'name email',
      })
      .populate({
        path: 'entries.room',
        select: 'name building floor type',
      })
      .populate({
        path: 'entries.batch',
        select: 'name year division',
      });

    if (!timetable) {
      return NextResponse.json({ error: 'Timetable not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, timetable });
  } catch (error) {
    console.error('Timetable fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch timetable' },
      { status: 500 }
    );
  }
}

// PUT - Update timetable
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || !['admin', 'coordinator', 'hod'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    // Handle status changes
    if (body.status === 'approved' && session.user.role === 'hod') {
      body.approvedBy = session.user.id;
      body.approvalDate = new Date();
    }

    const timetable = await Timetable.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!timetable) {
      return NextResponse.json({ error: 'Timetable not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, timetable });
  } catch (error: any) {
    console.error('Timetable update error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update timetable' },
      { status: 500 }
    );
  }
}

// DELETE - Delete timetable
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || !['admin', 'coordinator'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;

    const timetable = await Timetable.findByIdAndDelete(id);

    if (!timetable) {
      return NextResponse.json({ error: 'Timetable not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Timetable deleted' });
  } catch (error) {
    console.error('Timetable delete error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete timetable' },
      { status: 500 }
    );
  }
}
