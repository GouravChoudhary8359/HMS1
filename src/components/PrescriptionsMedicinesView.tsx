import { useState } from 'react';
import { Minus, Plus, Trash2, X } from 'lucide-react';
import { apiFetch, ApiError } from '../lib/api';
import { validateMedicineInput, validatePrescriptionInput } from '../lib/hmsRules';
import type { Doctor, Medicine, Patient, Prescription, Role, ValidationErrorMap } from '../lib/types';
import { PersonSelectorField } from './PersonSelectorField';
import { StatusTag } from './StatusTag';

interface PrescriptionsMedicinesViewProps {
  prescriptions: Prescription[];
  medicines: Medicine[];
  patients: Patient[];
  doctors: Doctor[];
  role: Role;
  linkedDoctorId?: string;
  onRefresh: () => Promise<void>;
  onNotify: (type: 'success' | 'error' | 'info', text: string) => void;
}

export function PrescriptionsMedicinesView({
  prescriptions,
  medicines,
  patients,
  doctors,
  role,
  linkedDoctorId,
  onRefresh,
  onNotify,
}: PrescriptionsMedicinesViewProps) {
  const [tab, setTab] = useState<'prescriptions' | 'medicines'>('prescriptions');

  // Prescription modal state (FR-18, FR-21)
  const [rxModal, setRxModal] = useState(false);
  const [rxForm, setRxForm] = useState({
    patientMode: 'select' as 'select' | 'manual',
    patientId: patients[0]?.id || '',
    manualPatientName: '',
    doctorMode: 'select' as 'select' | 'manual',
    doctorId: linkedDoctorId || doctors[0]?.id || '',
    manualDoctorName: '',
    diagnosis: '',
    notes: '',
    items: [
      {
        medicineId: medicines[0]?.id || '',
        dosage: '1 tablet',
        frequency: 'Twice daily',
        durationDays: '5',
      },
    ],
  });
  const [rxErrors, setRxErrors] = useState<ValidationErrorMap>({});

  // Medicine modal state (FR-19, FR-20, FR-21)
  const [medModal, setMedModal] = useState(false);
  const [medForm, setMedForm] = useState({
    name: '',
    category: '',
    manufacturer: '',
    unitPrice: '10',
    stockQuantity: '100',
    reorderLevel: '30',
    unit: 'Tablet',
    expiryDate: '2028-06-30',
  });
  const [medErrors, setMedErrors] = useState<ValidationErrorMap>({});

  const canPrescribe = role === 'Doctor' || role === 'Admin';
  const canManageStock = role === 'Admin' || role === 'Receptionist';

  const patientName = (id: string, fallback?: string) =>
    patients.find((p) => p.id === id)?.fullName || fallback || id;
  const doctorName = (id: string, fallback?: string) =>
    doctors.find((d) => d.id === id)?.fullName || fallback || id;

  const openNewRx = () => {
    setRxForm({
      patientMode: 'select',
      patientId: patients[0]?.id || '',
      manualPatientName: '',
      doctorMode: 'select',
      doctorId: linkedDoctorId || doctors[0]?.id || '',
      manualDoctorName: '',
      diagnosis: '',
      notes: '',
      items: [
        {
          medicineId: medicines[0]?.id || '',
          dosage: '1 tablet',
          frequency: 'Twice daily',
          durationDays: '5',
        },
      ],
    });
    setRxErrors({});
    setRxModal(true);
  };

  const addRxRow = () => {
    setRxForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          medicineId: medicines[0]?.id || '',
          dosage: '1 tablet',
          frequency: 'Once daily',
          durationDays: '5',
        },
      ],
    }));
  };

  const removeRxRow = (idx: number) => {
    setRxForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const savePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      patientId: rxForm.patientMode === 'select' ? rxForm.patientId : undefined,
      manualPatientName:
        rxForm.patientMode === 'manual' ? rxForm.manualPatientName.trim() : undefined,
      doctorId: rxForm.doctorMode === 'select' ? rxForm.doctorId : undefined,
      manualDoctorName:
        rxForm.doctorMode === 'manual' ? rxForm.manualDoctorName.trim() : undefined,
      diagnosis: rxForm.diagnosis,
      notes: rxForm.notes,
      items: rxForm.items.map((item) => ({
        ...item,
        durationDays: Number(item.durationDays),
      })),
    };
    const errs = validatePrescriptionInput(payload);
    if (Object.keys(errs).length > 0) {
      setRxErrors(errs);
      return;
    }
    try {
      await apiFetch('/api/prescriptions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      onNotify('success', 'Prescription issued and saved.');
      setRxModal(false);
      await onRefresh();
    } catch (err) {
      onNotify('error', err instanceof ApiError ? err.message : 'Failed to save prescription.');
    }
  };

  const saveMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateMedicineInput(medForm);
    if (Object.keys(errs).length > 0) {
      setMedErrors(errs);
      return;
    }
    try {
      await apiFetch('/api/medicines', {
        method: 'POST',
        body: JSON.stringify({
          ...medForm,
          unitPrice: Number(medForm.unitPrice),
          stockQuantity: Number(medForm.stockQuantity),
          reorderLevel: Number(medForm.reorderLevel),
        }),
      });
      onNotify('success', `Added ${medForm.name} to medicine inventory.`);
      setMedModal(false);
      await onRefresh();
    } catch (err) {
      onNotify('error', err instanceof ApiError ? err.message : 'Failed to save medicine.');
    }
  };

  const adjustStock = async (med: Medicine, delta: number) => {
    try {
      await apiFetch(`/api/medicines/${med.id}/stock`, {
        method: 'PATCH',
        body: JSON.stringify({ delta }),
      });
      onNotify('success', `Updated stock for ${med.name}.`);
      await onRefresh();
    } catch (err) {
      onNotify('error', err instanceof ApiError ? err.message : 'Stock adjustment failed.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-900">
            Prescriptions &amp; Medicine Stock
          </h2>
          <p className="text-sm text-slate-600">
            Issue validated clinical prescriptions and manage hospital pharmacy inventory.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
            <button
              type="button"
              onClick={() => setTab('prescriptions')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
                tab === 'prescriptions' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Prescriptions ({prescriptions.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('medicines')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
                tab === 'medicines' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Medicines ({medicines.length})
            </button>
          </div>

          {tab === 'prescriptions' && canPrescribe && (
            <button
              type="button"
              onClick={openNewRx}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Write Prescription</span>
            </button>
          )}

          {tab === 'medicines' && canManageStock && (
            <button
              type="button"
              onClick={() => {
                setMedForm({
                  name: '',
                  category: '',
                  manufacturer: '',
                  unitPrice: '10',
                  stockQuantity: '100',
                  reorderLevel: '30',
                  unit: 'Tablet',
                  expiryDate: '2028-06-30',
                });
                setMedErrors({});
                setMedModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Medicine</span>
            </button>
          )}
        </div>
      </div>

      {tab === 'prescriptions' ? (
        <div className="space-y-4">
          {prescriptions.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
              No prescriptions issued yet.
            </div>
          ) : (
            prescriptions.map((rx) => (
              <div key={rx.id} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono font-semibold text-teal-800">{rx.id}</span>
                      <span aria-hidden="true">·</span>
                      <span>Issued {rx.createdAt.slice(0, 10)}</span>
                    </div>
                    <h3 className="mt-1 font-display font-bold text-slate-900">
                      {patientName(rx.patientId, rx.patientName)} — {rx.diagnosis}
                    </h3>
                  </div>
                  <div className="text-xs text-slate-600">
                    Prescribed by{' '}
                    <span className="font-semibold text-slate-900">
                      {doctorName(rx.doctorId, rx.doctorName)}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-slate-500 uppercase border-b border-slate-200">
                      <tr>
                        <th className="py-2 pr-4 font-medium">Medicine</th>
                        <th className="py-2 pr-4 font-medium">Dosage</th>
                        <th className="py-2 pr-4 font-medium">Frequency</th>
                        <th className="py-2 pr-4 font-medium">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rx.items.map((item, i) => (
                        <tr key={`${rx.id}-${i}`}>
                          <td className="py-2 pr-4 font-medium text-slate-900">{item.medicineName}</td>
                          <td className="py-2 pr-4 text-slate-700">{item.dosage}</td>
                          <td className="py-2 pr-4 text-slate-700">{item.frequency}</td>
                          <td className="py-2 pr-4 font-mono text-slate-700 tabular-nums">
                            {item.durationDays} days
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {rx.notes && (
                  <p className="text-xs text-slate-600 pt-2 border-t border-slate-100">
                    Clinical Notes: {rx.notes}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-medium">ID</th>
                  <th className="py-3 px-4 font-medium">Medicine Name</th>
                  <th className="py-3 px-4 font-medium">Category</th>
                  <th className="py-3 px-4 font-medium text-right">Unit Price</th>
                  <th className="py-3 px-4 font-medium text-right">Stock</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  {canManageStock && <th className="py-3 px-4 font-medium text-right">Adjust Stock</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {medicines.map((med) => {
                  const isLow = med.stockQuantity <= med.reorderLevel;
                  return (
                    <tr key={med.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                        {med.id}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{med.name}</div>
                        <div className="text-xs text-slate-500">
                          {med.manufacturer} · Exp {med.expiryDate}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{med.category}</td>
                      <td className="py-3 px-4 font-mono text-slate-900 text-right tabular-nums whitespace-nowrap">
                        ₹{med.unitPrice.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-900 text-right tabular-nums whitespace-nowrap">
                        {med.stockQuantity} {med.unit}s
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusTag
                          label={isLow ? 'Low Stock' : 'In Stock'}
                          tone={isLow ? 'warning' : 'success'}
                        />
                      </td>
                      {canManageStock && (
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              aria-label={`Decrease stock for ${med.name}`}
                              onClick={() => adjustStock(med, -10)}
                              className="p-1.5 text-slate-700 border border-slate-300 hover:bg-slate-100 rounded cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Restock ${med.name} by 25`}
                              onClick={() => adjustStock(med, 25)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>25</span>
                            </button>
                          </div>
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

      {/* Write Prescription Modal */}
      {rxModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="rx-modal-title"
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 id="rx-modal-title" className="font-display font-bold text-slate-900">
                Create Clinical Prescription
              </h3>
              <button
                type="button"
                onClick={() => setRxModal(false)}
                aria-label="Close prescription modal"
                className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={savePrescription} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <PersonSelectorField
                  id="rx-patient"
                  label="Patient"
                  options={patients.map((p) => ({
                    id: p.id,
                    label: `${p.fullName} (${p.id})`,
                  }))}
                  mode={rxForm.patientMode}
                  selectedId={rxForm.patientId}
                  manualName={rxForm.manualPatientName}
                  placeholder="Enter patient full name"
                  onModeChange={(mode) => setRxForm({ ...rxForm, patientMode: mode })}
                  onSelectChange={(id) => setRxForm({ ...rxForm, patientId: id })}
                  onManualChange={(name) => setRxForm({ ...rxForm, manualPatientName: name })}
                  error={rxErrors.patientId}
                />
                <PersonSelectorField
                  id="rx-doctor"
                  label="Prescribing Doctor"
                  options={doctors.map((d) => ({
                    id: d.id,
                    label: d.fullName,
                  }))}
                  mode={rxForm.doctorMode}
                  selectedId={rxForm.doctorId}
                  manualName={rxForm.manualDoctorName}
                  placeholder="Enter doctor full name"
                  onModeChange={(mode) => setRxForm({ ...rxForm, doctorMode: mode })}
                  onSelectChange={(id) => setRxForm({ ...rxForm, doctorId: id })}
                  onManualChange={(name) => setRxForm({ ...rxForm, manualDoctorName: name })}
                  error={rxErrors.doctorId}
                />
              </div>

              <div>
                <label htmlFor="rx-diag" className="block text-xs font-medium text-slate-700 mb-1">
                  Diagnosis / Clinical Indication *
                </label>
                <input
                  id="rx-diag"
                  type="text"
                  value={rxForm.diagnosis}
                  onChange={(e) => setRxForm({ ...rxForm, diagnosis: e.target.value })}
                  placeholder="e.g. Acute Bronchitis"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
                {rxErrors.diagnosis && <p className="mt-1 text-xs text-red-700">{rxErrors.diagnosis}</p>}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700">Prescribed Medicines *</span>
                  <button
                    type="button"
                    onClick={addRxRow}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Medicine</span>
                  </button>
                </div>

                {rxForm.items.map((row, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-3 border border-slate-200 rounded-lg bg-slate-50/50 items-end"
                  >
                    <div className="sm:col-span-4">
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Medicine</label>
                      <select
                        value={row.medicineId}
                        onChange={(e) => {
                          const next = [...rxForm.items];
                          next[idx] = { ...next[idx], medicineId: e.target.value };
                          setRxForm({ ...rxForm, items: next });
                        }}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                      >
                        {medicines.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Dosage</label>
                      <input
                        type="text"
                        value={row.dosage}
                        onChange={(e) => {
                          const next = [...rxForm.items];
                          next[idx] = { ...next[idx], dosage: e.target.value };
                          setRxForm({ ...rxForm, items: next });
                        }}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Frequency</label>
                      <input
                        type="text"
                        value={row.frequency}
                        onChange={(e) => {
                          const next = [...rxForm.items];
                          next[idx] = { ...next[idx], frequency: e.target.value };
                          setRxForm({ ...rxForm, items: next });
                        }}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Days</label>
                      <input
                        type="number"
                        min={1}
                        value={row.durationDays}
                        onChange={(e) => {
                          const next = [...rxForm.items];
                          next[idx] = { ...next[idx], durationDays: e.target.value };
                          setRxForm({ ...rxForm, items: next });
                        }}
                        className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded"
                      />
                    </div>
                    <div className="sm:col-span-1 flex justify-end">
                      {rxForm.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRxRow(idx)}
                          aria-label="Remove medicine row"
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {rxErrors.items && <p className="text-xs text-red-700">{rxErrors.items}</p>}
              </div>

              <div>
                <label htmlFor="rx-notes" className="block text-xs font-medium text-slate-700 mb-1">
                  Patient Instructions / Advice
                </label>
                <textarea
                  id="rx-notes"
                  rows={2}
                  value={rxForm.notes}
                  onChange={(e) => setRxForm({ ...rxForm, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRxModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg cursor-pointer"
                >
                  Save Prescription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Medicine Modal */}
      {medModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="med-modal-title"
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 id="med-modal-title" className="font-display font-bold text-slate-900">
                Add Medicine Record
              </h3>
              <button
                type="button"
                onClick={() => setMedModal(false)}
                aria-label="Close medicine modal"
                className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={saveMedicine} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label htmlFor="med-name" className="block text-xs font-medium text-slate-700 mb-1">
                    Medicine Name *
                  </label>
                  <input
                    id="med-name"
                    type="text"
                    value={medForm.name}
                    onChange={(e) => setMedForm({ ...medForm, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                  {medErrors.name && <p className="mt-1 text-xs text-red-700">{medErrors.name}</p>}
                </div>
                <div>
                  <label htmlFor="med-cat" className="block text-xs font-medium text-slate-700 mb-1">
                    Category *
                  </label>
                  <input
                    id="med-cat"
                    type="text"
                    value={medForm.category}
                    onChange={(e) => setMedForm({ ...medForm, category: e.target.value })}
                    placeholder="Antibiotic"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                  {medErrors.category && <p className="mt-1 text-xs text-red-700">{medErrors.category}</p>}
                </div>
                <div>
                  <label htmlFor="med-unit" className="block text-xs font-medium text-slate-700 mb-1">
                    Unit *
                  </label>
                  <input
                    id="med-unit"
                    type="text"
                    value={medForm.unit}
                    onChange={(e) => setMedForm({ ...medForm, unit: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label htmlFor="med-price" className="block text-xs font-medium text-slate-700 mb-1">
                    Unit Price (₹) *
                  </label>
                  <input
                    id="med-price"
                    type="number"
                    step="0.5"
                    min={0}
                    value={medForm.unitPrice}
                    onChange={(e) => setMedForm({ ...medForm, unitPrice: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label htmlFor="med-stock" className="block text-xs font-medium text-slate-700 mb-1">
                    Initial Stock *
                  </label>
                  <input
                    id="med-stock"
                    type="number"
                    min={0}
                    value={medForm.stockQuantity}
                    onChange={(e) => setMedForm({ ...medForm, stockQuantity: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label htmlFor="med-reorder" className="block text-xs font-medium text-slate-700 mb-1">
                    Reorder Threshold *
                  </label>
                  <input
                    id="med-reorder"
                    type="number"
                    min={0}
                    value={medForm.reorderLevel}
                    onChange={(e) => setMedForm({ ...medForm, reorderLevel: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label htmlFor="med-exp" className="block text-xs font-medium text-slate-700 mb-1">
                    Expiry Date
                  </label>
                  <input
                    id="med-exp"
                    type="date"
                    value={medForm.expiryDate}
                    onChange={(e) => setMedForm({ ...medForm, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setMedModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg cursor-pointer"
                >
                  Save Medicine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
