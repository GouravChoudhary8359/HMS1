import { useState } from 'react';
import { Pencil, Plus, X } from 'lucide-react';
import { apiFetch, ApiError } from '../lib/api';
import { validateDepartmentInput, validateDoctorInput } from '../lib/hmsRules';
import type { Department, Doctor, Role, ValidationErrorMap } from '../lib/types';
import { StatusTag } from './StatusTag';

interface DoctorsDepartmentsViewProps {
  doctors: Doctor[];
  departments: Department[];
  role: Role;
  linkedDoctorId?: string;
  onRefresh: () => Promise<void>;
  onNotify: (type: 'success' | 'error' | 'info', text: string) => void;
  onBookWithDoctor: (doctorId: string) => void;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DEFAULT_SLOTS = ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'];

export function DoctorsDepartmentsView({
  doctors,
  departments,
  role,
  linkedDoctorId,
  onRefresh,
  onNotify,
  onBookWithDoctor,
}: DoctorsDepartmentsViewProps) {
  const [tab, setTab] = useState<'doctors' | 'departments'>('doctors');
  const [deptFilter, setDeptFilter] = useState('all');

  // Doctor modal state
  const [docModal, setDocModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Doctor | null>(null);
  const [docForm, setDocForm] = useState({
    fullName: '',
    departmentId: departments[0]?.id || '',
    specialization: '',
    qualification: 'MBBS, MD',
    phone: '',
    email: '',
    consultationFee: '700',
    availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as string[],
    timeSlotsText: '09:00 AM, 10:00 AM, 11:00 AM, 02:00 PM',
    available: true,
  });
  const [docErrors, setDocErrors] = useState<ValidationErrorMap>({});

  // Department modal state
  const [deptModal, setDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptForm, setDeptForm] = useState({
    code: '',
    name: '',
    floor: '',
    headDoctorName: '',
    description: '',
  });
  const [deptErrors, setDeptErrors] = useState<ValidationErrorMap>({});

  const canManage = role === 'Admin' || role === 'Receptionist';
  const deptName = (id: string) => departments.find((d) => d.id === id)?.name || 'Unassigned';

  const visibleDoctors = doctors.filter((d) =>
    deptFilter === 'all' ? true : d.departmentId === deptFilter
  );

  const openCreateDoc = () => {
    setEditingDoc(null);
    setDocForm({
      fullName: '',
      departmentId: departments[0]?.id || '',
      specialization: '',
      qualification: 'MBBS, MD',
      phone: '',
      email: '',
      consultationFee: '700',
      availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      timeSlotsText: '09:00 AM, 10:00 AM, 11:00 AM, 02:00 PM',
      available: true,
    });
    setDocErrors({});
    setDocModal(true);
  };

  const openEditDoc = (d: Doctor) => {
    setEditingDoc(d);
    setDocForm({
      fullName: d.fullName,
      departmentId: d.departmentId,
      specialization: d.specialization,
      qualification: d.qualification,
      phone: d.phone,
      email: d.email,
      consultationFee: String(d.consultationFee),
      availableDays: d.availableDays,
      timeSlotsText: d.timeSlots.join(', '),
      available: d.available,
    });
    setDocErrors({});
    setDocModal(true);
  };

  const saveDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    const timeSlots = docForm.timeSlotsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const payload = {
      ...docForm,
      consultationFee: Number(docForm.consultationFee),
      timeSlots,
    };
    const errs = validateDoctorInput(payload);
    if (Object.keys(errs).length > 0) {
      setDocErrors(errs);
      return;
    }

    try {
      if (editingDoc) {
        await apiFetch(`/api/doctors/${editingDoc.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        onNotify('success', `Updated ${payload.fullName}.`);
      } else {
        await apiFetch('/api/doctors', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        onNotify('success', `Added ${payload.fullName} to directory.`);
      }
      setDocModal(false);
      await onRefresh();
    } catch (err) {
      onNotify('error', err instanceof ApiError ? err.message : 'Failed to save doctor.');
    }
  };

  const openCreateDept = () => {
    setEditingDept(null);
    setDeptForm({ code: '', name: '', floor: '', headDoctorName: '', description: '' });
    setDeptErrors({});
    setDeptModal(true);
  };

  const openEditDept = (dept: Department) => {
    setEditingDept(dept);
    setDeptForm({
      code: dept.code,
      name: dept.name,
      floor: dept.floor,
      headDoctorName: dept.headDoctorName,
      description: dept.description,
    });
    setDeptErrors({});
    setDeptModal(true);
  };

  const saveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateDepartmentInput(deptForm);
    if (Object.keys(errs).length > 0) {
      setDeptErrors(errs);
      return;
    }
    try {
      if (editingDept) {
        await apiFetch(`/api/departments/${editingDept.id}`, {
          method: 'PUT',
          body: JSON.stringify(deptForm),
        });
        onNotify('success', `Updated department ${deptForm.name}.`);
      } else {
        await apiFetch('/api/departments', {
          method: 'POST',
          body: JSON.stringify(deptForm),
        });
        onNotify('success', `Created department ${deptForm.name}.`);
      }
      setDeptModal(false);
      await onRefresh();
    } catch (err) {
      onNotify('error', err instanceof ApiError ? err.message : 'Failed to save department.');
    }
  };

  const toggleDay = (day: string) => {
    setDocForm((prev) => ({
      ...prev,
      availableDays: prev.availableDays.includes(day)
        ? prev.availableDays.filter((d) => d !== day)
        : [...prev.availableDays, day],
    }));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-900">
            Doctors &amp; Hospital Departments
          </h2>
          <p className="text-sm text-slate-600">
            View clinician availability schedules, consultation slots, and clinical departments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
            <button
              type="button"
              onClick={() => setTab('doctors')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                tab === 'doctors' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Doctors ({doctors.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('departments')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                tab === 'departments' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Departments ({departments.length})
            </button>
          </div>

          {canManage && (
            <button
              type="button"
              onClick={tab === 'doctors' ? openCreateDoc : openCreateDept}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{tab === 'doctors' ? 'Add Doctor' : 'Add Department'}</span>
            </button>
          )}
        </div>
      </div>

      {tab === 'doctors' ? (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <label htmlFor="doc-dept-filter" className="text-xs font-medium text-slate-600">
                Filter by Department:
              </label>
              <select
                id="doc-dept-filter"
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
              >
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-xs text-slate-500 font-mono tabular-nums">
              {visibleDoctors.filter((d) => d.available).length} available for booking
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {visibleDoctors.map((doc) => {
              const canEditThis = canManage || (role === 'Doctor' && linkedDoctorId === doc.id);
              return (
                <div
                  key={doc.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-display font-bold text-slate-900">{doc.fullName}</h3>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {deptName(doc.departmentId)} · {doc.specialization}
                        </p>
                      </div>
                      <StatusTag
                        label={doc.available ? 'Available' : 'Unavailable'}
                        tone={doc.available ? 'success' : 'danger'}
                      />
                    </div>

                    <div className="mt-4 space-y-2 text-xs text-slate-600">
                      <div>
                        <span className="text-slate-500">Qualification:</span> {doc.qualification}
                      </div>
                      <div>
                        <span className="text-slate-500">Days:</span> {doc.availableDays.join(', ')}
                      </div>
                      <div>
                        <span className="text-slate-500">Slots:</span>{' '}
                        <span className="font-mono text-slate-800">{doc.timeSlots.join(' · ')}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Fee:</span>{' '}
                        <span className="font-mono font-semibold text-slate-900 tabular-nums">
                          ₹{doc.consultationFee}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                    {canEditThis ? (
                      <button
                        type="button"
                        onClick={() => openEditDoc(doc)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Edit Schedule</span>
                      </button>
                    ) : (
                      <span className="text-xs text-slate-500 font-mono">{doc.phone}</span>
                    )}

                    {role !== 'Doctor' && doc.available && (
                      <button
                        type="button"
                        onClick={() => onBookWithDoctor(doc.id)}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg cursor-pointer whitespace-nowrap"
                      >
                        Book Slot
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-medium">Code</th>
                  <th className="py-3 px-4 font-medium">Department</th>
                  <th className="py-3 px-4 font-medium">Location</th>
                  <th className="py-3 px-4 font-medium">Head of Dept</th>
                  <th className="py-3 px-4 font-medium">Doctors</th>
                  {canManage && <th className="py-3 px-4 font-medium text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {departments.map((dept) => {
                  const count = doctors.filter((d) => d.departmentId === dept.id).length;
                  return (
                    <tr key={dept.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-teal-800 whitespace-nowrap">
                        {dept.code}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{dept.name}</div>
                        <div className="text-xs text-slate-500">{dept.description}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{dept.floor}</td>
                      <td className="py-3 px-4 text-slate-700 whitespace-nowrap">{dept.headDoctorName}</td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-800 tabular-nums whitespace-nowrap">
                        {count} clinicians
                      </td>
                      {canManage && (
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openEditDept(dept)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-teal-800 border border-teal-200 bg-teal-50 hover:bg-teal-100 rounded-md cursor-pointer"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Doctor Modal */}
      {docModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="doc-modal-title"
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 id="doc-modal-title" className="font-display font-bold text-slate-900">
                {editingDoc ? `Edit Doctor · ${editingDoc.fullName}` : 'Add New Doctor'}
              </h3>
              <button
                type="button"
                onClick={() => setDocModal(false)}
                aria-label="Close doctor modal"
                className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={saveDoctor} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label htmlFor="doc-name" className="block text-xs font-medium text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    id="doc-name"
                    type="text"
                    value={docForm.fullName}
                    onChange={(e) => setDocForm({ ...docForm, fullName: e.target.value })}
                    placeholder="Dr. Arjun Malhotra"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                  {docErrors.fullName && <p className="mt-1 text-xs text-red-700">{docErrors.fullName}</p>}
                </div>

                <div>
                  <label htmlFor="doc-dept" className="block text-xs font-medium text-slate-700 mb-1">
                    Department *
                  </label>
                  <select
                    id="doc-dept"
                    value={docForm.departmentId}
                    onChange={(e) => setDocForm({ ...docForm, departmentId: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="doc-spec" className="block text-xs font-medium text-slate-700 mb-1">
                    Specialization *
                  </label>
                  <input
                    id="doc-spec"
                    type="text"
                    value={docForm.specialization}
                    onChange={(e) => setDocForm({ ...docForm, specialization: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                  {docErrors.specialization && (
                    <p className="mt-1 text-xs text-red-700">{docErrors.specialization}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="doc-phone" className="block text-xs font-medium text-slate-700 mb-1">
                    Phone *
                  </label>
                  <input
                    id="doc-phone"
                    type="text"
                    value={docForm.phone}
                    onChange={(e) => setDocForm({ ...docForm, phone: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                  {docErrors.phone && <p className="mt-1 text-xs text-red-700">{docErrors.phone}</p>}
                </div>

                <div>
                  <label htmlFor="doc-email" className="block text-xs font-medium text-slate-700 mb-1">
                    Email *
                  </label>
                  <input
                    id="doc-email"
                    type="email"
                    value={docForm.email}
                    onChange={(e) => setDocForm({ ...docForm, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                  {docErrors.email && <p className="mt-1 text-xs text-red-700">{docErrors.email}</p>}
                </div>

                <div>
                  <label htmlFor="doc-qual" className="block text-xs font-medium text-slate-700 mb-1">
                    Qualification
                  </label>
                  <input
                    id="doc-qual"
                    type="text"
                    value={docForm.qualification}
                    onChange={(e) => setDocForm({ ...docForm, qualification: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label htmlFor="doc-fee" className="block text-xs font-medium text-slate-700 mb-1">
                    Consultation Fee (₹) *
                  </label>
                  <input
                    id="doc-fee"
                    type="number"
                    min={0}
                    value={docForm.consultationFee}
                    onChange={(e) => setDocForm({ ...docForm, consultationFee: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="sm:col-span-2">
                  <span className="block text-xs font-medium text-slate-700 mb-1.5">Available Days *</span>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((day) => {
                      const active = docForm.availableDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          className={`px-3 py-1 text-xs font-medium rounded-md border cursor-pointer ${
                            active
                              ? 'bg-teal-700 text-white border-teal-700'
                              : 'bg-white text-slate-700 border-slate-300'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                  {docErrors.availableDays && (
                    <p className="mt-1 text-xs text-red-700">{docErrors.availableDays}</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="doc-slots" className="block text-xs font-medium text-slate-700 mb-1">
                    Time Slots (comma-separated) *
                  </label>
                  <input
                    id="doc-slots"
                    type="text"
                    value={docForm.timeSlotsText}
                    onChange={(e) => setDocForm({ ...docForm, timeSlotsText: e.target.value })}
                    placeholder={DEFAULT_SLOTS.join(', ')}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                  {docErrors.timeSlots && <p className="mt-1 text-xs text-red-700">{docErrors.timeSlots}</p>}
                </div>

                <div className="sm:col-span-2 flex items-center gap-2">
                  <input
                    id="doc-avail"
                    type="checkbox"
                    checked={docForm.available}
                    onChange={(e) => setDocForm({ ...docForm, available: e.target.checked })}
                    className="w-4 h-4 accent-teal-700"
                  />
                  <label htmlFor="doc-avail" className="text-sm text-slate-700">
                    Currently available for appointment bookings
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDocModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg cursor-pointer"
                >
                  Save Doctor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Department Modal */}
      {deptModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="dept-modal-title"
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 id="dept-modal-title" className="font-display font-bold text-slate-900">
                {editingDept ? `Edit Department · ${editingDept.code}` : 'Create Department'}
              </h3>
              <button
                type="button"
                onClick={() => setDeptModal(false)}
                aria-label="Close department modal"
                className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={saveDepartment} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="dept-code" className="block text-xs font-medium text-slate-700 mb-1">
                    Department Code *
                  </label>
                  <input
                    id="dept-code"
                    type="text"
                    value={deptForm.code}
                    onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                    placeholder="PULM"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                  {deptErrors.code && <p className="mt-1 text-xs text-red-700">{deptErrors.code}</p>}
                </div>

                <div>
                  <label htmlFor="dept-name" className="block text-xs font-medium text-slate-700 mb-1">
                    Department Name *
                  </label>
                  <input
                    id="dept-name"
                    type="text"
                    value={deptForm.name}
                    onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                    placeholder="Pulmonology"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                  {deptErrors.name && <p className="mt-1 text-xs text-red-700">{deptErrors.name}</p>}
                </div>

                <div>
                  <label htmlFor="dept-floor" className="block text-xs font-medium text-slate-700 mb-1">
                    Floor / Wing *
                  </label>
                  <input
                    id="dept-floor"
                    type="text"
                    value={deptForm.floor}
                    onChange={(e) => setDeptForm({ ...deptForm, floor: e.target.value })}
                    placeholder="3rd Floor · Wing A"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                  {deptErrors.floor && <p className="mt-1 text-xs text-red-700">{deptErrors.floor}</p>}
                </div>

                <div>
                  <label htmlFor="dept-head" className="block text-xs font-medium text-slate-700 mb-1">
                    Head of Department *
                  </label>
                  <input
                    id="dept-head"
                    type="text"
                    value={deptForm.headDoctorName}
                    onChange={(e) => setDeptForm({ ...deptForm, headDoctorName: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                  {deptErrors.headDoctorName && (
                    <p className="mt-1 text-xs text-red-700">{deptErrors.headDoctorName}</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="dept-desc" className="block text-xs font-medium text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="dept-desc"
                    rows={2}
                    value={deptForm.description}
                    onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeptModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg cursor-pointer"
                >
                  Save Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
