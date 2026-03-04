'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface Timetable {
  _id: string;
  name: string;
  department: { _id: string; name: string; code: string };
  batch?: { _id: string; name: string; year: number; division: string };
  academicYear: string;
  semester: number;
  status: 'draft' | 'pending' | 'approved' | 'published' | 'rejected';
  createdBy: { name: string };
  approvedBy?: { name: string };
  createdAt: string;
}

interface Department {
  _id: string;
  name: string;
  code: string;
}

export default function AdminTimetablesPage() {
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    fetchTimetables();
    fetchDepartments();
  }, [filterDept, filterStatus]);

  const fetchTimetables = async () => {
    try {
      let url = '/api/timetables?';
      if (filterDept) url += `department=${filterDept}&`;
      if (filterStatus) url += `status=${filterStatus}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTimetables(data.timetables || []);
      }
    } catch (error) {
      console.error('Error fetching timetables:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments');
      if (res.ok) {
        const data = await res.json();
        setDepartments(data.departments || []);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'approved':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'draft':
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const statusCounts = {
    published: timetables.filter((t) => t.status === 'published').length,
    approved: timetables.filter((t) => t.status === 'approved').length,
    pending: timetables.filter((t) => t.status === 'pending').length,
    draft: timetables.filter((t) => t.status === 'draft').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Timetables</h1>
          <p className="text-gray-600 dark:text-gray-400">
            View and manage all timetables across departments
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <p className="text-2xl font-bold text-green-600">{statusCounts.published}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Published</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <p className="text-2xl font-bold text-blue-600">{statusCounts.approved}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Approved</p>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
          <p className="text-2xl font-bold text-yellow-600">{statusCounts.pending}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/20 p-4 rounded-lg">
          <p className="text-2xl font-bold text-gray-600">{statusCounts.draft}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Drafts</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept._id} value={dept._id}>
                {dept.name}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Statuses</option>
            <option value="published">Published</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="draft">Draft</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Timetables List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Timetable
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Batch
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Semester
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Created By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {timetables.map((timetable) => (
                <tr key={timetable._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {timetable.name}
                    </div>
                    <div className="text-xs text-gray-500">{timetable.academicYear}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {timetable.department?.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {timetable.batch ? `Year ${timetable.batch.year} - ${timetable.batch.division}` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    Sem {timetable.semester}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(timetable.status)}`}>
                      {timetable.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {timetable.createdBy?.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Link
                      href={`/admin/timetables/${timetable._id}`}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {timetables.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400 mb-4">No timetables found</p>
          <p className="text-sm text-gray-400">
            Timetables are created by coordinators. Once created, they will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
