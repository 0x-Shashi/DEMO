// ===========================================
// Batches API Route
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Batch from '@/models/Batch';

// GET - Fetch all batches
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');
    const year = searchParams.get('year');

    const filter: any = { isActive: true };
    if (department) filter.department = department;
    if (year) filter.year = parseInt(year);

    const batches = await Batch.find(filter)
      .populate('department', 'name code')
      .sort({ department: 1, year: 1, division: 1 });

    return NextResponse.json({ success: true, batches });
  } catch (error) {
    console.error('Batches fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch batches' },
      { status: 500 }
    );
  }
}

// POST - Create new batch
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const body = await request.json();
    const batch = await Batch.create(body);

    return NextResponse.json({ success: true, batch }, { status: 201 });
  } catch (error: any) {
    console.error('Batch create error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create batch' },
      { status: 500 }
    );
  }
}
