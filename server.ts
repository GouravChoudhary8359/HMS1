import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import {
  calculateBillTotals,
  checkAppointmentConflict,
  getAvailableSlotsForDoctor,
  suggestAppointmentPriority,
  suggestDepartmentFromSymptoms,
  validateDepartmentInput,
  validateDoctorInput,
  validateMedicineInput,
  validatePatientInput,
  validatePrescriptionInput,
} from './src/lib/hmsRules.ts';
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
  Role,
  User,
} from './src/lib/types.ts';
import { hashPassword, HmsStore, sanitizeUser, verifyPassword } from './server/store.ts';

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const SESSION_SECRET = process.env.HMS_SESSION_SECRET || 'careledger-academic-hms-secret-key-2026';
const SESSION_COOKIE = 'hms_session';

interface AuthenticatedRequest extends Request {
  currentUser?: User;
}

function signToken(payload: { userId: string; role: Role; exp: number }): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyToken(token: string): { userId: string; role: Role; exp: number } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as {
      userId: string;
      role: Role;
      exp: number;
    };
    if (!parsed.userId || !parsed.exp || Date.now() > parsed.exp) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const map: Record<string, string> = {};
  if (!cookieHeader) return map;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx > -1) {
      const k = part.slice(0, idx).trim();
      const v = decodeURIComponent(part.slice(idx + 1).trim());
      map[k] = v;
    }
  }
  return map;
}

