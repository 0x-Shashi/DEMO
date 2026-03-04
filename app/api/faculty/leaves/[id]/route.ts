// ===========================================
// Faculty Leave Detail API
// GET /api/faculty/leaves/[id] - Get leave details
// PUT /api/faculty/leaves/[id] - Update leave (cancel)
// DELETE /api/faculty/leaves/[id] - Delete leave
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Leave from '@/models/Leave';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'faculty') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id } = await context.params;
    await dbConnect();

    const leave = await Leave.findById(id)
      .populate('approvedBy', 'name email');

    if (!leave) {
      return NextResponse.json({ error: 'Leave not found' }, { status: 404 });
    }

    // Check ownership
    if (leave.faculty.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json(leave);
  } catch (error) {
    console.error('Error fetching leave:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leave' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'faculty') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id } = await context.params;
    await dbConnect();

    const leave = await Leave.findById(id);

    if (!leave) {
      return NextResponse.json({ error: 'Leave not found' }, { status: 404 });
    }

    // Check ownership
    if (leave.faculty.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    // Faculty can only cancel their pending leave
    if (action === 'cancel') {
      if (leave.status !== 'pending') {
        return NextResponse.json(
          { error: 'Only pending leaves can be cancelled' },
          { status: 400 }
        );
      }

      leave.status = 'cancelled';
      await leave.save();

      return NextResponse.json(leave);
    }

    // Update leave details (only if pending)
    if (leave.status !== 'pending') {
      return NextResponse.json(
        { error: 'Cannot modify approved/rejected leaves' },
        { status: 400 }
      );
    }

    const { leaveType, startDate, endDate, reason } = body;

    if (leaveType) leave.leaveType = leaveType;
    if (startDate) leave.startDate = new Date(startDate);
    if (endDate) leave.endDate = new Date(endDate);
    if (reason) leave.reason = reason;

    await leave.save();

    return NextResponse.json(leave);
  } catch (error) {
    console.error('Error updating leave:', error);
    return NextResponse.json(
      { error: 'Failed to update leave' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'faculty') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id } = await context.params;
    await dbConnect();

    const leave = await Leave.findById(id);

    if (!leave) {
      return NextResponse.json({ error: 'Leave not found' }, { status: 404 });
    }

    // Check ownership
    if (leave.faculty.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Only allow deleting cancelled or rejected leaves
    if (!['cancelled', 'rejected'].includes(leave.status)) {
      return NextResponse.json(
        { error: 'Only cancelled or rejected leaves can be deleted' },
        { status: 400 }
      );
    }

    await Leave.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Leave deleted successfully' });
  } catch (error) {
    console.error('Error deleting leave:', error);
    return NextResponse.json(
      { error: 'Failed to delete leave' },
      { status: 500 }
    );
  }
}
