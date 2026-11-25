import { ArrowRight, BedDouble, CalendarClock, Pill, Receipt, Stethoscope, Users } from 'lucide-react';
import type {
  Admission,
  Appointment,
  Bill,
  DashboardSummary,
  Doctor,
  Medicine,
  Patient,
  Role,
} from '../lib/types';
import type { NavSection } from './Sidebar';
import { StatusTag, statusToneFor } from './StatusTag';

interface DashboardViewProps {
  role: Role;
  summary: DashboardSummary | null;
  appointments: Appointment[];
  admissions: Admission[];
  medicines: Medicine[];
  bills: Bill[];
  patients: Patient[];
  doctors: Doctor[];
  onNavigate: (section: NavSection) => void;
}

export function DashboardView({
  role,
  summary,
  appointments,
  admissions,
  medicines,
  bills,
  patients,
  doctors,
  onNavigate,
}: DashboardViewProps) {
  if (!summary) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-white border border-slate-200 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const patientName = (id: string, fallback?: string) =>
    patients.find((p) => p.id === id)?.fullName || fallback || id;
  const doctorName = (id: string, fallback?: string) =>
    doctors.find((d) => d.id === id)?.fullName || fallback || id;

  const lowStock = medicines.filter((m) => m.stockQuantity <= m.reorderLevel);
  const activeAdmissions = admissions.filter((a) => a.status !== 'Discharged');
  const recentAppointments = appointments.slice(0, 5);
  const pendingBills = bills.filter((b) => b.paymentStatus === 'Pending');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900 text-balance">
            {role === 'Patient' ? 'Patient Care Summary' : 'Hospital Operations Overview'}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {role === 'Patient'
              ? 'View your scheduled appointments, active admissions, and billing status.'
              : 'Live operational counts across patient intake, consultations, inpatient beds, pharmacy, and billing.'}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('ai-advisory')}
            className="px-4 py-2 text-sm font-medium text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            AI Triage Advisory
          </button>
          <button
            type="button"
            onClick={() => onNavigate('appointments')}
            className="px-4 py-2 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            Book Appointment
          </button>
        </div>
      </div>

      {/* KPI Strip (FR-25) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">
              {role === 'Patient' ? 'My Profile' : 'Registered Patients'}
            </span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {summary.totalPatients}
          </div>
          <div className="mt-1 text-xs text-slate-600">
            {summary.availableDoctors} of {summary.totalDoctors} doctors available
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">Appointments</span>
            <CalendarClock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {summary.totalAppointments}
          </div>
          <div className="mt-1 text-xs text-slate-600 tabular-nums">
            {summary.scheduledAppointments} Scheduled · {summary.completedAppointments} Completed
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">Active Admissions</span>
            <BedDouble className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {summary.activeAdmissions}
          </div>
          <div className="mt-1 text-xs text-slate-600 tabular-nums">
            {summary.dischargedAdmissions} Discharged records closed
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">Pending Billing</span>
            <Receipt className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            ₹{summary.pendingBillsAmount.toLocaleString('en-IN')}
          </div>
          <div className="mt-1 text-xs text-slate-600 tabular-nums">
            {summary.pendingBillsCount} Pending · ₹{summary.paidBillsAmount.toLocaleString('en-IN')} Paid
          </div>
        </div>
      </div>

      {/* Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Appointments */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-display font-semibold text-slate-900">Recent Appointments</h3>
            <button
              type="button"
              onClick={() => onNavigate('appointments')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800 cursor-pointer"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {recentAppointments.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No appointments recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4 font-medium">Patient</th>
                    <th className="py-2.5 px-4 font-medium">Doctor</th>
                    <th className="py-2.5 px-4 font-medium">Schedule</th>
                    <th className="py-2.5 px-4 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {recentAppointments.map((apt) => (
                    <tr key={apt.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900 whitespace-nowrap">
                          {patientName(apt.patientId, apt.patientName)}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500">{apt.id}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {doctorName(apt.doctorId, apt.doctorName)}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600 whitespace-nowrap tabular-nums">
                        {apt.date} · {apt.timeSlot}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <StatusTag label={apt.status} tone={statusToneFor(apt.status)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Side Alerts & Active Inpatients */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-display font-semibold text-slate-900">Active Ward Admissions</h3>
              <button
                type="button"
                onClick={() => onNavigate('admissions')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800 cursor-pointer"
              >
                <span>Manage beds</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            {activeAdmissions.length === 0 ? (
              <div className="p-6 text-sm text-slate-500 text-center">No active inpatient admissions.</div>
            ) : (
              <div className="divide-y divide-slate-200">
                {activeAdmissions.slice(0, 4).map((adm) => (
                  <div key={adm.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">
                        {patientName(adm.patientId, adm.patientName)}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {adm.ward} · Bed <span className="font-mono text-slate-700">{adm.bedNumber}</span>
                      </div>
                    </div>
                    <StatusTag label={adm.status} tone={statusToneFor(adm.status)} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {role !== 'Patient' ? (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Pill className="w-4 h-4 text-amber-600" />
                  <h3 className="font-display font-semibold text-slate-900">Pharmacy Low-Stock Alerts</h3>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('prescriptions')}
                  className="text-xs font-semibold text-teal-700 hover:text-teal-800 cursor-pointer"
                >
                  Inventory
                </button>
              </div>
              {lowStock.length === 0 ? (
                <div className="p-6 text-sm text-slate-500 text-center">
                  All medicines are above reorder threshold.
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {lowStock.map((med) => (
                    <div key={med.id} className="px-5 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-900 truncate">{med.name}</div>
                        <div className="text-xs text-slate-500">
                          Reorder at <span className="font-mono">{med.reorderLevel}</span> {med.unit}s
                        </div>
                      </div>
                      <StatusTag label={`${med.stockQuantity} left`} tone="warning" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-teal-700" />
                  <h3 className="font-display font-semibold text-slate-900">Pending Bills</h3>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('billing')}
                  className="text-xs font-semibold text-teal-700 hover:text-teal-800 cursor-pointer"
                >
                  View bills
                </button>
              </div>
              {pendingBills.length === 0 ? (
                <div className="p-6 text-sm text-slate-500 text-center">No pending balances.</div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {pendingBills.map((bill) => (
                    <div key={bill.id} className="px-5 py-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-mono text-xs text-slate-600">{bill.id}</div>
                        <div className="text-sm font-semibold text-slate-900 tabular-nums">
                          ₹{bill.totalAmount.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <StatusTag label="Pending" tone="warning" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
