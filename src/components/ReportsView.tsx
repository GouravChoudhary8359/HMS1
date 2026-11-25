import { Download } from 'lucide-react';
import type { Admission, Appointment, Bill, Department, Doctor, Medicine, Patient } from '../lib/types';
import { StatusTag, statusToneFor } from './StatusTag';

interface ReportsViewProps {
  departments: Department[];
  doctors: Doctor[];
  appointments: Appointment[];
  admissions: Admission[];
  medicines: Medicine[];
  bills: Bill[];
  patients: Patient[];
}

export function ReportsView({
  departments,
  doctors,
  appointments,
  admissions,
  medicines,
  bills,
  patients,
}: ReportsViewProps) {
  const patientName = (id: string, fallback?: string) =>
    patients.find((p) => p.id === id)?.fullName || fallback || id;

  const deptRows = departments.map((dept) => {
    const deptDocs = doctors.filter((d) => d.departmentId === dept.id);
    const deptAppts = appointments.filter((a) => a.departmentId === dept.id);
    return {
      code: dept.code,
      name: dept.name,
      doctors: deptDocs.length,
      totalAppointments: deptAppts.length,
      scheduled: deptAppts.filter((a) => a.status === 'Scheduled').length,
      completed: deptAppts.filter((a) => a.status === 'Completed').length,
      cancelled: deptAppts.filter((a) => a.status === 'Cancelled').length,
    };
  });

  const lowStockMeds = medicines.filter((m) => m.stockQuantity <= m.reorderLevel);
  const pendingBills = bills.filter((b) => b.paymentStatus === 'Pending');
  const activeAdmissions = admissions.filter((a) => a.status !== 'Discharged');

  const exportDepartmentCsv = () => {
    const header = ['Code', 'Department', 'Doctors', 'Total Appointments', 'Scheduled', 'Completed', 'Cancelled'];
    const lines = [
      header.join(','),
      ...deptRows.map((r) =>
        [r.code, `"${r.name}"`, r.doctors, r.totalAppointments, r.scheduled, r.completed, r.cancelled].join(',')
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'careledger-department-report.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-900">Administrative Reports</h2>
          <p className="text-sm text-slate-600">
            Department appointment utilization, bed occupancy, pharmacy reorder items, and pending receivables.
          </p>
        </div>

        <button
          type="button"
          onClick={exportDepartmentCsv}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Export Department CSV</span>
        </button>
      </div>

      {/* Department Performance Report */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="font-display font-semibold text-slate-900">
            01. Department Consultation &amp; Appointment Summary
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-medium">Code</th>
                <th className="py-3 px-4 font-medium">Department</th>
                <th className="py-3 px-4 font-medium text-right">Doctors</th>
                <th className="py-3 px-4 font-medium text-right">Total Appts</th>
                <th className="py-3 px-4 font-medium text-right">Scheduled</th>
                <th className="py-3 px-4 font-medium text-right">Completed</th>
                <th className="py-3 px-4 font-medium text-right">Cancelled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {deptRows.map((row) => (
                <tr key={row.code} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-mono text-xs font-semibold text-teal-800">{row.code}</td>
                  <td className="py-3 px-4 font-medium text-slate-900">{row.name}</td>
                  <td className="py-3 px-4 font-mono text-right tabular-nums">{row.doctors}</td>
                  <td className="py-3 px-4 font-mono text-right tabular-nums font-semibold">{row.totalAppointments}</td>
                  <td className="py-3 px-4 font-mono text-right tabular-nums">{row.scheduled}</td>
                  <td className="py-3 px-4 font-mono text-right tabular-nums">{row.completed}</td>
                  <td className="py-3 px-4 font-mono text-right tabular-nums">{row.cancelled}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Admissions Report */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-display font-semibold text-slate-900">02. Active Ward Occupancy</h3>
            <span className="font-mono text-xs text-slate-500 tabular-nums">{activeAdmissions.length} active</span>
          </div>
          {activeAdmissions.length === 0 ? (
            <div className="p-6 text-sm text-slate-500 text-center">No active inpatient admissions.</div>
          ) : (
            <div className="divide-y divide-slate-200">
              {activeAdmissions.map((adm) => (
                <div key={adm.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-slate-900">
                      {patientName(adm.patientId, adm.patientName)}
                    </div>
                    <div className="text-xs text-slate-500">
                      {adm.ward} · Bed <span className="font-mono">{adm.bedNumber}</span> · Since {adm.admissionDate}
                    </div>
                  </div>
                  <StatusTag label={adm.status} tone={statusToneFor(adm.status)} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Receivables & Low Stock */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-display font-semibold text-slate-900">03. Pending Bills Ledger</h3>
              <span className="font-mono text-xs text-slate-500 tabular-nums">{pendingBills.length} unpaid</span>
            </div>
            {pendingBills.length === 0 ? (
              <div className="p-6 text-sm text-slate-500 text-center">All bills are settled.</div>
            ) : (
              <div className="divide-y divide-slate-200">
                {pendingBills.map((b) => (
                  <div key={b.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <div className="font-mono text-xs text-slate-600">{b.id}</div>
                      <div className="text-sm font-medium text-slate-900">
                        {patientName(b.patientId, b.patientName)}
                      </div>
                    </div>
                    <div className="font-mono text-sm font-semibold text-amber-800 tabular-nums">
                      ₹{b.totalAmount.toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-display font-semibold text-slate-900">04. Pharmacy Reorder Watchlist</h3>
              <span className="font-mono text-xs text-slate-500 tabular-nums">{lowStockMeds.length} alerts</span>
            </div>
            {lowStockMeds.length === 0 ? (
              <div className="p-6 text-sm text-slate-500 text-center">No medicines below reorder level.</div>
            ) : (
              <div className="divide-y divide-slate-200">
                {lowStockMeds.map((m) => (
                  <div key={m.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{m.name}</div>
                      <div className="text-xs text-slate-500">Threshold: {m.reorderLevel} {m.unit}s</div>
                    </div>
                    <StatusTag label={`${m.stockQuantity} ${m.unit}s`} tone="warning" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
