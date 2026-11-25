import { useState } from 'react';
import { BedDouble, LogOut, Pencil, Plus, X } from 'lucide-react';
import { apiFetch, ApiError } from '../lib/api';
import type { Admission, AdmissionStatus, Doctor, Patient, Role } from '../lib/types';
import { PersonSelectorField } from './PersonSelectorField';
import { StatusTag, statusToneFor } from './StatusTag';

interface AdmissionsViewProps {
  admissions: Admission[];
  patients: Patient[];
  doctors: Doctor[];
  role: Role;
  onRefresh: () => Promise<void>;
  onNotify: (type: 'success' | 'error' | 'info', text: string) => void;
}

const WARDS = ['General Ward A', 'General Ward B', 'Cardiac Care Unit', 'Orthopedic Ward', 'Pediatric Ward'];

export function AdmissionsView({
  admissions,
  patients,
  doctors,
  role,
  onRefresh,
  onNotify,
}: AdmissionsViewProps) {
  const [filter, setFilter] = useState<'All' | 'Active' | 'Discharged'>('All');
  const [admitModal, setAdmitModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Admission | null>(null);
  const [dischargeTarget, setDischargeTarget] = useState<Admission | null>(null);

  const [admitForm, setAdmitForm] = useState({
    patientMode: 'select' as 'select' | 'manual',
    patientId: patients[0]?.id || '',
    manualPatientName: '',
    doctorMode: 'select' as 'select' | 'manual',
    doctorId: doctors[0]?.id || '',
    manualDoctorName: '',
    ward: WARDS[0],
    bedNumber: 'GEN-02',
    admissionDate: '2026-11-18',
    reason: '',
  });

  const [editForm, setEditForm] = useState({
    ward: '',
    bedNumber: '',
    status: 'Admitted' as AdmissionStatus,
  });

  const [dischargeForm, setDischargeForm] = useState({
    dischargeDate: '2026-11-18',
    dischargeSummary: '',
    followUpInstructions: '',
  });

  const canAdmit = role === 'Admin' || role === 'Receptionist';
  const canUpdateBedOrDischarge = role === 'Admin' || role === 'Receptionist' || role === 'Doctor';

  const patientName = (id: string, fallback?: string) =>
    patients.find((p) => p.id === id)?.fullName || fallback || id;
  const doctorName = (id: string, fallback?: string) =>
    doctors.find((d) => d.id === id)?.fullName || fallback || id;

  const filtered = admissions.filter((a) => {
    if (filter === 'Active') return a.status !== 'Discharged';
    if (filter === 'Discharged') return a.status === 'Discharged';
    return true;
  });

  const handleAdmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (admitForm.patientMode === 'manual' && admitForm.manualPatientName.trim().length < 2) {
      onNotify('error', 'Please enter a valid patient name (at least 2 characters).');
      return;
    }
    if (admitForm.doctorMode === 'manual' && admitForm.manualDoctorName.trim().length < 2) {
      onNotify('error', 'Please enter a valid admitting doctor name (at least 2 characters).');
      return;
    }
    if (!admitForm.reason.trim()) {
      onNotify('error', 'Admission reason is required.');
      return;
    }
    try {
      await apiFetch('/api/admissions', {
        method: 'POST',
        body: JSON.stringify({
          patientId: admitForm.patientMode === 'select' ? admitForm.patientId : undefined,
          manualPatientName:
            admitForm.patientMode === 'manual' ? admitForm.manualPatientName.trim() : undefined,
          doctorId: admitForm.doctorMode === 'select' ? admitForm.doctorId : undefined,
          manualDoctorName:
            admitForm.doctorMode === 'manual' ? admitForm.manualDoctorName.trim() : undefined,
          ward: admitForm.ward,
          bedNumber: admitForm.bedNumber,
          admissionDate: admitForm.admissionDate,
          reason: admitForm.reason,
        }),
      });
      onNotify('success', 'Patient admission record created.');
      setAdmitModal(false);
      await onRefresh();
    } catch (err) {
      onNotify('error', err instanceof ApiError ? err.message : 'Failed to admit patient.');
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    try {
      await apiFetch(`/api/admissions/${editTarget.id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm),
      });
      onNotify('success', `Updated bed/status for ${editTarget.id}.`);
      setEditTarget(null);
      await onRefresh();
    } catch (err) {
      onNotify('error', err instanceof ApiError ? err.message : 'Failed to update admission.');
    }
  };

  const handleDischarge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dischargeTarget) return;
    if (!dischargeForm.dischargeSummary.trim()) {
      onNotify('error', 'Discharge summary is required.');
      return;
    }
    try {
      await apiFetch(`/api/admissions/${dischargeTarget.id}/discharge`, {
        method: 'POST',
        body: JSON.stringify(dischargeForm),
      });
      onNotify(
        'success',
        `Discharged ${patientName(dischargeTarget.patientId, dischargeTarget.patientName)} and freed bed ${dischargeTarget.bedNumber}.`
      );
      setDischargeTarget(null);
      await onRefresh();
    } catch (err) {
      onNotify('error', err instanceof ApiError ? err.message : 'Failed to discharge patient.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-900">
            Admissions, Ward Beds &amp; Discharges
          </h2>
          <p className="text-sm text-slate-600">
            Manage inpatient admissions, ward/bed assignments, status updates, and discharge summaries.
          </p>
        </div>

        {canAdmit && (
          <button
            type="button"
            onClick={() => {
              setAdmitForm({
                patientMode: 'select',
                patientId: patients[0]?.id || '',
                manualPatientName: '',
                doctorMode: 'select',
                doctorId: doctors[0]?.id || '',
                manualDoctorName: '',
                ward: WARDS[0],
                bedNumber: 'GEN-05',
                admissionDate: '2026-11-18',
                reason: '',
              });
              setAdmitModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Admit Patient</span>
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {(['All', 'Active', 'Discharged'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
                filter === tab ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="text-xs font-mono text-slate-500 tabular-nums">
          {admissions.filter((a) => a.status !== 'Discharged').length} beds currently occupied
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No admission records found in this view.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-medium">Admission ID</th>
                  <th className="py-3 px-4 font-medium">Patient &amp; Reason</th>
                  <th className="py-3 px-4 font-medium">Attending Doctor</th>
                  <th className="py-3 px-4 font-medium">Ward / Bed</th>
                  <th className="py-3 px-4 font-medium">Dates</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  {canUpdateBedOrDischarge && <th className="py-3 px-4 font-medium text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((adm) => (
                  <tr key={adm.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                      {adm.id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">
                        {patientName(adm.patientId, adm.patientName)}
                      </div>
                      <div className="text-xs text-slate-500 max-w-xs truncate">{adm.reason}</div>
                      {adm.dischargeSummary && (
                        <div className="mt-1 text-xs text-emerald-800">
                          Summary: {adm.dischargeSummary}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                      {doctorName(adm.doctorId, adm.doctorName)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-slate-900">{adm.ward}</div>
                      <div className="font-mono text-xs text-slate-600 flex items-center gap-1">
                        <BedDouble className="w-3.5 h-3.5 text-slate-400" />
                        <span>{adm.bedNumber}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600 whitespace-nowrap tabular-nums">
                      <div>In: {adm.admissionDate}</div>
                      {adm.dischargeDate && <div>Out: {adm.dischargeDate}</div>}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusTag label={adm.status} tone={statusToneFor(adm.status)} />
                    </td>
                    {canUpdateBedOrDischarge && (
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {adm.status !== 'Discharged' ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditTarget(adm);
                                setEditForm({
                                  ward: adm.ward,
                                  bedNumber: adm.bedNumber,
                                  status: adm.status,
                                });
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-100 rounded cursor-pointer"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>Ward/Bed</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDischargeTarget(adm);
                                setDischargeForm({
                                  dischargeDate: '2026-11-18',
                                  dischargeSummary: '',
                                  followUpInstructions: '',
                                });
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded cursor-pointer"
                            >
                              <LogOut className="w-3 h-3" />
                              <span>Discharge</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Closed</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Admit Modal */}
      {admitModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="admit-title"
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 id="admit-title" className="font-display font-bold text-slate-900">
                Create Patient Admission
              </h3>
              <button
                type="button"
                onClick={() => setAdmitModal(false)}
                aria-label="Close admit modal"
                className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAdmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <PersonSelectorField
                    id="adm-patient"
                    label="Patient"
                    options={patients.map((p) => ({
                      id: p.id,
                      label: `${p.fullName} (${p.id})`,
                    }))}
                    mode={admitForm.patientMode}
                    selectedId={admitForm.patientId}
                    manualName={admitForm.manualPatientName}
                    placeholder="Enter patient full name"
                    onModeChange={(mode) => setAdmitForm({ ...admitForm, patientMode: mode })}
                    onSelectChange={(id) => setAdmitForm({ ...admitForm, patientId: id })}
                    onManualChange={(name) => setAdmitForm({ ...admitForm, manualPatientName: name })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <PersonSelectorField
                    id="adm-doctor"
                    label="Admitting Doctor"
                    options={doctors.map((d) => ({
                      id: d.id,
                      label: d.fullName,
                    }))}
                    mode={admitForm.doctorMode}
                    selectedId={admitForm.doctorId}
                    manualName={admitForm.manualDoctorName}
                    placeholder="Enter doctor full name"
                    onModeChange={(mode) => setAdmitForm({ ...admitForm, doctorMode: mode })}
                    onSelectChange={(id) => setAdmitForm({ ...admitForm, doctorId: id })}
                    onManualChange={(name) => setAdmitForm({ ...admitForm, manualDoctorName: name })}
                  />
                </div>
                <div>
                  <label htmlFor="adm-ward" className="block text-xs font-medium text-slate-700 mb-1">
                    Ward *
                  </label>
                  <select
                    id="adm-ward"
                    value={admitForm.ward}
                    onChange={(e) => setAdmitForm({ ...admitForm, ward: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  >
                    {WARDS.map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="adm-bed" className="block text-xs font-medium text-slate-700 mb-1">
                    Bed Number *
                  </label>
                  <input
                    id="adm-bed"
                    type="text"
                    value={admitForm.bedNumber}
                    onChange={(e) => setAdmitForm({ ...admitForm, bedNumber: e.target.value })}
                    placeholder="GEN-05"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label htmlFor="adm-date" className="block text-xs font-medium text-slate-700 mb-1">
                    Admission Date *
                  </label>
                  <input
                    id="adm-date"
                    type="date"
                    value={admitForm.admissionDate}
                    onChange={(e) => setAdmitForm({ ...admitForm, admissionDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="adm-reason" className="block text-xs font-medium text-slate-700 mb-1">
                    Clinical Reason for Admission *
                  </label>
                  <textarea
                    id="adm-reason"
                    rows={2}
                    value={admitForm.reason}
                    onChange={(e) => setAdmitForm({ ...admitForm, reason: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAdmitModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg cursor-pointer"
                >
                  Confirm Admission
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Ward / Bed Modal */}
      {editTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-bed-title"
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 id="edit-bed-title" className="font-display font-bold text-slate-900">
                Update Ward &amp; Bed · {editTarget.id}
              </h3>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                aria-label="Close ward edit modal"
                className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEdit} className="p-6 space-y-4">
              <div>
                <label htmlFor="edit-ward" className="block text-xs font-medium text-slate-700 mb-1">
                  Ward
                </label>
                <select
                  id="edit-ward"
                  value={editForm.ward}
                  onChange={(e) => setEditForm({ ...editForm, ward: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                >
                  {WARDS.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="edit-bed" className="block text-xs font-medium text-slate-700 mb-1">
                  Bed Number
                </label>
                <input
                  id="edit-bed"
                  type="text"
                  value={editForm.bedNumber}
                  onChange={(e) => setEditForm({ ...editForm, bedNumber: e.target.value })}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="edit-status" className="block text-xs font-medium text-slate-700 mb-1">
                  Admission Status
                </label>
                <select
                  id="edit-status"
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as AdmissionStatus })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                >
                  <option value="Admitted">Admitted</option>
                  <option value="Under Observation">Under Observation</option>
                </select>
              </div>
              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg cursor-pointer"
                >
                  Save Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Discharge Modal */}
      {dischargeTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="discharge-title"
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 id="discharge-title" className="font-display font-bold text-slate-900">
                Discharge Patient · {patientName(dischargeTarget.patientId, dischargeTarget.patientName)}
              </h3>
              <button
                type="button"
                onClick={() => setDischargeTarget(null)}
                aria-label="Close discharge modal"
                className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleDischarge} className="p-6 space-y-4">
              <div>
                <label htmlFor="dis-date" className="block text-xs font-medium text-slate-700 mb-1">
                  Discharge Date *
                </label>
                <input
                  id="dis-date"
                  type="date"
                  value={dischargeForm.dischargeDate}
                  onChange={(e) => setDischargeForm({ ...dischargeForm, dischargeDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="dis-summary" className="block text-xs font-medium text-slate-700 mb-1">
                  Discharge Summary *
                </label>
                <textarea
                  id="dis-summary"
                  rows={3}
                  value={dischargeForm.dischargeSummary}
                  onChange={(e) => setDischargeForm({ ...dischargeForm, dischargeSummary: e.target.value })}
                  placeholder="Condition at discharge, clinical course..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="dis-followup" className="block text-xs font-medium text-slate-700 mb-1">
                  Follow-up Instructions
                </label>
                <input
                  id="dis-followup"
                  type="text"
                  value={dischargeForm.followUpInstructions}
                  onChange={(e) =>
                    setDischargeForm({ ...dischargeForm, followUpInstructions: e.target.value })
                  }
                  placeholder="Review in OPD after 7 days"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDischargeTarget(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg cursor-pointer"
                >
                  Complete Discharge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
