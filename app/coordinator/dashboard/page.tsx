'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { StatCard, Badge, Loading } from '@/components/ui';

interface Stats {
  activeTimetables: number;
  draftTimetables: number;
  pendingTimetables: number;
  conflicts: number;
  totalRooms: number;
  totalBatches: number;
  totalTimeSlots: number;
  recentTimetables: Array<{
    _id: string;
    name: string;
    status: string;
    updatedAt: string;
    batch?: { name: string };
  }>;
}

export default function CoordinatorDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/coordinator/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
      published: 'success',
      approved: 'success',
      pending: 'warning',
      draft: 'info',
      rejected: 'danger',
    };
    return <Badge variant={variants[status] || 'info'}>{status}</Badge>;
  };

  if (loading) {
    return <Loading text="Loading dashboard..." />;
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Coordinator Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Timetable management and scheduling
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Active Timetables"
          value={stats?.activeTimetables || 0}
          icon="📅"
          description="Published"
        />
        <StatCard
          title="Draft Timetables"
          value={stats?.draftTimetables || 0}
          icon="📝"
          description="In progress"
        />
        <StatCard
          title="Pending Approval"
          value={stats?.pendingTimetables || 0}
          icon="⏳"
          description="Awaiting HOD"
        />
        <StatCard
          title="Conflicts"
          value={stats?.conflicts || 0}
          icon="⚠️"
          description="To resolve"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Rooms"
          value={stats?.totalRooms || 0}
          icon="🏫"
          description="Available"
        />
        <StatCard
          title="Batches"
          value={stats?.totalBatches || 0}
          icon="👥"
          description="Active"
        />
        <StatCard
          title="Time Slots"
          value={stats?.totalTimeSlots || 0}
          icon="⏰"
          description="Configured"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/coordinator/timetables/new"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            🆕 Create New Timetable
          </Link>
          <Link
            href="/coordinator/rooms"
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            🏫 Manage Rooms
          </Link>
          <Link
            href="/coordinator/batches"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            👥 Manage Batches
          </Link>
          <Link
            href="/coordinator/timeslots"
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            ⏰ Configure Time Slots
          </Link>
        </div>
      </div>

      {/* Recent Timetables */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Timetables
          </h2>
          <Link
            href="/coordinator/timetables"
            className="text-indigo-600 hover:text-indigo-700 text-sm"
          >
            View All →
          </Link>
        </div>
        {stats?.recentTimetables && stats.recentTimetables.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 text-sm">
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Batch</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Last Updated</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {stats.recentTimetables.map((timetable) => (
                  <tr key={timetable._id}>
                    <td className="py-3 text-gray-900 dark:text-white">
                      {timetable.name}
                    </td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">
                      {timetable.batch?.name || '-'}
                    </td>
                    <td className="py-3">{getStatusBadge(timetable.status)}</td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">
                      {new Date(timetable.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3">
                      <Link
                        href={`/coordinator/timetables/${timetable._id}`}
                        className="text-indigo-600 hover:text-indigo-700"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            No timetables created yet.{' '}
            <Link
              href="/coordinator/timetables/new"
              className="text-indigo-600 hover:underline"
            >
              Create your first timetable
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
