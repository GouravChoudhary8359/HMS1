import { useCallback, useEffect, useState } from 'react';
import { apiFetch, setAuthToken } from './lib/api';
import type {
  Admission,
  Appointment,
  Bill,
  DashboardSummary,
  Department,
  Doctor,
  Medicine,
  Patient,
  Prescription,
  PriorityLevel,
  User,
} from './lib/types';
import { AdmissionsView } from './components/AdmissionsView';
import { AiAdvisoryView } from './components/AiAdvisoryView';
import { AppointmentsView } from './components/AppointmentsView';
import { BillingView } from './components/BillingView';
import { DashboardView } from './components/DashboardView';
import { DoctorsDepartmentsView } from './components/DoctorsDepartmentsView';
import { LoginView } from './components/LoginView';
import { PatientsView } from './components/PatientsView';
import { PrescriptionsMedicinesView } from './components/PrescriptionsMedicinesView';
import { ReportsView } from './components/ReportsView';
import { NAV_ITEMS, type NavSection, Sidebar } from './components/Sidebar';
import { SrsBlueprintView } from './components/SrsBlueprintView';
import { Toast, type ToastMessage } from './components/Toast';
import { TopBar } from './components/TopBar';
import { UsersView } from './components/UsersView';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);

  // Cross-module booking prefill (from Doctors or AI Advisory)
  const [bookingPrefill, setBookingPrefill] = useState<{
    doctorId?: string;
    departmentName?: string;
    priority?: PriorityLevel;
    symptoms?: string;
  }>({});

  const notify = useCallback((type: 'success' | 'error' | 'info', text: string) => {
    setToast({ id: Date.now(), type, text });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const loadWorkspaceData = useCallback(async (currentUser: User) => {
    const requests: Array<Promise<void>> = [
      apiFetch<{ summary: DashboardSummary }>('/api/dashboard').then((d) => setSummary(d.summary)),
      apiFetch<{ patients: Patient[] }>('/api/patients').then((d) => setPatients(d.patients)),
      apiFetch<{ departments: Department[] }>('/api/departments').then((d) =>
        setDepartments(d.departments)
      ),
      apiFetch<{ doctors: Doctor[] }>('/api/doctors').then((d) => setDoctors(d.doctors)),
      apiFetch<{ appointments: Appointment[] }>('/api/appointments').then((d) =>
        setAppointments(d.appointments)
      ),
      apiFetch<{ admissions: Admission[] }>('/api/admissions').then((d) =>
        setAdmissions(d.admissions)
      ),
      apiFetch<{ medicines: Medicine[] }>('/api/medicines').then((d) => setMedicines(d.medicines)),
      apiFetch<{ prescriptions: Prescription[] }>('/api/prescriptions').then((d) =>
        setPrescriptions(d.prescriptions)
      ),
      apiFetch<{ bills: Bill[] }>('/api/bills').then((d) => setBills(d.bills)),
    ];

    if (currentUser.role === 'Admin') {
      requests.push(
        apiFetch<{ users: User[] }>('/api/users').then((d) => setUsersList(d.users))
      );
    } else {
      setUsersList([]);
    }

    await Promise.all(requests);
  }, []);

  useEffect(() => {
    apiFetch<{ user: User | null }>('/api/auth/session')
      .then(async (res) => {
        if (res.user) {
          setUser(res.user);
          await loadWorkspaceData(res.user);
        } else {
          setUser(null);
        }
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setAuthChecked(true);
      });
  }, [loadWorkspaceData]);

  const handleLoginSuccess = async (loggedInUser: User) => {
    setUser(loggedInUser);
    setActiveSection('dashboard');
    await loadWorkspaceData(loggedInUser);
    notify('success', `Signed in as ${loggedInUser.fullName} (${loggedInUser.role}).`);
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setAuthToken(null);
    setUser(null);
    setSummary(null);
    setActiveSection('dashboard');
    notify('info', 'You have signed out cleanly.');
  };

  const handleRefresh = useCallback(async () => {
    if (!user) return;
    await loadWorkspaceData(user);
  }, [user, loadWorkspaceData]);

  const clearPrefill = useCallback(() => {
    setBookingPrefill({});
  }, []);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-sm text-slate-600 font-medium">Loading CareLedger HMS...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LoginView onLoginSuccess={handleLoginSuccess} />
        <Toast toast={toast} onDismiss={() => setToast(null)} />
      </>
    );
  }

  const allowedSection = NAV_ITEMS.some(
    (item) => item.id === activeSection && item.roles.includes(user.role)
  )
    ? activeSection
    : 'dashboard';

  const currentNavMeta = NAV_ITEMS.find((n) => n.id === allowedSection);

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      <Sidebar
        active={allowedSection}
        role={user.role}
        mobileOpen={mobileMenuOpen}
        onSelect={setActiveSection}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          sectionTitle={currentNavMeta?.label || 'Dashboard'}
          user={user}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onLogout={handleLogout}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {allowedSection === 'dashboard' && (
            <DashboardView
              role={user.role}
              summary={summary}
              appointments={appointments}
              admissions={admissions}
              medicines={medicines}
              bills={bills}
              patients={patients}
              doctors={doctors}
              onNavigate={setActiveSection}
            />
          )}

          {allowedSection === 'patients' && (
            <PatientsView
              patients={patients}
              role={user.role}
              onRefresh={handleRefresh}
              onNotify={notify}
            />
          )}

          {allowedSection === 'doctors' && (
            <DoctorsDepartmentsView
              doctors={doctors}
              departments={departments}
              role={user.role}
              linkedDoctorId={user.linkedDoctorId}
              onRefresh={handleRefresh}
              onNotify={notify}
              onBookWithDoctor={(doctorId) => {
                setBookingPrefill({ doctorId });
                setActiveSection('appointments');
              }}
            />
          )}

          {allowedSection === 'appointments' && (
            <AppointmentsView
              appointments={appointments}
              patients={patients}
              doctors={doctors}
              departments={departments}
              role={user.role}
              linkedPatientId={user.linkedPatientId}
              prefillDoctorId={bookingPrefill.doctorId}
              prefillDepartmentName={bookingPrefill.departmentName}
              prefillPriority={bookingPrefill.priority}
              prefillSymptoms={bookingPrefill.symptoms}
              onClearPrefill={clearPrefill}
              onRefresh={handleRefresh}
              onNotify={notify}
            />
          )}

          {allowedSection === 'admissions' && (
            <AdmissionsView
              admissions={admissions}
              patients={patients}
              doctors={doctors}
              role={user.role}
              onRefresh={handleRefresh}
              onNotify={notify}
            />
          )}

          {allowedSection === 'prescriptions' && (
            <PrescriptionsMedicinesView
              prescriptions={prescriptions}
              medicines={medicines}
              patients={patients}
              doctors={doctors}
              role={user.role}
              linkedDoctorId={user.linkedDoctorId}
              onRefresh={handleRefresh}
              onNotify={notify}
            />
          )}

          {allowedSection === 'billing' && (
            <BillingView
              bills={bills}
              patients={patients}
              role={user.role}
              onRefresh={handleRefresh}
              onNotify={notify}
            />
          )}

          {allowedSection === 'reports' && (
            <ReportsView
              departments={departments}
              doctors={doctors}
              appointments={appointments}
              admissions={admissions}
              medicines={medicines}
              bills={bills}
              patients={patients}
            />
          )}

          {allowedSection === 'ai-advisory' && (
            <AiAdvisoryView
              onApplyToBooking={(departmentName, priority, symptoms) => {
                setBookingPrefill({ departmentName, priority, symptoms });
                setActiveSection('appointments');
              }}
              onNotify={notify}
            />
          )}

          {allowedSection === 'users' && user.role === 'Admin' && (
            <UsersView
              users={usersList}
              currentUserId={user.id}
              onRefresh={handleRefresh}
              onNotify={notify}
            />
          )}

          {allowedSection === 'srs-blueprint' && <SrsBlueprintView />}
        </main>
      </div>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
