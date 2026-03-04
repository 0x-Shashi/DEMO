'use client';

import React, { useEffect, useState } from 'react';

interface Batch {
  _id: string;
  name: string;
  department: { _id: string; name: string; code: string };
  year: number;
  semester: number;
  division: string;
  studentCount: number;
  academicYear: string;
  isActive: boolean;
}

interface Department {
  _id: string;
  name: string;
  code: string;
}

export default function AdminBatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDept, setFilterDept] = useState('');
  const [filterYear, setFilterYear] = useState('');

  useEffect(() => {
    fetchBatches();
    fetchDepartments();
  }, [filterDept, filterYear]);

  const fetchBatches = async () => {
    try {
      let url = '/api/batches?';
      if (filterDept) url += `department=${filterDept}&`;
      if (filterYear) url += `year=${filterYear}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setBatches(data.batches || []);
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
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

  const groupedBatches = batches.reduce((acc, batch) => {
    const deptName = batch.department?.name || 'Unknown';
    if (!acc[deptName]) acc[deptName] = {};
    const yearKey = `Year ${batch.year}`;
    if (!acc[deptName][yearKey]) acc[deptName][yearKey] = [];
    acc[deptName][yearKey].push(batch);
    return acc;
  }, {} as Record<string, Record<string, Batch[]>>);

  const totalStudents = batches.reduce((sum, b) => sum + (b.studentCount || 0), 0);

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Batches</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage student batches and sections
          </p>
        </div>
        <div className="flex gap-6">
          <div className="text-right">
            <span className="text-3xl font-bold text-blue-600">{batches.length}</span>
            <p className="text-sm text-gray-500">Total Batches</p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-bold text-green-600">{totalStudents}</span>
            <p className="text-sm text-gray-500">Total Students</p>
          </div>
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
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Years</option>
            {[1, 2, 3, 4].map((year) => (
              <option key={year} value={year}>
                Year {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Batches by Department */}
      {Object.entries(groupedBatches).map(([deptName, years]) => (
        <div key={deptName} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              🏛️ {deptName}
            </h2>
          </div>
          <div className="p-6">
            {Object.entries(years).map(([yearName, yearBatches]) => (
              <div key={yearName} className="mb-6 last:mb-0">
                <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  📚 {yearName}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {yearBatches.map((batch) => (
                    <div
                      key={batch._id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          Section {batch.division}
                        </h4>
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          Sem {batch.semester}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                        <p>👥 {batch.studentCount} Students</p>
                        <p>📅 {batch.academicYear}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {batches.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">No batches found</p>
        </div>
      )}
    </div>
  );
}
