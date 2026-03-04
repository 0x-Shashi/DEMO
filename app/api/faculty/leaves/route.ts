// ===========================================
// Faculty Leaves API
// GET /api/faculty/leaves - List leaves
// POST /api/faculty/leaves - Apply for leave
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Leave from '@/models/Leave';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'faculty') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const year = searchParams.get('year');

    // Build query
    const query: Record<string, unknown> = {
      faculty: new mongoose.Types.ObjectId(session.user.id),
    };

    if (status && status !== 'all') {
      query.status = status;
    }

    if (year) {
      const startOfYear = new Date(parseInt(year), 0, 1);
      const endOfYear = new Date(parseInt(year), 11, 31, 23, 59, 59);
      query.startDate = { $gte: startOfYear, $lte: endOfYear };
    }

    const leaves = await Leave.find(query)
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 });

    // Calculate leave balance (simple calculation - can be enhanced)
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59);

    const approvedLeavesThisYear = await Leave.find({
      faculty: new mongoose.Types.ObjectId(session.user.id),
      status: 'approved',
      startDate: { $gte: yearStart, $lte: yearEnd },
    });

    // Calculate total days taken
    let casualTaken = 0;
    let sickTaken = 0;
    let earnedTaken = 0;

    for (const leave of approvedLeavesThisYear) {
      const days = Math.ceil(
        (leave.endDate.getTime() - leave.startDate.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;

      switch (leave.leaveType) {
        case 'casual':
          casualTaken += days;
          break;
        case 'sick':
          sickTaken += days;
          break;
        case 'earned':
          earnedTaken += days;
          break;
      }
    }

    // Standard leave allocation (can be configured)
    const leaveBalance = {
      casual: { total: 12, taken: casualTaken, remaining: 12 - casualTaken },
      sick: { total: 12, taken: sickTaken, remaining: 12 - sickTaken },
      earned: { total: 15, taken: earnedTaken, remaining: 15 - earnedTaken },
    };

    return NextResponse.json({
      leaves,
      leaveBalance,
      totalLeaves: leaves.length,
    });
  } catch (error) {
    console.error('Error fetching leaves:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaves' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'faculty') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await dbConnect();

    const body = await request.json();
    const { leaveType, startDate, endDate, reason } = body;

    // Validation
    if (!leaveType || !startDate || !endDate || !reason) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    if (start < new Date()) {
      // Allow same day leave applications
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (start < today) {
        return NextResponse.json(
          { error: 'Cannot apply leave for past dates' },
          { status: 400 }
        );
      }
    }

    // Check for overlapping leaves
    const overlapping = await Leave.findOne({
      faculty: new mongoose.Types.ObjectId(session.user.id),
      status: { $in: ['pending', 'approved'] },
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } },
      ],
    });

    if (overlapping) {
      return NextResponse.json(
        { error: 'You already have a leave application for these dates' },
        { status: 400 }
      );
    }

    // Create leave application
    const leave = await Leave.create({
      faculty: new mongoose.Types.ObjectId(session.user.id),
      department: new mongoose.Types.ObjectId(session.user.department),
      leaveType,
      startDate: start,
      endDate: end,
      reason,
      status: 'pending',
    });

    return NextResponse.json(leave, { status: 201 });
  } catch (error) {
    console.error('Error creating leave:', error);
    return NextResponse.json(
      { error: 'Failed to apply for leave' },
      { status: 500 }
    );
  }
}
