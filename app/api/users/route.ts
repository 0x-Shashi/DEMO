import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { User, Department } from '@/models';
import Notification from '@/models/Notification';
import bcrypt from 'bcryptjs';

// GET /api/users - List all users
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';

    const query: Record<string, unknown> = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    
    if (role) {
      query.role = role;
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .populate('department', 'name code')
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST /api/users - Create new user
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const body = await request.json();
    const { name, email, password, role, department, phone, employeeId, isActive } = body;

    // Validation
    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Name, email, password, and role are required' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    // Validate department if provided
    if (department) {
      const dept = await Department.findById(department);
      if (!dept) {
        return NextResponse.json(
          { error: 'Invalid department' },
          { status: 400 }
        );
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      department: department || undefined,
      phone: phone || undefined,
      employeeId: employeeId || undefined,
      isActive: isActive !== undefined ? isActive : true,
    });

    // Send notifications to relevant people
    try {
      // If faculty is created, notify the HOD of that department
      if (role === 'faculty' && department) {
        const dept = await Department.findById(department).populate('hod');
        if (dept?.hod) {
          await Notification.create({
            recipient: dept.hod._id,
            recipientRole: 'hod',
            title: 'New Faculty Member',
            message: `${name} has been added as a new faculty member in ${dept.name} department.`,
            type: 'info',
            link: '/hod/faculty',
          });
        }
      }

      // If coordinator is created, notify HOD
      if (role === 'coordinator' && department) {
        const dept = await Department.findById(department).populate('hod');
        if (dept?.hod) {
          await Notification.create({
            recipient: dept.hod._id,
            recipientRole: 'hod',
            title: 'New Coordinator Assigned',
            message: `${name} has been assigned as coordinator in ${dept.name} department.`,
            type: 'info',
            link: '/hod/dashboard',
          });
        }
      }

      // If student is created, notify coordinator of that department
      if (role === 'student' && department) {
        const coordinators = await User.find({ role: 'coordinator', department });
        for (const coordinator of coordinators) {
          await Notification.create({
            recipient: coordinator._id,
            recipientRole: 'coordinator',
            title: 'New Student Enrolled',
            message: `${name} has been enrolled as a new student.`,
            type: 'info',
            link: '/coordinator/dashboard',
          });
        }
      }
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
      // Don't fail the user creation if notification fails
    }

    // Return user without password
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userResponse } = user.toObject();

    return NextResponse.json({ user: userResponse }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
