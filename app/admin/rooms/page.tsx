'use client';

import React, { useEffect, useState } from 'react';

interface Room {
  _id: string;
  name: string;
  building: string;
  floor: number;
  capacity: number;
  type: 'lecture' | 'lab' | 'seminar' | 'workshop';
  department?: { _id: string; name: string; code: string };
  hasProjector: boolean;
  hasAC: boolean;
  isActive: boolean;
}

export default function AdminRoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [filterBuilding, setFilterBuilding] = useState('');

  useEffect(() => {
    fetchRooms();
  }, [filterType, filterBuilding]);

  const fetchRooms = async () => {
    try {
      let url = '/api/rooms?';
      if (filterType) url += `type=${filterType}&`;
      if (filterBuilding) url += `building=${filterBuilding}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setRooms(data.rooms || []);
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildings = [...new Set(rooms.map((r) => r.building))];

  const groupedRooms = rooms.reduce((acc, room) => {
    const building = room.building || 'Unknown';
    if (!acc[building]) acc[building] = [];
    acc[building].push(room);
    return acc;
  }, {} as Record<string, Room[]>);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'lecture':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'lab':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'seminar':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'workshop':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Rooms</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage classrooms, labs, and other facilities
          </p>
        </div>
        <div className="text-right">
          <span className="text-3xl font-bold text-green-600">{rooms.length}</span>
          <p className="text-sm text-gray-500">Total Rooms</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <p className="text-2xl font-bold text-blue-600">{rooms.filter((r) => r.type === 'lecture').length}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Lecture Rooms</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <p className="text-2xl font-bold text-green-600">{rooms.filter((r) => r.type === 'lab').length}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Labs</p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
          <p className="text-2xl font-bold text-purple-600">{rooms.filter((r) => r.type === 'seminar').length}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Seminar Halls</p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
          <p className="text-2xl font-bold text-orange-600">{rooms.filter((r) => r.type === 'workshop').length}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Workshops</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Types</option>
            <option value="lecture">Lecture</option>
            <option value="lab">Lab</option>
            <option value="seminar">Seminar</option>
            <option value="workshop">Workshop</option>
          </select>
          <select
            value={filterBuilding}
            onChange={(e) => setFilterBuilding(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Buildings</option>
            {buildings.map((building) => (
              <option key={building} value={building}>
                {building}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Rooms by Building */}
      {Object.entries(groupedRooms).map(([building, buildingRooms]) => (
        <div key={building} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              🏢 {building}
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({buildingRooms.length} rooms)
              </span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {buildingRooms.map((room) => (
              <div
                key={room._id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{room.name}</h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(room.type)}`}>
                    {room.type}
                  </span>
                </div>
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <p>📍 Floor {room.floor}</p>
                  <p>👥 Capacity: {room.capacity}</p>
                  {room.department && <p>🏛️ {room.department.name}</p>}
                  <div className="flex gap-2 mt-2">
                    {room.hasProjector && (
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">📽️ Projector</span>
                    )}
                    {room.hasAC && (
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">❄️ AC</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {rooms.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">No rooms found</p>
        </div>
      )}
    </div>
  );
}
