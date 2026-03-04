'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Badge, Loading } from '@/components/ui';

interface DashboardStats {
  todaysClasses: number;
  totalClassesThisWeek: number;
  assignedSubjects: number;
  pendingLeaves: number;
  approvedLeaves: number;
  leavesThisWeek: number;
  dayOfWeek: number;
}

interface ScheduleEntry {
  slot: number;
  slotName: string;
  startTime: string;
  endTime: string;
  subject: { _id: string; name: string; code: string; type: string } | null;
  room: { _id: string; name: string; building: string; floor: string } | null;
  batch: { _id: string; name: string; year: number; semester: number; division: string } | null;
  type: string;
  timetableName: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function FacultyDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todaysSchedule, setTodaysSchedule] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, scheduleRes] = await Promise.all([
        fetch('/api/faculty/stats'),
        fetch('/api/faculty/schedule?view=day&day=' + (new Date().getDay() === 0 ? 5 : new Date().getDay() - 1)),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }

      if (scheduleRes.ok) {
        const data = await scheduleRes.json();
        setTodaysSchedule(data.classes || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading text="Loading dashboard..." />;
  }

  const today = new Date();
  const dayName = DAYS[today.getDay() === 0 ? 5 : today.getDay() - 1] || 'Sunday';
  const isWeekend = today.getDay() === 0;

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Faculty Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Today&apos;s Classes</p>
              <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                {stats?.todaysClasses || 0}
              </p>
            </div>
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-full">
              <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Weekly Classes</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {stats?.totalClassesThisWeek || 0}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Assigned Subjects</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {stats?.assignedSubjects || 0}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pending Leaves</p>
              <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                {stats?.pendingLeaves || 0}
              </p>
            </div>
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full">
              <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Link href="/faculty/schedule" className="block">
          <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl shadow p-6 text-white hover:from-indigo-600 hover:to-indigo-700 transition-colors">
            <h3 className="text-lg font-semibold mb-2">View Full Schedule</h3>
            <p className="text-indigo-100">See your complete weekly timetable</p>
          </div>
        </Link>

        <Link href="/faculty/leaves" className="block">
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow p-6 text-white hover:from-green-600 hover:to-green-700 transition-colors">
            <h3 className="text-lg font-semibold mb-2">Apply for Leave</h3>
            <p className="text-green-100">Submit a new leave request</p>
          </div>
        </Link>

        <Link href="/faculty/subjects" className="block">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow p-6 text-white hover:from-blue-600 hover:to-blue-700 transition-colors">
            <h3 className="text-lg font-semibold mb-2">My Subjects</h3>
            <p className="text-blue-100">View assigned subjects and details</p>
          </div>
        </Link>
      </div>

      {/* Today's Schedule */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Today&apos;s Schedule - {dayName}
            </h2>
            <Link href="/faculty/schedule">
              <Button variant="secondary" size="sm">View Week</Button>
            </Link>
          </div>
        </div>

        {isWeekend ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-4">🎉</div>
            <p className="text-gray-500 dark:text-gray-400">It&apos;s Sunday! Enjoy your day off.</p>
          </div>
        ) : todaysSchedule.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-4">📚</div>
            <p className="text-gray-500 dark:text-gray-400">No classes scheduled for today.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {todaysSchedule.map((entry, index) => (
              <div key={index} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-20 text-center">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {entry.startTime}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {entry.endTime}
                    </div>
                  </div>
                  
                  <div className={`w-1 h-12 rounded-full ${
                    entry.type === 'practical' ? 'bg-green-500' : 'bg-indigo-500'
                  }`}></div>

                  <div className="flex-grow">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {entry.subject?.code || 'N/A'}
                      </span>
                      <Badge variant={entry.type === 'practical' ? 'success' : 'info'} size="sm">
                        {entry.type}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {entry.subject?.name || 'Unknown Subject'}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {entry.room?.name || 'TBA'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {entry.room?.building}, Floor {entry.room?.floor}
                    </div>
                  </div>

                  <div className="text-right min-w-[100px]">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {entry.batch?.name || 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Year {entry.batch?.year}, Sem {entry.batch?.semester}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
