// ===========================================
// Coordinator Single Room API
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Room from '@/models/Room';

// GET - Get single room
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const { id } = await params;
    const room = await Room.findById(id).populate('department', 'name code');

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    return NextResponse.json(room);
  } catch (error) {
    console.error('Error fetching room:', error);
    return NextResponse.json(
      { error: 'Failed to fetch room' },
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

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const { id } = await params;
    const body = await request.json();
    const { name, building, floor, type, capacity, facilities, isAvailable, isShared } = body;

    const room = await Room.findById(id);

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Check if new name conflicts with existing room
    if (name !== room.name || building !== room.building) {
      const existingRoom = await Room.findOne({
        name,
        building,
        _id: { $ne: id },
      });
      if (existingRoom) {
        return NextResponse.json(
          { error: 'Room already exists in this building' },
          { status: 400 }
        );
      }
    }

    const updatedRoom = await Room.findByIdAndUpdate(
      id,
      {
        name,
        building,
        floor,
        type,
        capacity,
        facilities,
        isAvailable,
        department: isShared ? undefined : session.user.department,
      },
      { new: true, runValidators: true }
    );

    return NextResponse.json(updatedRoom);
  } catch (error) {
    console.error('Error updating room:', error);
    return NextResponse.json(
      { error: 'Failed to update room' },
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

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const { id } = await params;
    const room = await Room.findById(id);

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // TODO: Check if room is in use in any timetable

    await Room.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Error deleting room:', error);
    return NextResponse.json(
      { error: 'Failed to delete room' },
      { status: 500 }
    );
  }
}
