import { useState } from 'react';
import { StatusTag } from './StatusTag';

const FR_MATRIX: Array<{ id: string; feature: string; requirement: string; module: string }> = [
  { id: 'FR-01', feature: 'Auth & Role', requirement: 'Authenticate registered user using valid login credentials', module: 'Login & /api/auth/login' },
  { id: 'FR-02', feature: 'Auth & Role', requirement: 'Provide role-based access for Admin, Doctor, Receptionist & Patient', module: 'RBAC & UsersView' },
  { id: 'FR-03', feature: 'Auth & Role', requirement: 'Allow authenticated user to log out and end session', module: 'TopBar & /api/auth/logout' },
  { id: 'FR-04', feature: 'Patient Mgmt', requirement: 'Create patient record with personal and contact details', module: 'PatientsView' },
  { id: 'FR-05', feature: 'Patient Mgmt', requirement: 'Search and view patient records', module: 'PatientsView' },
  { id: 'FR-06', feature: 'Patient Mgmt', requirement: 'Update an existing patient record', module: 'PatientsView' },
  { id: 'FR-07', feature: 'Patient Mgmt', requirement: 'Validate required patient fields before saving', module: 'validatePatientInput' },
  { id: 'FR-08', feature: 'Doctor & Dept', requirement: 'Add and maintain doctor records', module: 'DoctorsDepartmentsView' },
  { id: 'FR-09', feature: 'Doctor & Dept', requirement: 'Create and maintain department records', module: 'DoctorsDepartmentsView' },
  { id: 'FR-10', feature: 'Doctor & Dept', requirement: 'Display doctor availability/listing for appointment selection', module: 'Doctors & Appointments' },
  { id: 'FR-11', feature: 'Appointments', requirement: 'Create an appointment for a patient with a selected doctor', module: 'AppointmentsView' },
  { id: 'FR-12', feature: 'Appointments', requirement: 'Check doctor/date-time availability before confirming', module: 'checkAppointmentConflict' },
  { id: 'FR-13', feature: 'Appointments', requirement: 'Reschedule or cancel an appointment', module: 'AppointmentsView' },
  { id: 'FR-14', feature: 'Appointments', requirement: 'Maintain appointment status (Scheduled, Completed, Cancelled)', module: 'AppointmentsView' },
  { id: 'FR-15', feature: 'Admission', requirement: 'Create an admission record for a patient', module: 'AdmissionsView' },
  { id: 'FR-16', feature: 'Admission', requirement: 'Update ward/bed and admission status information', module: 'AdmissionsView' },
  { id: 'FR-17', feature: 'Admission', requirement: 'Create discharge record with discharge date and details', module: 'AdmissionsView' },
  { id: 'FR-18', feature: 'Rx & Medicine', requirement: 'Allow a doctor to create a prescription for a patient', module: 'PrescriptionsMedicinesView' },
  { id: 'FR-19', feature: 'Rx & Medicine', requirement: 'Maintain medicine catalog records', module: 'PrescriptionsMedicinesView' },
  { id: 'FR-20', feature: 'Rx & Medicine', requirement: 'View and update basic medicine stock information', module: 'PrescriptionsMedicinesView' },
  { id: 'FR-21', feature: 'Rx & Medicine', requirement: 'Validate required prescription and medicine fields', module: 'validatePrescriptionInput' },
  { id: 'FR-22', feature: 'Billing', requirement: 'Create a bill for a patient', module: 'BillingView' },
  { id: 'FR-23', feature: 'Billing', requirement: 'Calculate bill total from entered bill items/charges', module: 'calculateBillTotals' },
  { id: 'FR-24', feature: 'Billing', requirement: 'Record payment status (Pending or Paid)', module: 'BillingView' },
  { id: 'FR-25', feature: 'Dashboard & AI', requirement: 'Display dashboard summaries (patients, appts, admissions, bills)', module: 'DashboardView' },
  { id: 'FR-26', feature: 'Dashboard & AI', requirement: 'Provide administrative report/list views with CSV export', module: 'ReportsView' },
  { id: 'FR-27', feature: 'Dashboard & AI', requirement: 'Suggest department from symptoms using rule/score algorithm', module: 'AiAdvisoryView' },
  { id: 'FR-28', feature: 'Dashboard & AI', requirement: 'Suggest appointment priority using predefined rules', module: 'AiAdvisoryView' },
];

