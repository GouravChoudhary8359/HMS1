import { useState } from 'react';
import { Pencil, Plus, Search, X } from 'lucide-react';
import { apiFetch, ApiError } from '../lib/api';
import { validatePatientInput } from '../lib/hmsRules';
import type { Patient, Role, ValidationErrorMap } from '../lib/types';

interface PatientsViewProps {
  patients: Patient[];
  role: Role;
  onRefresh: () => Promise<void>;
  onNotify: (type: 'success' | 'error' | 'info', text: string) => void;
}

const BLOOD_GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

interface PatientFormState {
  fullName: string;
  age: string;
  gender: 'Male' | 'Female' | 'Other';
  phone: string;
  email: string;
  address: string;
  bloodGroup: string;
  emergencyContact: string;
  allergies: string;
}

const EMPTY_FORM: PatientFormState = {
  fullName: '',
  age: '',
  gender: 'Male',
  phone: '',
  email: '',
  address: '',
  bloodGroup: 'O+',
  emergencyContact: '',
  allergies: 'None known',
};

export function PatientsView({ patients, role, onRefresh, onNotify }: PatientsViewProps) {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [form, setForm] = useState<PatientFormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<ValidationErrorMap>({});
  const [saving, setSaving] = useState(false);

  const canModify = role === 'Admin' || role === 'Receptionist';

  const filtered = patients.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      p.fullName.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      p.phone.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q)
    );
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (p: Patient) => {
    setEditing(p);
    setForm({
      fullName: p.fullName,
      age: String(p.age),
      gender: p.gender,
      phone: p.phone,
      email: p.email,
      address: p.address,
      bloodGroup: p.bloodGroup,
      emergencyContact: p.emergencyContact,
      allergies: p.allergies || 'None known',
    });
    setErrors({});
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validatePatientInput(form);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await apiFetch(`/api/patients/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify({ ...form, age: Number(form.age) }),
        });
        onNotify('success', `Updated patient record ${editing.id}.`);
      } else {
        const res = await apiFetch<{ patient: Patient }>('/api/patients', {
          method: 'POST',
          body: JSON.stringify({ ...form, age: Number(form.age) }),
        });
        onNotify('success', `Registered patient ${res.patient.fullName} (${res.patient.id}).`);
      }
      setModalOpen(false);
      await onRefresh();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.errors) setErrors(err.errors);
        onNotify('error', err.message);
      } else {
        onNotify('error', 'Failed to save patient record.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-900">Patient Directory</h2>
          <p className="text-sm text-slate-600">
            Search, inspect, register, and update patient demographic and emergency records.
          </p>
        </div>

        {canModify && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Register Patient</span>
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <label htmlFor="patient-search" className="sr-only">
            Search patients
          </label>
          <input
            id="patient-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by patient ID, name, phone, or email..."
            className="w-full pl-9 pr-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-teal-700"
          />
        </div>
        <div className="text-xs text-slate-500 font-mono tabular-nums">
          Showing {filtered.length} of {patients.length} records
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className={`${selectedPatient ? 'lg:col-span-8' : 'lg:col-span-12'} bg-white border border-slate-200 rounded-xl overflow-hidden`}>
          {filtered.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-medium text-slate-900">No matching patient records found</p>
              <p className="mt-1 text-xs text-slate-500">
                Try clearing your search query or register a new patient.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 font-medium">Patient ID</th>
                    <th className="py-3 px-4 font-medium">Full Name</th>
                    <th className="py-3 px-4 font-medium">Age / Gender</th>
                    <th className="py-3 px-4 font-medium">Blood</th>
                    <th className="py-3 px-4 font-medium">Contact Phone</th>
                    <th className="py-3 px-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filtered.map((p) => (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-50/80 ${selectedPatient?.id === p.id ? 'bg-teal-50/40' : ''}`}
                    >
                      <td className="py-3 px-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                        {p.id}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">
                        {p.fullName}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap tabular-nums">
                        {p.age} yrs · {p.gender}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-800 whitespace-nowrap">
                        {p.bloodGroup}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                        {p.phone}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedPatient(p)}
                            className="px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-100 rounded-md cursor-pointer"
                          >
                            View
                          </button>
                          {canModify && (
                            <button
                              type="button"
                              onClick={() => openEdit(p)}
                              aria-label={`Edit ${p.fullName}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-teal-800 border border-teal-200 bg-teal-50 hover:bg-teal-100 rounded-md cursor-pointer"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selectedPatient && (
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-4 self-start">
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-200">
              <div>
                <div className="font-mono text-xs text-teal-800">{selectedPatient.id}</div>
                <h3 className="text-lg font-display font-bold text-slate-900">
                  {selectedPatient.fullName}
                </h3>
                <p className="text-xs text-slate-600">
                  {selectedPatient.age} years · {selectedPatient.gender} · Blood Group{' '}
                  <span className="font-mono font-semibold">{selectedPatient.bloodGroup}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPatient(null)}
                aria-label="Close patient details"
                className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs font-medium text-slate-500">Phone</dt>
                <dd className="font-mono text-slate-900">{selectedPatient.phone}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Email</dt>
                <dd className="text-slate-900">{selectedPatient.email || 'Not provided'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Residential Address</dt>
                <dd className="text-slate-900">{selectedPatient.address}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Emergency Contact</dt>
                <dd className="text-slate-900">{selectedPatient.emergencyContact}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Allergies</dt>
                <dd className="text-slate-900">{selectedPatient.allergies || 'None known'}</dd>
              </div>
            </dl>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="patient-modal-title"
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 id="patient-modal-title" className="font-display font-bold text-slate-900">
                {editing ? `Update Patient · ${editing.id}` : 'Register New Patient'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close modal"
                className="p-1 text-slate-500 hover:text-slate-900 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label htmlFor="pat-name" className="block text-xs font-medium text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    id="pat-name"
                    type="text"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                  {errors.fullName && <p className="mt-1 text-xs text-red-700">{errors.fullName}</p>}
                </div>

                <div>
                  <label htmlFor="pat-age" className="block text-xs font-medium text-slate-700 mb-1">
                    Age (Years) *
                  </label>
                  <input
                    id="pat-age"
                    type="number"
                    min={0}
                    max={120}
                    value={form.age}
                    onChange={(e) => setForm({ ...form, age: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                  {errors.age && <p className="mt-1 text-xs text-red-700">{errors.age}</p>}
                </div>

                <div>
                  <label htmlFor="pat-gender" className="block text-xs font-medium text-slate-700 mb-1">
                    Gender *
                  </label>
                  <select
                    id="pat-gender"
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value as PatientFormState['gender'] })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  {errors.gender && <p className="mt-1 text-xs text-red-700">{errors.gender}</p>}
                </div>

                <div>
                  <label htmlFor="pat-phone" className="block text-xs font-medium text-slate-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    id="pat-phone"
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+91 98111 22000"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                  {errors.phone && <p className="mt-1 text-xs text-red-700">{errors.phone}</p>}
                </div>

                <div>
                  <label htmlFor="pat-blood" className="block text-xs font-medium text-slate-700 mb-1">
                    Blood Group *
                  </label>
                  <select
                    id="pat-blood"
                    value={form.bloodGroup}
                    onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                  >
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                  {errors.bloodGroup && <p className="mt-1 text-xs text-red-700">{errors.bloodGroup}</p>}
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="pat-email" className="block text-xs font-medium text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    id="pat-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                  {errors.email && <p className="mt-1 text-xs text-red-700">{errors.email}</p>}
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="pat-address" className="block text-xs font-medium text-slate-700 mb-1">
                    Residential Address *
                  </label>
                  <input
                    id="pat-address"
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                  {errors.address && <p className="mt-1 text-xs text-red-700">{errors.address}</p>}
                </div>

                <div>
                  <label htmlFor="pat-emergency" className="block text-xs font-medium text-slate-700 mb-1">
                    Emergency Contact *
                  </label>
                  <input
                    id="pat-emergency"
                    type="text"
                    value={form.emergencyContact}
                    onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
                    placeholder="Name (+91 ...)"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                  {errors.emergencyContact && (
                    <p className="mt-1 text-xs text-red-700">{errors.emergencyContact}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="pat-allergies" className="block text-xs font-medium text-slate-700 mb-1">
                    Known Allergies
                  </label>
                  <input
                    id="pat-allergies"
                    type="text"
                    value={form.allergies}
                    onChange={(e) => setForm({ ...form, allergies: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-60 rounded-lg cursor-pointer"
                >
                  {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