async function startServer() {
  const app = express();
  const store = new HmsStore();

  app.use(express.json({ limit: '1mb' }));

  const getTokenFromRequest = (req: Request): string | undefined => {
    const cookies = parseCookies(req.headers.cookie);
    if (cookies[SESSION_COOKIE]) return cookies[SESSION_COOKIE];
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) return auth.slice(7);
    return undefined;
  };

  const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const token = getTokenFromRequest(req);
    if (!token) {
      res.status(401).json({ error: 'Authentication required. Please log in.' });
      return;
    }
    const decoded = verifyToken(token);
    if (!decoded) {
      res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
      return;
    }
    const found = store.getData().users.find((u) => u.id === decoded.userId && u.active);
    if (!found) {
      res.status(401).json({ error: 'User account is inactive or no longer exists.' });
      return;
    }
    req.currentUser = sanitizeUser(found);
    next();
  };

  const requireRoles = (...roles: Role[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.currentUser) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }
      if (!roles.includes(req.currentUser.role)) {
        res.status(403).json({
          error: `Access denied. Role '${req.currentUser.role}' is not authorized for this action.`,
        });
        return;
      }
      next();
    };
  };

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'CareLedger HMS' });
  });

  // FR-01: Login
  app.post('/api/auth/login', (req, res) => {
    const { identifier, password } = req.body || {};
    if (!identifier || !password || typeof identifier !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Username/email and password are required.' });
      return;
    }
    const cleanId = identifier.trim().toLowerCase();
    const user = store
      .getData()
      .users.find(
        (u) => u.username.toLowerCase() === cleanId || u.email.toLowerCase() === cleanId
      );

    if (!user || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: 'Invalid username/email or password.' });
      return;
    }
    if (!user.active) {
      res.status(403).json({ error: 'Account is disabled. Contact the hospital administrator.' });
      return;
    }

    const token = signToken({
      userId: user.id,
      role: user.role,
      exp: Date.now() + 1000 * 60 * 60 * 12,
    });

    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: isHttps ? 'none' : 'lax',
      secure: isHttps,
      path: '/',
      maxAge: 1000 * 60 * 60 * 12,
    });

    res.json({ user: sanitizeUser(user), token });
  });

  // FR-03: Logout
  app.post('/api/auth/logout', (req, res) => {
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.clearCookie(SESSION_COOKIE, {
      path: '/',
      sameSite: isHttps ? 'none' : 'lax',
      secure: isHttps,
    });
    res.json({ ok: true });
  });

  app.get('/api/auth/session', (req, res) => {
    const token = getTokenFromRequest(req);
    if (!token) {
      res.json({ user: null });
      return;
    }
    const decoded = verifyToken(token);
    if (!decoded) {
      res.json({ user: null });
      return;
    }
    const found = store.getData().users.find((u) => u.id === decoded.userId && u.active);
    res.json({ user: found ? sanitizeUser(found) : null });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    res.json({ user: req.currentUser });
  });

  // FR-02: User & Role Management (Admin only)
  app.get('/api/users', requireAuth, requireRoles('Admin'), (_req, res) => {
    res.json({ users: store.getData().users.map(sanitizeUser) });
  });

  app.post('/api/users', requireAuth, requireRoles('Admin'), (req, res) => {
    const { username, email, fullName, role, password, linkedDoctorId, linkedPatientId } = req.body || {};
    if (!username || !email || !fullName || !role || !password) {
      res.status(400).json({ error: 'Username, email, full name, role, and password are required.' });
      return;
    }
    if (!['Admin', 'Doctor', 'Receptionist', 'Patient'].includes(role)) {
      res.status(400).json({ error: 'Invalid role specified.' });
      return;
    }
    if (String(password).length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }
    const db = store.getData();
    const dup = db.users.find(
      (u) =>
        u.username.toLowerCase() === String(username).trim().toLowerCase() ||
        u.email.toLowerCase() === String(email).trim().toLowerCase()
    );
    if (dup) {
      res.status(409).json({ error: 'A user with this username or email already exists.' });
      return;
    }
    const newUser = {
      id: `usr-${Date.now()}`,
      username: String(username).trim(),
      email: String(email).trim(),
      fullName: String(fullName).trim(),
      role: role as Role,
      active: true,
      linkedDoctorId: linkedDoctorId || undefined,
      linkedPatientId: linkedPatientId || undefined,
      passwordHash: hashPassword(String(password)),
      createdAt: new Date().toISOString(),
    };
    db.users.push(newUser);
    store.save();
    res.status(201).json({ user: sanitizeUser(newUser) });
  });

  app.put('/api/users/:id', requireAuth, requireRoles('Admin'), (req: AuthenticatedRequest, res) => {
    const db = store.getData();
    const user = db.users.find((u) => u.id === req.params.id);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    const { fullName, email, role, active, password } = req.body || {};
    if (fullName) user.fullName = String(fullName).trim();
    if (email) user.email = String(email).trim();
    if (role && ['Admin', 'Doctor', 'Receptionist', 'Patient'].includes(role)) {
      user.role = role as Role;
    }
    if (typeof active === 'boolean') {
      if (user.id === req.currentUser?.id && !active) {
        res.status(400).json({ error: 'You cannot deactivate your own active admin account.' });
        return;
      }
      user.active = active;
    }
    if (password && String(password).length >= 6) {
      user.passwordHash = hashPassword(String(password));
    }
    store.save();
    res.json({ user: sanitizeUser(user) });
  });

  // FR-04..07: Patients
  app.get('/api/patients', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = store.getData();
    const q = String(req.query.q || '').trim().toLowerCase();
    let list = db.patients;
    if (req.currentUser?.role === 'Patient') {
      list = list.filter((p) => p.id === req.currentUser?.linkedPatientId);
    }
    if (q) {
      list = list.filter(
        (p) =>
          p.fullName.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.phone.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q)
      );
    }
    res.json({ patients: list });
  });

  app.post('/api/patients', requireAuth, requireRoles('Admin', 'Receptionist'), (req, res) => {
    const errors = validatePatientInput(req.body || {});
    if (Object.keys(errors).length > 0) {
      res.status(400).json({ error: 'Patient validation failed.', errors });
      return;
    }
    const db = store.getData();
    const now = new Date().toISOString();
    const patient: Patient = {
      id: store.nextId('PAT', db.patients, 1001),
      fullName: String(req.body.fullName).trim(),
      age: Number(req.body.age),
      gender: req.body.gender,
      phone: String(req.body.phone).trim(),
      email: String(req.body.email || '').trim(),
      address: String(req.body.address).trim(),
      bloodGroup: String(req.body.bloodGroup).trim(),
      emergencyContact: String(req.body.emergencyContact).trim(),
      allergies: String(req.body.allergies || 'None known').trim(),
      createdAt: now,
      updatedAt: now,
    };
    db.patients.unshift(patient);
    store.save();
    res.status(201).json({ patient });
  });

  app.put('/api/patients/:id', requireAuth, requireRoles('Admin', 'Receptionist'), (req, res) => {
    const db = store.getData();
    const patient = db.patients.find((p) => p.id === req.params.id);
    if (!patient) {
      res.status(404).json({ error: 'Patient record not found.' });
      return;
    }
    const errors = validatePatientInput(req.body || {});
    if (Object.keys(errors).length > 0) {
      res.status(400).json({ error: 'Patient validation failed.', errors });
      return;
    }
    patient.fullName = String(req.body.fullName).trim();
    patient.age = Number(req.body.age);
    patient.gender = req.body.gender;
    patient.phone = String(req.body.phone).trim();
    patient.email = String(req.body.email || '').trim();
    patient.address = String(req.body.address).trim();
    patient.bloodGroup = String(req.body.bloodGroup).trim();
    patient.emergencyContact = String(req.body.emergencyContact).trim();
    patient.allergies = String(req.body.allergies || 'None known').trim();
    patient.updatedAt = new Date().toISOString();
    store.save();
    res.json({ patient });
  });

  // FR-08..10: Departments & Doctors
  app.get('/api/departments', requireAuth, (_req, res) => {
    res.json({ departments: store.getData().departments });
  });

  app.post('/api/departments', requireAuth, requireRoles('Admin', 'Receptionist'), (req, res) => {
    const errors = validateDepartmentInput(req.body || {});
    if (Object.keys(errors).length > 0) {
      res.status(400).json({ error: 'Department validation failed.', errors });
      return;
    }
    const db = store.getData();
    const dept: Department = {
      id: `dept-${Date.now()}`,
      code: String(req.body.code).trim().toUpperCase(),
      name: String(req.body.name).trim(),
      floor: String(req.body.floor).trim(),
      headDoctorName: String(req.body.headDoctorName).trim(),
      description: String(req.body.description || '').trim(),
    };
    db.departments.push(dept);
    store.save();
    res.status(201).json({ department: dept });
  });

  app.put('/api/departments/:id', requireAuth, requireRoles('Admin', 'Receptionist'), (req, res) => {
    const db = store.getData();
    const dept = db.departments.find((d) => d.id === req.params.id);
    if (!dept) {
      res.status(404).json({ error: 'Department not found.' });
      return;
    }
    const errors = validateDepartmentInput(req.body || {});
    if (Object.keys(errors).length > 0) {
      res.status(400).json({ error: 'Department validation failed.', errors });
      return;
    }
    dept.code = String(req.body.code).trim().toUpperCase();
    dept.name = String(req.body.name).trim();
    dept.floor = String(req.body.floor).trim();
    dept.headDoctorName = String(req.body.headDoctorName).trim();
    dept.description = String(req.body.description || '').trim();
    store.save();
    res.json({ department: dept });
  });

  app.get('/api/doctors', requireAuth, (_req, res) => {
    res.json({ doctors: store.getData().doctors });
  });

  app.post('/api/doctors', requireAuth, requireRoles('Admin', 'Receptionist'), (req, res) => {
    const errors = validateDoctorInput(req.body || {});
    if (Object.keys(errors).length > 0) {
      res.status(400).json({ error: 'Doctor validation failed.', errors });
      return;
    }
    const db = store.getData();
    const doc: Doctor = {
      id: `doc-${Date.now()}`,
      fullName: String(req.body.fullName).trim(),
      departmentId: String(req.body.departmentId),
      specialization: String(req.body.specialization).trim(),
      qualification: String(req.body.qualification || 'MBBS, MD').trim(),
      phone: String(req.body.phone).trim(),
      email: String(req.body.email).trim(),
      consultationFee: Number(req.body.consultationFee),
      availableDays: req.body.availableDays,
      timeSlots: req.body.timeSlots,
      available: req.body.available !== false,
    };
    db.doctors.push(doc);
    store.save();
    res.status(201).json({ doctor: doc });
  });

  app.put('/api/doctors/:id', requireAuth, requireRoles('Admin', 'Receptionist', 'Doctor'), (req: AuthenticatedRequest, res) => {
    const db = store.getData();
    const doc = db.doctors.find((d) => d.id === req.params.id);
    if (!doc) {
      res.status(404).json({ error: 'Doctor not found.' });
      return;
    }
    if (req.currentUser?.role === 'Doctor' && req.currentUser.linkedDoctorId !== doc.id) {
      res.status(403).json({ error: 'Doctors may only update their own availability profile.' });
      return;
    }
    const errors = validateDoctorInput(req.body || {});
    if (Object.keys(errors).length > 0) {
      res.status(400).json({ error: 'Doctor validation failed.', errors });
      return;
    }
    doc.fullName = String(req.body.fullName).trim();
    doc.departmentId = String(req.body.departmentId);
    doc.specialization = String(req.body.specialization).trim();
    doc.qualification = String(req.body.qualification || doc.qualification).trim();
    doc.phone = String(req.body.phone).trim();
    doc.email = String(req.body.email).trim();
    doc.consultationFee = Number(req.body.consultationFee);
    doc.availableDays = req.body.availableDays;
    doc.timeSlots = req.body.timeSlots;
    doc.available = Boolean(req.body.available);
    store.save();
    res.json({ doctor: doc });
  });

  // FR-11..14: Appointments & Availability Check
  app.get('/api/appointments/availability', requireAuth, (req, res) => {
    const doctorId = String(req.query.doctorId || '');
    const date = String(req.query.date || '');
    const excludeId = req.query.excludeId ? String(req.query.excludeId) : undefined;
    const db = store.getData();
    const doctor = db.doctors.find((d) => d.id === doctorId);
    if (!doctor || !date) {
      res.status(400).json({ error: 'Doctor ID and date are required.' });
      return;
    }
    const availableSlots = getAvailableSlotsForDoctor(db.appointments, doctor, date, excludeId);
    res.json({ doctorId, date, availableSlots, doctorAvailable: doctor.available });
  });

  app.get('/api/appointments', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = store.getData();
    let list = db.appointments;
    if (req.currentUser?.role === 'Patient') {
      list = list.filter((a) => a.patientId === req.currentUser?.linkedPatientId);
    }
    res.json({ appointments: list });
  });

  const resolveOrCreatePatient = (
    patientId?: string,
    manualPatientName?: string,
    manualPatientPhone?: string
  ): Patient | null => {
    const db = store.getData();
    if (manualPatientName && manualPatientName.trim().length >= 2) {
      const cleanName = manualPatientName.trim();
      const existing = db.patients.find(
        (p) => p.fullName.toLowerCase() === cleanName.toLowerCase()
      );
      if (existing) return existing;
      const now = new Date().toISOString();
      const created: Patient = {
        id: store.nextId('PAT', db.patients, 1001),
        fullName: cleanName,
        age: 30,
        gender: 'Other',
        phone: (manualPatientPhone || '').trim() || 'Walk-in',
        email: '',
        address: 'Walk-in Registration',
        bloodGroup: 'O+',
        emergencyContact: 'On file',
        allergies: 'None known',
        createdAt: now,
        updatedAt: now,
      };
      db.patients.unshift(created);
      return created;
    }
    if (!patientId) return null;
    return db.patients.find((p) => p.id === patientId) || null;
  };

  const resolveOrCreateDoctor = (
    doctorId?: string,
    manualDoctorName?: string,
    departmentId?: string
  ): Doctor | null => {
    const db = store.getData();
    if (manualDoctorName && manualDoctorName.trim().length >= 2) {
      const cleanName = manualDoctorName.trim();
      const existing = db.doctors.find(
        (d) => d.fullName.toLowerCase() === cleanName.toLowerCase()
      );
      if (existing) return existing;
      const fallbackDept = departmentId || db.departments[0]?.id || 'dept-genm';
      const created: Doctor = {
        id: `doc-${Date.now()}`,
        fullName: cleanName,
        departmentId: fallbackDept,
        specialization: 'Visiting / Consultant',
        qualification: 'MBBS, MD',
        phone: 'Hospital Desk',
        email: `${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@careledger.org`,
        consultationFee: 700,
        availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        timeSlots: ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'],
        available: true,
      };
      db.doctors.push(created);
      return created;
    }
    if (!doctorId) return null;
    return db.doctors.find((d) => d.id === doctorId) || null;
  };

  app.post('/api/appointments', requireAuth, requireRoles('Admin', 'Receptionist', 'Patient'), (req: AuthenticatedRequest, res) => {
    const {
      patientId,
      manualPatientName,
      manualPatientPhone,
      doctorId,
      manualDoctorName,
      departmentId,
      date,
      timeSlot,
      symptoms,
      priority,
      notes,
    } = req.body || {};
    const db = store.getData();

    const patient =
      req.currentUser?.role === 'Patient' && !manualPatientName
        ? resolveOrCreatePatient(req.currentUser.linkedPatientId)
        : resolveOrCreatePatient(patientId, manualPatientName, manualPatientPhone);

    const doctor = resolveOrCreateDoctor(doctorId, manualDoctorName, departmentId);

    if (!patient || !doctor || !date || !timeSlot) {
      res.status(400).json({ error: 'Patient name, doctor name, date, and time slot are required.' });
      return;
    }

    if (!doctor.available) {
      res.status(409).json({
        error: `${doctor.fullName} is currently marked unavailable for new bookings.`,
        availableSlots: [],
      });
      return;
    }

    const conflict = checkAppointmentConflict(db.appointments, doctor.id, date, timeSlot);
    if (conflict) {
      const alternatives = getAvailableSlotsForDoctor(db.appointments, doctor, date);
      res.status(409).json({
        error: `Slot ${timeSlot} on ${date} is already booked for ${doctor.fullName}. Please select an alternative slot.`,
        availableSlots: alternatives,
      });
      return;
    }

    const now = new Date().toISOString();
    const appointment: Appointment = {
      id: store.nextId('APT', db.appointments, 2001),
      patientId: patient.id,
      patientName: patient.fullName,
      doctorId: doctor.id,
      doctorName: doctor.fullName,
      departmentId: doctor.departmentId,
      date: String(date),
      timeSlot: String(timeSlot),
      symptoms: String(symptoms || '').trim() || 'General outpatient consultation',
      priority: ['Low', 'Medium', 'High'].includes(priority) ? priority : 'Low',
      status: 'Scheduled',
      doctorDecision: 'Pending',
      notes: String(notes || '').trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };
    db.appointments.unshift(appointment);
    store.save();
    res.status(201).json({ appointment });
  });

  app.put('/api/appointments/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = store.getData();
    const appt = db.appointments.find((a) => a.id === req.params.id);
    if (!appt) {
      res.status(404).json({ error: 'Appointment not found.' });
      return;
    }
    if (
      req.currentUser?.role === 'Patient' &&
      appt.patientId !== req.currentUser.linkedPatientId
    ) {
      res.status(403).json({ error: 'You may only manage your own appointments.' });
      return;
    }

    const { date, timeSlot, status, doctorDecision, notes, priority } = req.body || {};

    if (req.currentUser?.role === 'Patient' && status && status !== 'Cancelled') {
      res.status(403).json({ error: 'Patients may only cancel their scheduled appointments.' });
      return;
    }

    if ((date && date !== appt.date) || (timeSlot && timeSlot !== appt.timeSlot)) {
      const newDate = date || appt.date;
      const newSlot = timeSlot || appt.timeSlot;
      const doctor = db.doctors.find((d) => d.id === appt.doctorId);
      const conflict = checkAppointmentConflict(db.appointments, appt.doctorId, newDate, newSlot, appt.id);
      if (conflict) {
        const alternatives = doctor ? getAvailableSlotsForDoctor(db.appointments, doctor, newDate, appt.id) : [];
        res.status(409).json({
          error: `Cannot reschedule: ${newSlot} on ${newDate} is already booked.`,
          availableSlots: alternatives,
        });
        return;
      }
      appt.date = newDate;
      appt.timeSlot = newSlot;
    }

    if (status && ['Scheduled', 'Completed', 'Cancelled'].includes(status)) {
      appt.status = status;
    }
    if (
      doctorDecision &&
      ['Pending', 'Accepted', 'Rejected'].includes(doctorDecision) &&
      ['Admin', 'Doctor'].includes(req.currentUser?.role || '')
    ) {
      appt.doctorDecision = doctorDecision;
      if (doctorDecision === 'Rejected') {
        appt.status = 'Cancelled';
      }
    }
    if (priority && ['Low', 'Medium', 'High'].includes(priority)) {
      appt.priority = priority;
    }
    if (typeof notes === 'string') {
      appt.notes = notes.trim() || undefined;
    }
    appt.updatedAt = new Date().toISOString();
    store.save();
    res.json({ appointment: appt });
  });

  // FR-15..17: Admissions & Discharges
  app.get('/api/admissions', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = store.getData();
    let list = db.admissions;
    if (req.currentUser?.role === 'Patient') {
      list = list.filter((a) => a.patientId === req.currentUser?.linkedPatientId);
    }
    res.json({ admissions: list });
  });

  app.post('/api/admissions', requireAuth, requireRoles('Admin', 'Receptionist'), (req, res) => {
    const {
      patientId,
      manualPatientName,
      doctorId,
      manualDoctorName,
      ward,
      bedNumber,
      admissionDate,
      reason,
    } = req.body || {};
    const patient = resolveOrCreatePatient(patientId, manualPatientName);
    const doctor = resolveOrCreateDoctor(doctorId, manualDoctorName);

    if (!patient || !doctor || !ward || !bedNumber || !admissionDate || !reason) {
      res.status(400).json({ error: 'Patient name, doctor name, ward, bed number, admission date, and reason are required.' });
      return;
    }
    const db = store.getData();
    const bedTaken = db.admissions.find(
      (a) =>
        a.status !== 'Discharged' &&
        a.ward.toLowerCase() === String(ward).trim().toLowerCase() &&
        a.bedNumber.toLowerCase() === String(bedNumber).trim().toLowerCase()
    );
    if (bedTaken) {
      res.status(409).json({
        error: `Bed ${bedNumber} in ${ward} is currently occupied by ${bedTaken.patientName || bedTaken.patientId}.`,
      });
      return;
    }
    const admission: Admission = {
      id: store.nextId('ADM', db.admissions, 3001),
      patientId: patient.id,
      patientName: patient.fullName,
      doctorId: doctor.id,
      doctorName: doctor.fullName,
      ward: String(ward).trim(),
      bedNumber: String(bedNumber).trim().toUpperCase(),
      admissionDate: String(admissionDate),
      reason: String(reason).trim(),
      status: 'Admitted',
      updatedAt: new Date().toISOString(),
    };
    db.admissions.unshift(admission);
    store.save();
    res.status(201).json({ admission });
  });

  app.put('/api/admissions/:id', requireAuth, requireRoles('Admin', 'Receptionist', 'Doctor'), (req, res) => {
    const db = store.getData();
    const adm = db.admissions.find((a) => a.id === req.params.id);
    if (!adm) {
      res.status(404).json({ error: 'Admission record not found.' });
      return;
    }
    if (adm.status === 'Discharged') {
      res.status(400).json({ error: 'Discharged admission records are closed and cannot be modified.' });
      return;
    }
    const { ward, bedNumber, status } = req.body || {};
    const targetWard = ward ? String(ward).trim() : adm.ward;
    const targetBed = bedNumber ? String(bedNumber).trim().toUpperCase() : adm.bedNumber;

    const bedTaken = db.admissions.find(
      (a) =>
        a.id !== adm.id &&
        a.status !== 'Discharged' &&
        a.ward.toLowerCase() === targetWard.toLowerCase() &&
        a.bedNumber.toLowerCase() === targetBed.toLowerCase()
    );
    if (bedTaken) {
      res.status(409).json({ error: `Bed ${targetBed} in ${targetWard} is already occupied.` });
      return;
    }

    adm.ward = targetWard;
    adm.bedNumber = targetBed;
    if (status && ['Admitted', 'Under Observation'].includes(status)) {
      adm.status = status;
    }
    adm.updatedAt = new Date().toISOString();
    store.save();
    res.json({ admission: adm });
  });

  app.post('/api/admissions/:id/discharge', requireAuth, requireRoles('Admin', 'Receptionist', 'Doctor'), (req, res) => {
    const db = store.getData();
    const adm = db.admissions.find((a) => a.id === req.params.id);
    if (!adm) {
      res.status(404).json({ error: 'Admission record not found.' });
      return;
    }
    if (adm.status === 'Discharged') {
      res.status(400).json({ error: 'Patient is already discharged.' });
      return;
    }
    const { dischargeDate, dischargeSummary, followUpInstructions } = req.body || {};
    if (!dischargeDate || !dischargeSummary || String(dischargeSummary).trim().length < 4) {
      res.status(400).json({ error: 'Discharge date and discharge summary are required.' });
      return;
    }
    adm.status = 'Discharged';
    adm.dischargeDate = String(dischargeDate);
    adm.dischargeSummary = String(dischargeSummary).trim();
    adm.followUpInstructions = String(followUpInstructions || '').trim() || undefined;
    adm.updatedAt = new Date().toISOString();
    store.save();
    res.json({ admission: adm });
  });

  // FR-18..21: Medicines & Prescriptions
  app.get('/api/medicines', requireAuth, (_req, res) => {
    res.json({ medicines: store.getData().medicines });
  });

  app.post('/api/medicines', requireAuth, requireRoles('Admin', 'Receptionist'), (req, res) => {
    const errors = validateMedicineInput(req.body || {});
    if (Object.keys(errors).length > 0) {
      res.status(400).json({ error: 'Medicine validation failed.', errors });
      return;
    }
    const db = store.getData();
    const med: Medicine = {
      id: store.nextId('MED', db.medicines, 101),
      name: String(req.body.name).trim(),
      category: String(req.body.category).trim(),
      manufacturer: String(req.body.manufacturer || 'Standard Pharma').trim(),
      unitPrice: Number(req.body.unitPrice),
      stockQuantity: Number(req.body.stockQuantity),
      reorderLevel: Number(req.body.reorderLevel),
      unit: String(req.body.unit).trim(),
      expiryDate: String(req.body.expiryDate || '2028-12-31'),
    };
    db.medicines.unshift(med);
    store.save();
    res.status(201).json({ medicine: med });
  });

  app.put('/api/medicines/:id', requireAuth, requireRoles('Admin', 'Receptionist'), (req, res) => {
    const db = store.getData();
    const med = db.medicines.find((m) => m.id === req.params.id);
    if (!med) {
      res.status(404).json({ error: 'Medicine record not found.' });
      return;
    }
    const errors = validateMedicineInput(req.body || {});
    if (Object.keys(errors).length > 0) {
      res.status(400).json({ error: 'Medicine validation failed.', errors });
      return;
    }
    med.name = String(req.body.name).trim();
    med.category = String(req.body.category).trim();
    med.manufacturer = String(req.body.manufacturer || med.manufacturer).trim();
    med.unitPrice = Number(req.body.unitPrice);
    med.stockQuantity = Number(req.body.stockQuantity);
    med.reorderLevel = Number(req.body.reorderLevel);
    med.unit = String(req.body.unit).trim();
    med.expiryDate = String(req.body.expiryDate || med.expiryDate);
    store.save();
    res.json({ medicine: med });
  });

  app.patch('/api/medicines/:id/stock', requireAuth, requireRoles('Admin', 'Receptionist'), (req, res) => {
    const db = store.getData();
    const med = db.medicines.find((m) => m.id === req.params.id);
    if (!med) {
      res.status(404).json({ error: 'Medicine not found.' });
      return;
    }
    const delta = Number(req.body?.delta);
    if (Number.isNaN(delta)) {
      res.status(400).json({ error: 'Numeric stock adjustment delta is required.' });
      return;
    }
    const nextQty = med.stockQuantity + delta;
    if (nextQty < 0) {
      res.status(400).json({ error: 'Stock quantity cannot drop below zero.' });
      return;
    }
    med.stockQuantity = nextQty;
    store.save();
    res.json({ medicine: med });
  });

  app.get('/api/prescriptions', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = store.getData();
    let list = db.prescriptions;
    if (req.currentUser?.role === 'Patient') {
      list = list.filter((rx) => rx.patientId === req.currentUser?.linkedPatientId);
    }
    res.json({ prescriptions: list });
  });

  app.post('/api/prescriptions', requireAuth, requireRoles('Doctor', 'Admin'), (req: AuthenticatedRequest, res) => {
    const db = store.getData();
    const payload = { ...req.body };
    if (!payload.doctorId && !payload.manualDoctorName && req.currentUser?.linkedDoctorId) {
      payload.doctorId = req.currentUser.linkedDoctorId;
    }
    const errors = validatePrescriptionInput(payload);
    if (Object.keys(errors).length > 0) {
      res.status(400).json({ error: 'Prescription validation failed.', errors });
      return;
    }

    const patient = resolveOrCreatePatient(payload.patientId, payload.manualPatientName);
    const doctor = resolveOrCreateDoctor(payload.doctorId, payload.manualDoctorName);
    if (!patient || !doctor) {
      res.status(400).json({ error: 'Valid patient and doctor name are required.' });
      return;
    }

    const enrichedItems = payload.items.map((item: {
      medicineId: string;
      dosage: string;
      frequency: string;
      durationDays: number;
      instructions?: string;
    }) => {
      const med = db.medicines.find((m) => m.id === item.medicineId);
      return {
        medicineId: item.medicineId,
        medicineName: med ? med.name : 'Unknown Medicine',
        dosage: String(item.dosage).trim(),
        frequency: String(item.frequency).trim(),
        durationDays: Number(item.durationDays),
        instructions: item.instructions ? String(item.instructions).trim() : undefined,
      };
    });

    const rx: Prescription = {
      id: store.nextId('RX', db.prescriptions, 4001),
      patientId: patient.id,
      patientName: patient.fullName,
      doctorId: doctor.id,
      doctorName: doctor.fullName,
      appointmentId: payload.appointmentId || undefined,
      diagnosis: String(payload.diagnosis).trim(),
      notes: String(payload.notes || '').trim(),
      items: enrichedItems,
      createdAt: new Date().toISOString(),
    };
    db.prescriptions.unshift(rx);
    store.save();
    res.status(201).json({ prescription: rx });
  });

  // FR-22..24: Billing & Payment
  app.get('/api/bills', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = store.getData();
    let list = db.bills;
    if (req.currentUser?.role === 'Patient') {
      list = list.filter((b) => b.patientId === req.currentUser?.linkedPatientId);
    }
    res.json({ bills: list });
  });

  app.post('/api/bills', requireAuth, requireRoles('Admin', 'Receptionist'), (req, res) => {
    const { patientId, manualPatientName, items, discount, paymentStatus, paymentMethod } = req.body || {};
    const db = store.getData();
    const patient = resolveOrCreatePatient(patientId, manualPatientName);
    if (!patient) {
      res.status(400).json({ error: 'Valid patient selection or manual patient name is required for billing.' });
      return;
    }
    const calc = calculateBillTotals(items, discount);
    if (Object.keys(calc.errors).length > 0) {
      res.status(400).json({ error: calc.errors.items || 'Invalid bill items.', errors: calc.errors });
      return;
    }
    const isPaid = paymentStatus === 'Paid';
    const now = new Date().toISOString();
    const bill: Bill = {
      id: store.nextId('BILL', db.bills, 5001),
      patientId: patient.id,
      patientName: patient.fullName,
      items: calc.items,
      subtotal: calc.subtotal,
      discount: calc.discount,
      totalAmount: calc.totalAmount,
      paymentStatus: isPaid ? 'Paid' : 'Pending',
      paymentMethod: isPaid ? paymentMethod || 'Cash' : undefined,
      paidAt: isPaid ? now : undefined,
      createdAt: now,
    };
    db.bills.unshift(bill);
    store.save();
    res.status(201).json({ bill });
  });

  app.post('/api/bills/:id/pay', requireAuth, requireRoles('Admin', 'Receptionist'), (req, res) => {
    const db = store.getData();
    const bill = db.bills.find((b) => b.id === req.params.id);
    if (!bill) {
      res.status(404).json({ error: 'Bill not found.' });
      return;
    }
    if (bill.paymentStatus === 'Paid') {
      res.status(400).json({ error: 'Bill is already marked as Paid.' });
      return;
    }
    const method = req.body?.paymentMethod;
    bill.paymentStatus = 'Paid';
    bill.paymentMethod = ['Cash', 'Card', 'UPI', 'Insurance'].includes(method) ? method : 'Cash';
    bill.paidAt = new Date().toISOString();
    store.save();
    res.json({ bill });
  });

  // FR-25..26: Dashboard & Reports
  app.get('/api/dashboard', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = store.getData();
    const isPatient = req.currentUser?.role === 'Patient';
    const pid = req.currentUser?.linkedPatientId;

    const appointments = isPatient
      ? db.appointments.filter((a) => a.patientId === pid)
      : db.appointments;
    const admissions = isPatient
      ? db.admissions.filter((a) => a.patientId === pid)
      : db.admissions;
    const bills = isPatient
      ? db.bills.filter((b) => b.patientId === pid)
      : db.bills;

    const summary: DashboardSummary = {
      totalPatients: isPatient ? 1 : db.patients.length,
      totalDoctors: db.doctors.length,
      availableDoctors: db.doctors.filter((d) => d.available).length,
      totalDepartments: db.departments.length,
      totalAppointments: appointments.length,
      scheduledAppointments: appointments.filter((a) => a.status === 'Scheduled').length,
      completedAppointments: appointments.filter((a) => a.status === 'Completed').length,
      cancelledAppointments: appointments.filter((a) => a.status === 'Cancelled').length,
      activeAdmissions: admissions.filter((a) => a.status !== 'Discharged').length,
      dischargedAdmissions: admissions.filter((a) => a.status === 'Discharged').length,
      totalMedicines: db.medicines.length,
      lowStockMedicines: db.medicines.filter((m) => m.stockQuantity <= m.reorderLevel).length,
      totalBills: bills.length,
      pendingBillsCount: bills.filter((b) => b.paymentStatus === 'Pending').length,
      pendingBillsAmount: bills
        .filter((b) => b.paymentStatus === 'Pending')
        .reduce((acc, b) => acc + b.totalAmount, 0),
      paidBillsAmount: bills
        .filter((b) => b.paymentStatus === 'Paid')
        .reduce((acc, b) => acc + b.totalAmount, 0),
    };

    res.json({ summary });
  });

  app.get('/api/reports', requireAuth, requireRoles('Admin', 'Receptionist', 'Doctor'), (_req, res) => {
    const db = store.getData();
    const departmentBreakdown = db.departments.map((dept) => {
      const deptDoctors = db.doctors.filter((d) => d.departmentId === dept.id);
      const deptAppts = db.appointments.filter((a) => a.departmentId === dept.id);
      return {
        departmentId: dept.id,
        code: dept.code,
        name: dept.name,
        doctorCount: deptDoctors.length,
        totalAppointments: deptAppts.length,
        scheduledCount: deptAppts.filter((a) => a.status === 'Scheduled').length,
        completedCount: deptAppts.filter((a) => a.status === 'Completed').length,
      };
    });

    const lowStockMedicines = db.medicines.filter((m) => m.stockQuantity <= m.reorderLevel);
    const pendingBills = db.bills.filter((b) => b.paymentStatus === 'Pending');
    const activeAdmissions = db.admissions.filter((a) => a.status !== 'Discharged');

    res.json({
      departmentBreakdown,
      lowStockMedicines,
      pendingBills,
      activeAdmissions,
    });
  });

  // FR-27..28: Simple Advisory AI Support
  app.post('/api/ai/suggest-department', requireAuth, (req, res) => {
    const symptomIds = Array.isArray(req.body?.symptomIds) ? req.body.symptomIds : [];
    const freeText = typeof req.body?.freeText === 'string' ? req.body.freeText : '';
    const result = suggestDepartmentFromSymptoms(symptomIds, freeText);
    res.json({ result });
  });

  app.post('/api/ai/suggest-priority', requireAuth, (req, res) => {
    const { symptomIds, painScale, durationDays, patientAge, hasFever, isUrgentFlag } = req.body || {};
    const result = suggestAppointmentPriority({
      symptomIds: Array.isArray(symptomIds) ? symptomIds : [],
      painScale: Number(painScale) || 0,
      durationDays: Number(durationDays) || 1,
      patientAge: Number(patientAge) || 30,
      hasFever: Boolean(hasFever),
      isUrgentFlag: Boolean(isUrgentFlag),
    });
    res.json({ result });
  });

  // Vite dev middleware or static production build
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CareLedger HMS running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start CareLedger HMS server:', err);
  process.exit(1);
});