export function SrsBlueprintView() {
  const [diagramTab, setDiagramTab] = useState<'fr' | 'usecase' | 'activity' | 'dfd'>('fr');

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-900">
            SRS Traceability &amp; Software Engineering Diagrams
          </h2>
          <p className="text-sm text-slate-600">
            Verification matrix for all 28 core functional requirements alongside Use Case, Activity Swimlane, and DFD diagrams.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg self-start">
          {[
            { id: 'fr', label: '28 FR Matrix' },
            { id: 'usecase', label: 'Exp 3: Use Case' },
            { id: 'activity', label: 'Exp 4: Activity' },
            { id: 'dfd', label: 'Exp 5: DFDs (0-2)' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setDiagramTab(t.id as typeof diagramTab)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap cursor-pointer ${
                diagramTab === t.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {diagramTab === 'fr' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-medium">FR ID</th>
                  <th className="py-3 px-4 font-medium">Feature Area</th>
                  <th className="py-3 px-4 font-medium">Specification</th>
                  <th className="py-3 px-4 font-medium">Implementation</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {FR_MATRIX.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-mono text-xs font-semibold text-teal-800 whitespace-nowrap">
                      {row.id}
                    </td>
                    <td className="py-2.5 px-4 text-slate-700 whitespace-nowrap">{row.feature}</td>
                    <td className="py-2.5 px-4 text-slate-900">{row.requirement}</td>
                    <td className="py-2.5 px-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                      {row.module}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <StatusTag label="Implemented" tone="success" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {diagramTab === 'usecase' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h3 className="font-display font-bold text-slate-900">
            Fig 3.1 — UML Use Case Diagram (Hospital Management System)
          </h3>
          <div className="overflow-x-auto">
            <svg viewBox="0 0 900 460" className="w-full min-w-[700px] border border-slate-200 rounded-lg bg-slate-50">
              {/* System Boundary */}
              <rect x="190" y="24" width="520" height="412" rx="10" fill="#ffffff" stroke="#0f766e" strokeWidth="2" />
              <text x="450" y="48" textAnchor="middle" fontSize="14" fontWeight="700" fill="#0f172a">
                Hospital Management System (28 Core FRs)
              </text>

              {/* Left Actors */}
              {[
                { label: 'Admin', y: 95 },
                { label: 'Receptionist', y: 215 },
                { label: 'Doctor', y: 345 },
              ].map((actor) => (
                <g key={actor.label} transform={`translate(75, ${actor.y})`}>
                  <circle cx="0" cy="-16" r="11" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
                  <line x1="0" y1="-5" x2="0" y2="20" stroke="#0f172a" strokeWidth="2" />
                  <line x1="-14" y1="4" x2="14" y2="4" stroke="#0f172a" strokeWidth="2" />
                  <line x1="0" y1="20" x2="-11" y2="38" stroke="#0f172a" strokeWidth="2" />
                  <line x1="0" y1="20" x2="11" y2="38" stroke="#0f172a" strokeWidth="2" />
                  <text x="0" y="56" textAnchor="middle" fontSize="12" fontWeight="600" fill="#0f172a">
                    {actor.label}
                  </text>
                </g>
              ))}

              {/* Right Actors */}
              {[
                { label: 'Patient', y: 155 },
                { label: 'AI Advisory System', y: 335 },
              ].map((actor) => (
                <g key={actor.label} transform={`translate(815, ${actor.y})`}>
                  <circle cx="0" cy="-16" r="11" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
                  <line x1="0" y1="-5" x2="0" y2="20" stroke="#0f172a" strokeWidth="2" />
                  <line x1="-14" y1="4" x2="14" y2="4" stroke="#0f172a" strokeWidth="2" />
                  <line x1="0" y1="20" x2="-11" y2="38" stroke="#0f172a" strokeWidth="2" />
                  <line x1="0" y1="20" x2="11" y2="38" stroke="#0f172a" strokeWidth="2" />
                  <text x="0" y="56" textAnchor="middle" fontSize="12" fontWeight="600" fill="#0f172a">
                    {actor.label}
                  </text>
                </g>
              ))}

              {/* Use Cases */}
              {[
                { cx: 340, cy: 95, label: 'Login / Logout & RBAC' },
                { cx: 560, cy: 95, label: 'Manage Users & Depts' },
                { cx: 340, cy: 165, label: 'Manage Patient Records' },
                { cx: 560, cy: 165, label: 'Book & Check Availability' },
                { cx: 340, cy: 235, label: 'Admissions & Discharges' },
                { cx: 560, cy: 235, label: 'Billing & Payment Status' },
                { cx: 340, cy: 315, label: 'Prescriptions & Medicines' },
                { cx: 560, cy: 315, label: 'Dashboard & Reports' },
                { cx: 450, cy: 390, label: 'Suggest Dept & Priority (AI)' },
              ].map((uc) => (
                <g key={uc.label}>
                  <ellipse cx={uc.cx} cy={uc.cy} rx="98" ry="23" fill="#f0fdfa" stroke="#0f766e" strokeWidth="1.5" />
                  <text x={uc.cx} y={uc.cy + 4} textAnchor="middle" fontSize="11.5" fontWeight="600" fill="#0f172a">
                    {uc.label}
                  </text>
                </g>
              ))}

              {/* Association Lines */}
              <line x1="95" y1="95" x2="242" y2="95" stroke="#475569" strokeWidth="1.5" />
              <line x1="95" y1="95" x2="462" y2="95" stroke="#475569" strokeWidth="1.5" />
              <line x1="95" y1="105" x2="462" y2="315" stroke="#475569" strokeWidth="1.2" />

              <line x1="95" y1="215" x2="242" y2="165" stroke="#475569" strokeWidth="1.5" />
              <line x1="95" y1="215" x2="462" y2="165" stroke="#475569" strokeWidth="1.5" />
              <line x1="95" y1="215" x2="242" y2="235" stroke="#475569" strokeWidth="1.5" />
              <line x1="95" y1="220" x2="462" y2="235" stroke="#475569" strokeWidth="1.5" />

              <line x1="95" y1="345" x2="242" y2="315" stroke="#475569" strokeWidth="1.5" />
              <line x1="95" y1="340" x2="462" y2="175" stroke="#475569" strokeWidth="1.2" />

              <line x1="795" y1="155" x2="658" y2="165" stroke="#475569" strokeWidth="1.5" />
              <line x1="795" y1="160" x2="658" y2="235" stroke="#475569" strokeWidth="1.2" />
              <line x1="795" y1="335" x2="548" y2="390" stroke="#0f766e" strokeWidth="1.5" />
            </svg>
          </div>
        </div>
      )}

      {diagramTab === 'activity' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h3 className="font-display font-bold text-slate-900">
            Fig 4.1 — Activity Diagram with Swimlanes (Appointment Booking Workflow)
          </h3>
          <div className="overflow-x-auto">
            <svg viewBox="0 0 900 420" className="w-full min-w-[720px] border border-slate-200 rounded-lg bg-white">
              {/* Swimlane Columns */}
              {[
                { title: 'Patient / Desk', x: 0 },
                { title: 'HMS System', x: 225 },
                { title: 'Database', x: 450 },
                { title: 'Doctor', x: 675 },
              ].map((lane, i) => (
                <g key={lane.title}>
                  <rect x={lane.x} y="0" width="225" height="420" fill={i % 2 === 0 ? '#f8fafc' : '#ffffff'} stroke="#cbd5e1" />
                  <rect x={lane.x} y="0" width="225" height="36" fill="#0f172a" />
                  <text x={lane.x + 112} y="23" textAnchor="middle" fontSize="12" fontWeight="700" fill="#ffffff">
                    {lane.title}
                  </text>
                </g>
              ))}

              {/* Nodes */}
              <circle cx="112" cy="64" r="9" fill="#0f172a" />
              <rect x="32" y="92" width="160" height="36" rx="8" fill="#f0fdfa" stroke="#0f766e" strokeWidth="1.5" />
              <text x="112" y="114" textAnchor="middle" fontSize="11" fontWeight="600">Select Doctor &amp; Slot</text>

              <rect x="255" y="92" width="165" height="36" rx="8" fill="#f0fdfa" stroke="#0f766e" strokeWidth="1.5" />
              <text x="337" y="114" textAnchor="middle" fontSize="11" fontWeight="600">Validate Patient Details</text>

              {/* Decision Diamond */}
              <polygon points="337,150 375,176 337,202 299,176" fill="#fffbeb" stroke="#b45309" strokeWidth="1.5" />
              <text x="337" y="180" textAnchor="middle" fontSize="10" fontWeight="700">Slot Free?</text>

              <rect x="255" y="228" width="165" height="36" rx="8" fill="#fef2f2" stroke="#b91c1c" strokeWidth="1.5" />
              <text x="337" y="250" textAnchor="middle" fontSize="11" fontWeight="600">Show Alternative Slots</text>

              <rect x="482" y="158" width="160" height="36" rx="8" fill="#f0fdfa" stroke="#0f766e" strokeWidth="1.5" />
              <text x="562" y="180" textAnchor="middle" fontSize="11" fontWeight="600">Save Appointment (Scheduled)</text>

              <rect x="705" y="158" width="165" height="36" rx="8" fill="#f0fdfa" stroke="#0f766e" strokeWidth="1.5" />
              <text x="787" y="180" textAnchor="middle" fontSize="11" fontWeight="600">Accept / Complete Visit</text>

              <rect x="482" y="258" width="160" height="36" rx="8" fill="#f0fdfa" stroke="#0f766e" strokeWidth="1.5" />
              <text x="562" y="280" textAnchor="middle" fontSize="11" fontWeight="600">Update Status in DB</text>

              <rect x="32" y="328" width="160" height="36" rx="8" fill="#ecfdf5" stroke="#15803d" strokeWidth="1.5" />
              <text x="112" y="350" textAnchor="middle" fontSize="11" fontWeight="600">Confirmation Viewed</text>

              <circle cx="112" cy="392" r="10" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
              <circle cx="112" cy="392" r="6" fill="#0f172a" />

              {/* Flows */}
              <line x1="112" y1="73" x2="112" y2="92" stroke="#334155" strokeWidth="1.5" />
              <line x1="192" y1="110" x2="255" y2="110" stroke="#334155" strokeWidth="1.5" />
              <line x1="337" y1="128" x2="337" y2="150" stroke="#334155" strokeWidth="1.5" />
              <line x1="337" y1="202" x2="337" y2="228" stroke="#b91c1c" strokeWidth="1.5" />
              <text x="348" y="218" fontSize="10" fill="#b91c1c">No</text>
              <line x1="375" y1="176" x2="482" y2="176" stroke="#15803d" strokeWidth="1.5" />
              <text x="422" y="168" fontSize="10" fill="#15803d">Yes</text>
              <line x1="642" y1="176" x2="705" y2="176" stroke="#334155" strokeWidth="1.5" />
              <line x1="787" y1="194" x2="787" y2="276" stroke="#334155" strokeWidth="1.5" />
              <line x1="787" y1="276" x2="642" y2="276" stroke="#334155" strokeWidth="1.5" />
              <line x1="562" y1="294" x2="562" y2="346" stroke="#334155" strokeWidth="1.5" />
              <line x1="562" y1="346" x2="192" y2="346" stroke="#334155" strokeWidth="1.5" />
              <line x1="112" y1="364" x2="112" y2="382" stroke="#334155" strokeWidth="1.5" />
            </svg>
          </div>
        </div>
      )}

      {diagramTab === 'dfd' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
            <h3 className="font-display font-bold text-slate-900">Fig 5.1 — DFD Level 0 (Context Diagram)</h3>
            <p className="text-xs text-slate-600">
              Single HMS process exchanging credentials, patient records, appointment schedules, bills, and administrative reports with external entities.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-center pt-2 text-center text-xs">
              <div className="p-3 border border-slate-300 rounded-lg bg-slate-50 font-semibold">Patient &amp; Receptionist</div>
              <div className="text-slate-500">→ Patient/Booking Data →</div>
              <div className="p-4 border-2 border-teal-700 rounded-xl bg-teal-50 font-display font-bold text-teal-900">
                0.0 Hospital Management System
              </div>
              <div className="text-slate-500">← Schedules / Reports ←</div>
              <div className="p-3 border border-slate-300 rounded-lg bg-slate-50 font-semibold">Doctor &amp; Admin</div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
            <h3 className="font-display font-bold text-slate-900">Fig 5.2 &amp; 5.3 — DFD Level 1 Modules &amp; Level 2 Appointment Expansion</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {[
                { id: '1.0', title: 'Patient Management', store: 'D1 Patient Data' },
                { id: '2.0', title: 'Appointment (2.1 Book → 2.2 Check Slot → 2.3 Confirm)', store: 'D2 Appointment Data' },
                { id: '3.0', title: 'Admission & Discharge', store: 'D3 Ward/Bed Records' },
                { id: '4.0', title: 'Prescription & Medicine', store: 'D4 Pharmacy & Rx Store' },
                { id: '5.0', title: 'Billing & Payments', store: 'D5 Financial Ledger' },
                { id: '6.0', title: 'Reports & AI Advisory', store: 'D3/D6 Hospital Analytics' },
              ].map((p) => (
                <div key={p.id} className="p-4 border border-slate-200 rounded-lg bg-slate-50/70">
                  <div className="font-mono text-teal-800 font-semibold">Process {p.id}</div>
                  <div className="mt-1 font-semibold text-slate-900">{p.title}</div>
                  <div className="mt-2 font-mono text-[11px] text-slate-500">Data Store: {p.store}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
