// ===========================================
// Coordinator Rooms API
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Room from '@/models/Room';

// GET - List all rooms
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const building = searchParams.get('building');
    const search = searchParams.get('search');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {};

    // Rooms can be department-specific or shared
    const departmentId = session.user.department;
    query.$or = [{ department: departmentId }, { department: null }, { department: { $exists: false } }];

    if (type) query.type = type;
    if (building) query.building = building;
    if (search) {
      query.$and = [
        { $or: query.$or },
        {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { building: { $regex: search, $options: 'i' } },
          ],
        },
      ];
      delete query.$or;
    }

    const rooms = await Room.find(query)
      .populate('department', 'name code')
      .sort({ building: 1, floor: 1, name: 1 });

    // Get unique buildings for filter
    const buildings = await Room.distinct('building');

    return NextResponse.json({ rooms, buildings });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rooms' },
      { status: 500 }
    );
  }
}

// POST - Create new room
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const body = await request.json();
    const { name, building, floor, type, capacity, facilities, isShared } = body;

    // Validate required fields
    if (!name || !building || !floor || !capacity) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if room already exists
    const existingRoom = await Room.findOne({ name, building });
    if (existingRoom) {
      return NextResponse.json(
        { error: 'Room already exists in this building' },
        { status: 400 }
      );
    }

    const room = await Room.create({
      name,
      building,
      floor,
      type: type || 'lecture',
      capacity,
      facilities: facilities || [],
      department: isShared ? undefined : session.user.department,
      isAvailable: true,
    });

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    console.error('Error creating room:', error);
    return NextResponse.json(
      { error: 'Failed to create room' },
      { status: 500 }
    );
  }
}
