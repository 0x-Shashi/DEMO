'use client';

import React, { useEffect, useState } from 'react';

interface TimeSlot {
  _id: string;
  name: string;
  startTime: string;
  endTime: string;
  slotNumber: number;
  type: 'theory' | 'practical' | 'break' | 'lunch';
  duration: number;
  isActive: boolean;
}

export default function AdminTimeSlotsPage() {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimeSlots();
  }, []);

  const fetchTimeSlots = async () => {
    try {
      const res = await fetch('/api/time-slots');
      if (res.ok) {
        const data = await res.json();
        setTimeSlots(data.timeSlots || []);
      }
    } catch (error) {
      console.error('Error fetching time slots:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'theory':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'practical':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'lunch':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'break':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Time Slots</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage class periods and breaks schedule
          </p>
        </div>
        <div className="text-right">
          <span className="text-3xl font-bold text-purple-600">{timeSlots.length}</span>
          <p className="text-sm text-gray-500">Total Slots</p>
        </div>
      </div>

      {/* Visual Timeline */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Daily Schedule</h2>
        <div className="space-y-2">
          {timeSlots.map((slot, index) => (
            <div
              key={slot._id}
              className={`flex items-center gap-4 p-4 rounded-lg ${
                slot.type === 'lunch' || slot.type === 'break'
                  ? 'bg-orange-50 dark:bg-orange-900/20'
                  : 'bg-blue-50 dark:bg-blue-900/20'
              }`}
            >
              <div className="w-24 text-center">
                <p className="text-lg font-bold text-gray-900 dark:text-white">{slot.startTime}</p>
                <p className="text-xs text-gray-500">to</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{slot.endTime}</p>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">
                    {slot.type === 'lunch' ? '🍽️' : slot.type === 'break' ? '☕' : '📚'}
                  </span>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{slot.name}</h3>
                    <p className="text-sm text-gray-500">{slot.duration} minutes</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${getTypeColor(slot.type)}`}>
                  {slot.type}
                </span>
                <span className="px-3 py-1 text-sm font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                  Slot #{slot.slotNumber}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Table View */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Time Slots Details</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Slot #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Start Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  End Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Type
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {timeSlots.map((slot) => (
                <tr key={slot._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {slot.slotNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {slot.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {slot.startTime}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {slot.endTime}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {slot.duration} min
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(slot.type)}`}>
                      {slot.type}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {timeSlots.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">No time slots configured</p>
        </div>
      )}
    </div>
  );
}
