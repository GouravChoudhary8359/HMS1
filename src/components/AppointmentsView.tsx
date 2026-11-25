import { useEffect, useState } from 'react';
import { CalendarPlus, Check, RefreshCw, X } from 'lucide-react';
import { apiFetch, ApiError } from '../lib/api';
import type {
  Appointment,
  AppointmentStatus,
  Department,
  Doctor,
  Patient,
  PriorityLevel,
  Role,
} from '../lib/types';
import { PersonSelectorField } from './PersonSelectorField';
import { StatusTag, statusToneFor } from './StatusTag';

interface AppointmentsViewProps {
  appointments: Appointment[];
  patients: Patient[];
  doctors: Doctor[];
  departments: Department[];
  role: Role;
  linkedPatientId?: string;
  prefillDoctorId?: string;
  prefillDepartmentName?: string;
  prefillPriority?: PriorityLevel;
  prefillSymptoms?: string;
  onClearPrefill: () => void;
  onRefresh: () => Promise<void>;
  onNotify: (type: 'success' | 'error' | 'info', text: string) => void;
}

export function AppointmentsView({
  appointments,
  patients,
  doctors,
  departments,
  role,
  linkedPatientId,
  prefillDoctorId,
  prefillDepartmentName,
  prefillPriority,
  prefillSymptoms,
  onClearPrefill,
  onRefresh,
  onNotify,
}: AppointmentsViewProps) {
  const [statusFilter, setStatusFilter] = useState<'All' | AppointmentStatus>('All');
  const [bookModal, setBookModal] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);

  const DEFAULT_SLOTS = ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'];

  const [form, setForm] = useState({
    patientMode: 'select' as 'select' | 'manual',
    patientId: linkedPatientId || patients[0]?.id || '',
    manualPatientName: '',
    doctorMode: 'select' as 'select' | 'manual',
    doctorId: doctors[0]?.id || '',
    manualDoctorName: '',
    date: '2026-11-20',
    timeSlot: doctors[0]?.timeSlots[0] || '09:00 AM',
    priority: 'Low' as PriorityLevel,
    symptoms: '',
    notes: '',
  });

  const [conflictMsg, setConflictMsg] = useState('');
  const [alternativeSlots, setAlternativeSlots] = useState<string[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const canBook = role === 'Admin' || role === 'Receptionist' || role === 'Patient';
  const canDoctorDecide = role === 'Doctor' || role === 'Admin';

  // Apply prefill if routed from Doctors or AI Advisory
  useEffect(() => {
    if (prefillDoctorId || prefillDepartmentName || prefillPriority || prefillSymptoms) {
      let matchedDoc = doctors.find((d) => d.id === prefillDoctorId);
      if (!matchedDoc && prefillDepartmentName) {
        const dept = departments.find(
          (dp) => dp.name.toLowerCase() === prefillDepartmentName.toLowerCase()
        );
        if (dept) {
          matchedDoc = doctors.find((d) => d.departmentId === dept.id && d.available) ||
            doctors.find((d) => d.departmentId === dept.id);
        }
      }
      const doc = matchedDoc || doctors[0];
      setForm((prev) => ({
        ...prev,
        patientId: linkedPatientId || prev.patientId || patients[0]?.id || '',
        doctorId: doc?.id || prev.doctorId,
        timeSlot: doc?.timeSlots[0] || prev.timeSlot,
        priority: prefillPriority || prev.priority,
        symptoms: prefillSymptoms || prev.symptoms,
      }));
      setBookModal(true);
      onClearPrefill();
    }
  }, [prefillDoctorId, prefillDepartmentName, prefillPriority, prefillSymptoms, doctors, departments, linkedPatientId, patients, onClearPrefill]);

  // Fetch live availability when booking or rescheduling
  useEffect(() => {
    if (!bookModal && !rescheduleTarget) return;
    if (!rescheduleTarget && form.doctorMode === 'manual') {
      setAvailableSlots(DEFAULT_SLOTS);
      return;
    }
    const targetDocId = rescheduleTarget ? rescheduleTarget.doctorId : form.doctorId;
    const targetDate = form.date;
    if (!targetDocId || !targetDate) return;

    const excludeQuery = rescheduleTarget ? `&excludeId=${rescheduleTarget.id}` : '';
    apiFetch<{ availableSlots: string[] }>(
      `/api/appointments/availability?doctorId=${encodeURIComponent(targetDocId)}&date=${encodeURIComponent(targetDate)}${excludeQuery}`
    )
      .then((res) => setAvailableSlots(res.availableSlots))
      .catch(() => setAvailableSlots([]));
  }, [bookModal, rescheduleTarget, form.doctorMode, form.doctorId, form.date]);

  const patientName = (id: string, fallback?: string) =>
    patients.find((p) => p.id === id)?.fullName || fallback || id;
  const doctorObj = (id: string) => doctors.find((d) => d.id === id);
  const deptName = (id: string) => departments.find((d) => d.id === id)?.name || id;

  const filtered = appointments.filter((a) =>
    statusFilter === 'All' ? true : a.status === statusFilter
  );

  const openBook = () => {
    const firstDoc = doctors.find((d) => d.available) || doctors[0];
    setForm({
      patientMode: 'select',
      patientId: linkedPatientId || patients[0]?.id || '',
      manualPatientName: '',
      doctorMode: 'select',
      doctorId: firstDoc?.id || '',
      manualDoctorName: '',
      date: '2026-11-20',
      timeSlot: firstDoc?.timeSlots[0] || '09:00 AM',
      priority: 'Low',
      symptoms: '',
      notes: '',
    });
    setConflictMsg('');
    setAlternativeSlots([]);
    setRescheduleTarget(null);
    setBookModal(true);
  };

  const openReschedule = (apt: Appointment) => {
    setRescheduleTarget(apt);
    setForm((prev) => ({
      ...prev,
      doctorMode: 'select',
      doctorId: apt.doctorId,
      date: apt.date,
      timeSlot: apt.timeSlot,
    }));
    setConflictMsg('');
    setAlternativeSlots([]);
  };

  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConflictMsg('');
    setAlternativeSlots([]);

    if (role !== 'Patient' && form.patientMode === 'manual' && form.manualPatientName.trim().length < 2) {
      setConflictMsg('Please enter a valid patient name (at least 2 characters).');
      return;
    }
    if (form.doctorMode === 'manual' && form.manualDoctorName.trim().length < 2) {
      setConflictMsg('Please enter a valid doctor name (at least 2 characters).');
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch('/api/appointments', {
        method: 'POST',
        body: JSON.stringify({
          patientId: form.patientMode === 'select' ? form.patientId : undefined,
          manualPatientName:
            role !== 'Patient' && form.patientMode === 'manual'
              ? form.manualPatientName.trim()
              : undefined,
          doctorId: form.doctorMode === 'select' ? form.doctorId : undefined,
          manualDoctorName:
            form.doctorMode === 'manual' ? form.manualDoctorName.trim() : undefined,
          date: form.date,
          timeSlot: form.timeSlot,
          priority: form.priority,
          symptoms: form.symptoms,
          notes: form.notes,
        }),
      });
      onNotify('success', 'Appointment scheduled successfully.');
      setBookModal(false);
      await onRefresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setConflictMsg(err.message);
        if (err.availableSlots) {
          setAlternativeSlots(err.availableSlots);
        }
      } else {
        setConflictMsg('Unable to book appointment.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleTarget) return;
    setConflictMsg('');
    setAlternativeSlots([]);
    setSubmitting(true);
    try {
      await apiFetch(`/api/appointments/${rescheduleTarget.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          date: form.date,
          timeSlot: form.timeSlot,
          status: 'Scheduled',
        }),
      });
      onNotify('success', `Rescheduled appointment ${rescheduleTarget.id}.`);
      setRescheduleTarget(null);
      await onRefresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setConflictMsg(err.message);
        if (err.availableSlots) setAlternativeSlots(err.availableSlots);
      } else {
        setConflictMsg('Unable to reschedule appointment.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const updateAppointment = async (
    id: string,
    patch: { status?: AppointmentStatus; doctorDecision?: 'Accepted' | 'Rejected' }
  ) => {
    try {
      await apiFetch(`/api/appointments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(patch),
      });
      onNotify('success', `Appointment ${id} updated.`);
      await onRefresh();
    } catch (err) {
      onNotify('error', err instanceof ApiError ? err.message : 'Update failed.');
    }
  };

  const activeDoctorForModal = doctorObj(rescheduleTarget ? rescheduleTarget.doctorId : form.doctorId);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-900">Appointment Management</h2>
          <p className="text-sm text-slate-600">
            Schedule consultations with real-time slot conflict checks, doctor confirmation, and rescheduling.
          </p>
        </div>

        {canBook && (
          <button
            type="button"
            onClick={openBook}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
          >
            <CalendarPlus className="w-4 h-4" />
            <span>Book Appointment</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {(['All', 'Scheduled', 'Completed', 'Cancelled'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                statusFilter === status
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        <div className="text-xs font-mono text-slate-500 tabular-nums">
          {filtered.length} appointment(s)
        </div>
      </div>

      {/* Appointments Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No appointments match the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-medium">ID</th>
                  <th className="py-3 px-4 font-medium">Patient</th>
                  <th className="py-3 px-4 font-medium">Doctor &amp; Dept</th>
                  <th className="py-3 px-4 font-medium">Date &amp; Slot</th>
                  <th className="py-3 px-4 font-medium">Priority</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium">Doctor Review</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((apt) => {
                  const doc = doctorObj(apt.doctorId);
                  return (
                    <tr key={apt.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                        {apt.id}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">
                          {patientName(apt.patientId, apt.patientName)}
                        </div>
                        <div className="text-xs text-slate-500 max-w-xs truncate">{apt.symptoms}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-slate-900">
                          {doc?.fullName || apt.doctorName || apt.doctorId}
                        </div>
                        <div className="text-xs text-slate-500">{deptName(apt.departmentId)}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-700 whitespace-nowrap tabular-nums">
                        {apt.date} · {apt.timeSlot}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusTag label={apt.priority} tone={statusToneFor(apt.priority)} />
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusTag label={apt.status} tone={statusToneFor(apt.status)} />
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusTag label={apt.doctorDecision} tone={statusToneFor(apt.doctorDecision)} />
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {canDoctorDecide && apt.status === 'Scheduled' && apt.doctorDecision === 'Pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() => updateAppointment(apt.id, { doctorDecision: 'Accepted' })}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded cursor-pointer"
                              >
                                <Check className="w-3 h-3" />
                                <span>Accept</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => updateAppointment(apt.id, { doctorDecision: 'Rejected' })}
                                className="px-2 py-1 text-xs font-medium text-red-800 bg-red-50 border border-red-200 hover:bg-red-100 rounded cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {canDoctorDecide && apt.status === 'Scheduled' && (
                            <button
                              type="button"
                              onClick={() => updateAppointment(apt.id, { status: 'Completed' })}
                              className="px-2.5 py-1 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded cursor-pointer"
                            >
                              Complete
                            </button>
                          )}
                          {apt.status === 'Scheduled' && (
                            <>
                              <button
                                type="button"
                                onClick={() => openReschedule(apt)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-100 rounded cursor-pointer"
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span>Reschedule</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => updateAppointment(apt.id, { status: 'Cancelled' })}
                                className="px-2.5 py-1 text-xs font-medium text-red-700 border border-red-200 hover:bg-red-50 rounded cursor-pointer"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Book Appointment Modal */}
      {bookModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="book-apt-title"
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 id="book-apt-title" className="font-display font-bold text-slate-900">
                Book New Appointment
              </h3>
              <button
                type="button"
                onClick={() => setBookModal(false)}
                aria-label="Close booking modal"
                className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBookSubmit} className="p-6 space-y-4">
              {conflictMsg && (
                <div role="alert" className="p-3.5 rounded-lg border border-red-200 bg-red-50 text-sm text-red-900 space-y-2">
                  <p className="font-medium">{conflictMsg}</p>
                  {alternativeSlots.length > 0 && (
                    <div>
                      <p className="text-xs text-red-800 mb-1.5">Available alternative slots on {form.date}:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {alternativeSlots.map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => {
                              setForm({ ...form, timeSlot: slot });
                              setConflictMsg('');
                            }}
                            className="px-2.5 py-1 text-xs font-mono font-medium bg-white border border-red-300 hover:border-teal-700 text-slate-900 rounded cursor-pointer"
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {role !== 'Patient' && (
                <PersonSelectorField
                  id="apt-patient"
                  label="Patient"
                  options={patients.map((p) => ({
                    id: p.id,
                    label: `${p.fullName} (${p.id})`,
                  }))}
                  mode={form.patientMode}
                  selectedId={form.patientId}
                  manualName={form.manualPatientName}
                  placeholder="Enter patient full name (e.g. Rohan Kulkarni)"
                  onModeChange={(mode) => setForm({ ...form, patientMode: mode })}
                  onSelectChange={(id) => setForm({ ...form, patientId: id })}
                  onManualChange={(name) => setForm({ ...form, manualPatientName: name })}
                />
              )}

              <PersonSelectorField
                id="apt-doctor"
                label="Doctor"
                options={doctors.map((d) => ({
                  id: d.id,
                  label: `${d.fullName} — ${deptName(d.departmentId)} ${d.available ? '' : '(Unavailable)'}`,
                }))}
                mode={form.doctorMode}
                selectedId={form.doctorId}
                manualName={form.manualDoctorName}
                placeholder="Enter doctor full name (e.g. Dr. Neha Kapoor)"
                onModeChange={(mode) => {
                  setForm({
                    ...form,
                    doctorMode: mode,
                    timeSlot:
                      mode === 'manual'
                        ? DEFAULT_SLOTS[0]
                        : doctorObj(form.doctorId)?.timeSlots[0] || DEFAULT_SLOTS[0],
                  });
                  setConflictMsg('');
                }}
                onSelectChange={(id) => {
                  const nextDoc = doctorObj(id);
                  setForm({
                    ...form,
                    doctorId: id,
                    timeSlot: nextDoc?.timeSlots[0] || form.timeSlot,
                  });
                  setConflictMsg('');
                }}
                onManualChange={(name) => setForm({ ...form, manualDoctorName: name })}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="apt-date" className="block text-xs font-medium text-slate-700 mb-1">
                    Appointment Date *
                  </label>
                  <input
                    id="apt-date"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label htmlFor="apt-slot" className="block text-xs font-medium text-slate-700 mb-1">
                    Time Slot *
                  </label>
                  <select
                    id="apt-slot"
                    value={form.timeSlot}
                    onChange={(e) => setForm({ ...form, timeSlot: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  >
                    {(form.doctorMode === 'manual'
                      ? DEFAULT_SLOTS
                      : activeDoctorForModal?.timeSlots || DEFAULT_SLOTS
                    ).map((slot) => {
                      const isFree =
                        form.doctorMode === 'manual' ? true : availableSlots.includes(slot);
                      return (
                        <option key={slot} value={slot}>
                          {slot} {isFree ? '(Available)' : '(Booked)'}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="apt-priority" className="block text-xs font-medium text-slate-700 mb-1">
                  Priority Level
                </label>
                <select
                  id="apt-priority"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value as PriorityLevel })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div>
                <label htmlFor="apt-symptoms" className="block text-xs font-medium text-slate-700 mb-1">
                  Symptoms / Reason for Visit
                </label>
                <textarea
                  id="apt-symptoms"
                  rows={2}
                  value={form.symptoms}
                  onChange={(e) => setForm({ ...form, symptoms: e.target.value })}
                  placeholder="Describe symptoms or consultation purpose..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setBookModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-60 rounded-lg cursor-pointer"
                >
                  {submitting ? 'Checking & Saving...' : 'Confirm Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="resched-title"
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 id="resched-title" className="font-display font-bold text-slate-900">
                Reschedule · {rescheduleTarget.id}
              </h3>
              <button
                type="button"
                onClick={() => setRescheduleTarget(null)}
                aria-label="Close reschedule modal"
                className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRescheduleSubmit} className="p-6 space-y-4">
              {conflictMsg && (
                <div role="alert" className="p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-900">
                  {conflictMsg}
                </div>
              )}

              <div>
                <label htmlFor="resched-date" className="block text-xs font-medium text-slate-700 mb-1">
                  New Date
                </label>
                <input
                  id="resched-date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label htmlFor="resched-slot" className="block text-xs font-medium text-slate-700 mb-1">
                  New Time Slot
                </label>
                <select
                  id="resched-slot"
                  value={form.timeSlot}
                  onChange={(e) => setForm({ ...form, timeSlot: e.target.value })}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                >
                  {(activeDoctorForModal?.timeSlots || []).map((slot) => (
                    <option key={slot} value={slot}>
                      {slot} {availableSlots.includes(slot) ? '(Available)' : '(Booked)'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRescheduleTarget(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg cursor-pointer"
                >
                  Save New Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
