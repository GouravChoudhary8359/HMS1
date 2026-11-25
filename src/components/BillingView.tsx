import { useState } from 'react';
import { CreditCard, Plus, Trash2, X } from 'lucide-react';
import { apiFetch, ApiError } from '../lib/api';
import { calculateBillTotals } from '../lib/hmsRules';
import type { Bill, BillItem, Patient, PaymentStatus, Role } from '../lib/types';
import { PersonSelectorField } from './PersonSelectorField';
import { StatusTag, statusToneFor } from './StatusTag';

interface BillingViewProps {
  bills: Bill[];
  patients: Patient[];
  role: Role;
  onRefresh: () => Promise<void>;
  onNotify: (type: 'success' | 'error' | 'info', text: string) => void;
}

export function BillingView({ bills, patients, role, onRefresh, onNotify }: BillingViewProps) {
  const [filter, setFilter] = useState<'All' | PaymentStatus>('All');
  const [createModal, setCreateModal] = useState(false);
  const [payTarget, setPayTarget] = useState<Bill | null>(null);
  const [payMethod, setPayMethod] = useState<'Cash' | 'Card' | 'UPI' | 'Insurance'>('UPI');

  const [billForm, setBillForm] = useState<{
    patientMode: 'select' | 'manual';
    patientId: string;
    manualPatientName: string;
    discount: string;
    paymentStatus: PaymentStatus;
    paymentMethod: 'Cash' | 'Card' | 'UPI' | 'Insurance';
    items: Array<{
      description: string;
      category: BillItem['category'];
      quantity: string;
      unitPrice: string;
    }>;
  }>({
    patientMode: 'select',
    patientId: patients[0]?.id || '',
    manualPatientName: '',
    discount: '0',
    paymentStatus: 'Pending',
    paymentMethod: 'Cash',
    items: [
      {
        description: 'Outpatient Specialist Consultation',
        category: 'Consultation',
        quantity: '1',
        unitPrice: '800',
      },
    ],
  });

  const canManageBilling = role === 'Admin' || role === 'Receptionist';
  const patientName = (id: string, fallback?: string) =>
    patients.find((p) => p.id === id)?.fullName || fallback || id;

  const filtered = bills.filter((b) => (filter === 'All' ? true : b.paymentStatus === filter));

  const liveCalc = calculateBillTotals(
    billForm.items.map((it) => ({
      description: it.description,
      category: it.category,
      quantity: Number(it.quantity),
      unitPrice: Number(it.unitPrice),
    })),
    Number(billForm.discount)
  );

  const addItemRow = () => {
    setBillForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { description: '', category: 'Procedure', quantity: '1', unitPrice: '0' },
      ],
    }));
  };

  const removeItemRow = (idx: number) => {
    setBillForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (billForm.patientMode === 'manual' && billForm.manualPatientName.trim().length < 2) {
      onNotify('error', 'Please enter a valid patient name (at least 2 characters).');
      return;
    }
    if (Object.keys(liveCalc.errors).length > 0) {
      onNotify('error', liveCalc.errors.items || 'Please verify all bill items.');
      return;
    }
    try {
      await apiFetch('/api/bills', {
        method: 'POST',
        body: JSON.stringify({
          patientId: billForm.patientMode === 'select' ? billForm.patientId : undefined,
          manualPatientName:
            billForm.patientMode === 'manual' ? billForm.manualPatientName.trim() : undefined,
          discount: Number(billForm.discount) || 0,
          paymentStatus: billForm.paymentStatus,
          paymentMethod: billForm.paymentStatus === 'Paid' ? billForm.paymentMethod : undefined,
          items: billForm.items.map((it) => ({
            description: it.description,
            category: it.category,
            quantity: Number(it.quantity),
            unitPrice: Number(it.unitPrice),
          })),
        }),
      });
      onNotify('success', 'Invoice generated successfully.');
      setCreateModal(false);
      await onRefresh();
    } catch (err) {
      onNotify('error', err instanceof ApiError ? err.message : 'Failed to generate bill.');
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payTarget) return;
    try {
      await apiFetch(`/api/bills/${payTarget.id}/pay`, {
        method: 'POST',
        body: JSON.stringify({ paymentMethod: payMethod }),
      });
      onNotify('success', `Recorded payment for ${payTarget.id}.`);
      setPayTarget(null);
      await onRefresh();
    } catch (err) {
      onNotify('error', err instanceof ApiError ? err.message : 'Payment recording failed.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-900">Billing &amp; Payments</h2>
          <p className="text-sm text-slate-600">
            Generate itemized patient invoices with automated total calculation and payment tracking.
          </p>
        </div>

        {canManageBilling && (
          <button
            type="button"
            onClick={() => {
              setBillForm({
                patientMode: 'select',
                patientId: patients[0]?.id || '',
                manualPatientName: '',
                discount: '0',
                paymentStatus: 'Pending',
                paymentMethod: 'Cash',
                items: [
                  {
                    description: 'Outpatient Specialist Consultation',
                    category: 'Consultation',
                    quantity: '1',
                    unitPrice: '800',
                  },
                ],
              });
              setCreateModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Generate Bill</span>
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {(['All', 'Pending', 'Paid'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilter(status)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
                filter === status ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        <div className="text-xs font-mono text-slate-600 tabular-nums">
          Total displayed: ₹
          {filtered.reduce((acc, b) => acc + b.totalAmount, 0).toLocaleString('en-IN')}
        </div>
      </div>

      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
            No bills match the selected filter.
          </div>
        ) : (
          filtered.map((bill) => (
            <div key={bill.id} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono font-semibold text-teal-800">{bill.id}</span>
                    <span aria-hidden="true">·</span>
                    <span>Created {bill.createdAt.slice(0, 10)}</span>
                    {bill.paymentMethod && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>Paid via {bill.paymentMethod}</span>
                      </>
                    )}
                  </div>
                  <h3 className="mt-1 font-display font-bold text-slate-900">
                    {patientName(bill.patientId, bill.patientName)}
                  </h3>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Net Total</div>
                    <div className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                      ₹{bill.totalAmount.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <StatusTag label={bill.paymentStatus} tone={statusToneFor(bill.paymentStatus)} />
                  {canManageBilling && bill.paymentStatus === 'Pending' && (
                    <button
                      type="button"
                      onClick={() => {
                        setPayTarget(bill);
                        setPayMethod('UPI');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg cursor-pointer whitespace-nowrap"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Record Payment</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-500 uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-2 pr-4 font-medium">Description</th>
                      <th className="py-2 pr-4 font-medium">Category</th>
                      <th className="py-2 pr-4 font-medium text-right">Qty</th>
                      <th className="py-2 pr-4 font-medium text-right">Unit Price</th>
                      <th className="py-2 font-medium text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bill.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2 pr-4 text-slate-900 font-medium">{item.description}</td>
                        <td className="py-2 pr-4 text-slate-600">{item.category}</td>
                        <td className="py-2 pr-4 font-mono text-right tabular-nums">{item.quantity}</td>
                        <td className="py-2 pr-4 font-mono text-right tabular-nums">
                          ₹{item.unitPrice.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2 font-mono font-medium text-slate-900 text-right tabular-nums">
                          ₹{item.lineTotal.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {bill.discount > 0 && (
                <div className="text-xs text-slate-500 text-right font-mono tabular-nums">
                  Subtotal: ₹{bill.subtotal.toLocaleString('en-IN')} · Discount: -₹
                  {bill.discount.toLocaleString('en-IN')}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create Bill Modal */}
      {createModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-bill-title"
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 id="create-bill-title" className="font-display font-bold text-slate-900">
                Generate Patient Bill
              </h3>
              <button
                type="button"
                onClick={() => setCreateModal(false)}
                aria-label="Close bill modal"
                className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBill} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <PersonSelectorField
                    id="bill-patient"
                    label="Patient"
                    options={patients.map((p) => ({
                      id: p.id,
                      label: `${p.fullName} (${p.id})`,
                    }))}
                    mode={billForm.patientMode}
                    selectedId={billForm.patientId}
                    manualName={billForm.manualPatientName}
                    placeholder="Enter patient full name"
                    onModeChange={(mode) => setBillForm({ ...billForm, patientMode: mode })}
                    onSelectChange={(id) => setBillForm({ ...billForm, patientId: id })}
                    onManualChange={(name) => setBillForm({ ...billForm, manualPatientName: name })}
                  />
                </div>

                <div>
                  <label htmlFor="bill-status" className="block text-xs font-medium text-slate-700 mb-1">
                    Payment Status
                  </label>
                  <select
                    id="bill-status"
                    value={billForm.paymentStatus}
                    onChange={(e) =>
                      setBillForm({ ...billForm, paymentStatus: e.target.value as PaymentStatus })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700">Bill Line Items *</span>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                {billForm.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-3 border border-slate-200 rounded-lg bg-slate-50/50 items-end"
                  >
                    <div className="sm:col-span-5">
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Description</label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => {
                          const next = [...billForm.items];
                          next[idx] = { ...next[idx], description: e.target.value };
                          setBillForm({ ...billForm, items: next });
                        }}
                        placeholder="Consultation / Lab / Ward"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Category</label>
                      <select
                        value={item.category}
                        onChange={(e) => {
                          const next = [...billForm.items];
                          next[idx] = {
                            ...next[idx],
                            category: e.target.value as BillItem['category'],
                          };
                          setBillForm({ ...billForm, items: next });
                        }}
                        className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded"
                      >
                        <option value="Consultation">Consultation</option>
                        <option value="Ward">Ward</option>
                        <option value="Medicine">Medicine</option>
                        <option value="Procedure">Procedure</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Qty</label>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => {
                          const next = [...billForm.items];
                          next[idx] = { ...next[idx], quantity: e.target.value };
                          setBillForm({ ...billForm, items: next });
                        }}
                        className="w-full px-2 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Unit (₹)</label>
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        value={item.unitPrice}
                        onChange={(e) => {
                          const next = [...billForm.items];
                          next[idx] = { ...next[idx], unitPrice: e.target.value };
                          setBillForm({ ...billForm, items: next });
                        }}
                        className="w-full px-2 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded"
                      />
                    </div>
                    <div className="sm:col-span-1 flex justify-end">
                      {billForm.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          aria-label="Remove bill item"
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end pt-2">
                <div>
                  <label htmlFor="bill-discount" className="block text-xs font-medium text-slate-700 mb-1">
                    Discount (₹)
                  </label>
                  <input
                    id="bill-discount"
                    type="number"
                    min={0}
                    value={billForm.discount}
                    onChange={(e) => setBillForm({ ...billForm, discount: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-right">
                  <div className="text-xs text-slate-600 font-mono tabular-nums">
                    Subtotal: ₹{liveCalc.subtotal.toLocaleString('en-IN')}
                  </div>
                  <div className="text-base font-display font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                    Calculated Total: ₹{liveCalc.totalAmount.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg cursor-pointer"
                >
                  Create Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {payTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pay-modal-title"
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-sm">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 id="pay-modal-title" className="font-display font-bold text-slate-900">
                Record Payment · {payTarget.id}
              </h3>
              <button
                type="button"
                onClick={() => setPayTarget(null)}
                aria-label="Close payment modal"
                className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-xs text-slate-500">Amount Due</div>
                <div className="font-mono text-xl font-bold text-slate-900 tabular-nums">
                  ₹{payTarget.totalAmount.toLocaleString('en-IN')}
                </div>
              </div>
              <div>
                <label htmlFor="pay-method" className="block text-xs font-medium text-slate-700 mb-1">
                  Payment Method
                </label>
                <select
                  id="pay-method"
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as typeof payMethod)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                >
                  <option value="UPI">UPI</option>
                  <option value="Card">Card</option>
                  <option value="Cash">Cash</option>
                  <option value="Insurance">Insurance</option>
                </select>
              </div>
              <div className="pt-3 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPayTarget(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg cursor-pointer"
                >
                  Mark as Paid
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
