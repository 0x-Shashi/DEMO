// ===========================================
// Subject [id] API Route
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Subject from '@/models/Subject';

// GET - Fetch single subject
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

    const subject = await Subject.findById(id)
      .populate('department', 'name code')
      .populate('assignedFaculty', 'name email');

    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, subject });
  } catch (error) {
    console.error('Subject fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch subject' },
      { status: 500 }
    );
  }
}

// PUT - Update subject
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || !['admin', 'hod'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    const subject = await Subject.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, subject });
  } catch (error: any) {
    console.error('Subject update error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update subject' },
      { status: 500 }
    );
  }
}

// DELETE - Delete subject
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;

    const subject = await Subject.findByIdAndUpdate(id, { isActive: false });

    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Subject deleted' });
  } catch (error) {
    console.error('Subject delete error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete subject' },
      { status: 500 }
    );
  }
}
