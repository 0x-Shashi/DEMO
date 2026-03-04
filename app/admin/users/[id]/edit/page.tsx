'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Input, Select, Loading } from '@/components/ui';

interface Department {
  _id: string;
  name: string;
  code: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  department?: { _id: string };
  phone?: string;
  employeeId?: string;
  isActive: boolean;
}

const roleOptions = [
  { value: 'admin', label: 'Admin' },
  { value: 'hod', label: 'HOD' },
  { value: 'coordinator', label: 'Coordinator' },
  { value: 'faculty', label: 'Faculty' },
  { value: 'student', label: 'Student' },
];

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    department: '',
    phone: '',
    employeeId: '',
    isActive: true,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch user and departments in parallel
        const [userRes, deptRes] = await Promise.all([
          fetch(`/api/users/${id}`),
          fetch('/api/departments?all=true'),
        ]);

        const userData = await userRes.json();
        const deptData = await deptRes.json();

        if (userRes.ok && userData.user) {
          const user: User = userData.user;
          setFormData({
            name: user.name,
            email: user.email,
            password: '',
            role: user.role,
            department: user.department?._id || '',
            phone: user.phone || '',
            employeeId: user.employeeId || '',
            isActive: user.isActive,
          });
        } else {
          setError('User not found');
        }

        if (deptRes.ok) {
          setDepartments(deptData.departments);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      // Only send password if it was changed
      const updateData = { ...formData };
      if (!updateData.password) {
        delete (updateData as Record<string, unknown>).password;
      }

      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const data = await res.json();

      if (res.ok) {
        router.push('/admin/users');
      } else {
        setError(data.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      setError('Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const departmentOptions = [
    { value: '', label: 'No Department' },
    ...departments.map(d => ({ value: d._id, label: `${d.name} (${d.code})` })),
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit User</h1>
        <p className="text-gray-600 dark:text-gray-400">Update user account details</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Full Name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="John Doe"
            />

            <Input
              label="Email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="john@college.edu"
            />

            <Input
              label="New Password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Leave blank to keep current"
            />

            <Select
              label="Role"
              required
              options={roleOptions}
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            />

            <Select
              label="Department"
              options={departmentOptions}
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            />

            <Input
              label="Phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+91 9876543210"
            />

            <Input
              label="Employee/Student ID"
              value={formData.employeeId}
              onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
              placeholder="EMP001 or STU001"
            />

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 text-indigo-600 rounded border-gray-300"
              />
              <label htmlFor="isActive" className="text-sm text-gray-700 dark:text-gray-300">
                Active Account
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/admin/users')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
