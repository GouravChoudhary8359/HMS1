import { useState } from 'react';
import { Activity, Lock, ShieldCheck } from 'lucide-react';
import { apiFetch, ApiError, setAuthToken } from '../lib/api';
import type { Role, User } from '../lib/types';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

const DEMO_ACCOUNTS: Array<{
  role: Role;
  username: string;
  password: string;
  scope: string;
}> = [
  {
    role: 'Admin',
    username: 'admin',
    password: 'admin123',
    scope: 'Users, Doctors, Departments, Full Operations & Reports',
  },
  {
    role: 'Doctor',
    username: 'doctor',
    password: 'doctor123',
    scope: 'Appointments, Clinical Notes & Prescriptions',
  },
  {
    role: 'Receptionist',
    username: 'reception',
    password: 'reception123',
    scope: 'Patients, Booking, Admissions, Stock & Billing',
  },
  {
    role: 'Patient',
    username: 'patient',
    password: 'patient123',
    scope: 'My Appointments, Prescriptions, Bills & AI Triage',
  },
];

export function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!identifier.trim() || !password) {
      setError('Please enter both username/email and password.');
      return;
    }
    setSubmitting(true);
    try {
      const data = await apiFetch<{ user: User; token?: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      if (data.token) {
        setAuthToken(data.token);
      }
      onLoginSuccess(data.user);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Unable to reach the authentication server.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (username: string, pass: string) => {
    setIdentifier(username);
    setPassword(pass);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="lg:col-span-5 bg-slate-900 text-white p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 text-teal-400">
              <Activity className="w-6 h-6" />
              <span className="text-lg font-display font-bold tracking-tight text-white">
                CareLedger HMS
              </span>
            </div>
            <h1 className="mt-8 text-2xl font-display font-bold tracking-tight text-balance leading-snug">
              Hospital Management &amp; Clinical Operations Workspace
            </h1>
            <p className="mt-3 text-sm text-slate-300 leading-relaxed">
              Academic implementation covering all 28 core functional requirements: role-based access, patient records, conflict-checked scheduling, admissions, prescriptions, billing, reporting, and rule-based AI advisory.
            </p>
          </div>

          <div className="mt-10 pt-6 border-t border-slate-800 space-y-2.5 text-xs text-slate-300">
            <div className="flex items-center gap-2 text-slate-200 font-medium">
              <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
              <span>Security Controls Active (SEC-01 to SEC-07)</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Scrypt-hashed credentials · Signed HttpOnly session cookies · Server-enforced RBAC · Non-diagnostic academic AI advisory.
            </p>
          </div>
        </div>

        <div className="lg:col-span-7 p-8 sm:p-10">
          <div className="max-w-md mx-auto">
            <h2 className="text-xl font-display font-bold text-slate-900">Sign in to HMS</h2>
            <p className="mt-1 text-sm text-slate-600">
              Enter your registered username or hospital email address.
            </p>

            {error && (
              <div
                role="alert"
                className="mt-4 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-800"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="login-identifier"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Username or Email
                </label>
                <input
                  id="login-identifier"
                  type="text"
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. admin or k.sharma@careledger.org"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-teal-700"
                />
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-teal-700"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>{submitting ? 'Signing in...' : 'Sign In'}</span>
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-200">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Quick-Fill Demonstration Accounts
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.role}
                    type="button"
                    onClick={() => fillDemo(acc.username, acc.password)}
                    className="text-left p-3 rounded-lg border border-slate-200 hover:border-teal-600 hover:bg-teal-50/40 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-900">{acc.role}</span>
                      <span className="font-mono text-xs text-teal-800">{acc.username}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600 line-clamp-2">{acc.scope}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
