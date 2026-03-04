// ===========================================
// Room [id] API Route
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Room from '@/models/Room';

// GET - Fetch single room
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

    const room = await Room.findById(id).populate('department', 'name code');

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, room });
  } catch (error) {
    console.error('Room fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch room' },
      { status: 500 }
    );
  }
}

// PUT - Update room
export async function PUT(
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
    const body = await request.json();

    const room = await Room.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, room });
  } catch (error: any) {
    console.error('Room update error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update room' },
      { status: 500 }
    );
  }
}

// DELETE - Delete room
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

    const room = await Room.findByIdAndUpdate(id, { isActive: false });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Room deleted' });
  } catch (error) {
    console.error('Room delete error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete room' },
      { status: 500 }
    );
  }
}
