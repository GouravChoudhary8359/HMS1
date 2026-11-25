import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBillTotals,
  checkAppointmentConflict,
  getAvailableSlotsForDoctor,
  suggestAppointmentPriority,
  suggestDepartmentFromSymptoms,
  validatePatientInput,
  validatePrescriptionInput,
} from './hmsRules.ts';
import type { Appointment, Doctor } from './types.ts';

test('FR-07: validatePatientInput catches missing required fields and accepts valid data', () => {
  const invalid = validatePatientInput({
    fullName: 'A',
    age: -5,
    gender: '',
    phone: '123',
    address: '',
    bloodGroup: '',
    emergencyContact: '',
  });
  assert.ok(invalid.fullName);
  assert.ok(invalid.age);
  assert.ok(invalid.gender);
  assert.ok(invalid.phone);
  assert.ok(invalid.address);
  assert.ok(invalid.bloodGroup);
  assert.ok(invalid.emergencyContact);

  const valid = validatePatientInput({
    fullName: 'Aarav Mehta',
    age: 34,
    gender: 'Male',
    phone: '+91 9876543210',
    email: 'aarav@example.com',
    address: '42 MG Road, Jaipur',
    bloodGroup: 'O+',
    emergencyContact: 'Priya Mehta (9876500001)',
  });
  assert.deepEqual(valid, {});
});

test('FR-12: checkAppointmentConflict prevents double-booking non-cancelled appointments and lists alternatives', () => {
  const doctor: Doctor = {
    id: 'doc-1',
    fullName: 'Dr. Kavita Sharma',
    departmentId: 'dept-card',
    specialization: 'Cardiology',
    qualification: 'MD, DM',
    phone: '9800011122',
    email: 'kavita@careledger.org',
    consultationFee: 800,
    availableDays: ['Mon', 'Tue', 'Wed'],
    timeSlots: ['09:00 AM', '10:00 AM', '11:00 AM'],
    available: true,
  };

  const appointments: Appointment[] = [
    {
      id: 'apt-1',
      patientId: 'pat-1',
      doctorId: 'doc-1',
      departmentId: 'dept-card',
      date: '2026-11-20',
      timeSlot: '09:00 AM',
      symptoms: 'Chest tightness',
      priority: 'High',
      status: 'Scheduled',
      doctorDecision: 'Accepted',
      createdAt: '2026-11-17T00:00:00Z',
      updatedAt: '2026-11-17T00:00:00Z',
    },
    {
      id: 'apt-2',
      patientId: 'pat-2',
      doctorId: 'doc-1',
      departmentId: 'dept-card',
      date: '2026-11-20',
      timeSlot: '10:00 AM',
      symptoms: 'Routine checkup',
      priority: 'Low',
      status: 'Cancelled',
      doctorDecision: 'Rejected',
      createdAt: '2026-11-17T00:00:00Z',
      updatedAt: '2026-11-17T00:00:00Z',
    },
  ];

  assert.ok(checkAppointmentConflict(appointments, 'doc-1', '2026-11-20', '09:00 AM'));
  assert.equal(checkAppointmentConflict(appointments, 'doc-1', '2026-11-20', '10:00 AM'), undefined);
  assert.equal(checkAppointmentConflict(appointments, 'doc-1', '2026-11-20', '09:00 AM', 'apt-1'), undefined);

  const openSlots = getAvailableSlotsForDoctor(appointments, doctor, '2026-11-20');
  assert.deepEqual(openSlots, ['10:00 AM', '11:00 AM']);
});

test('FR-21: validatePrescriptionInput requires patient, doctor, diagnosis, and valid medicine items', () => {
  const emptyErr = validatePrescriptionInput({ patientId: 'pat-1', doctorId: 'doc-1', diagnosis: 'Fever', items: [] });
  assert.ok(emptyErr.items);

  const valid = validatePrescriptionInput({
    patientId: 'pat-1',
    doctorId: 'doc-1',
    diagnosis: 'Acute viral upper respiratory infection',
    items: [{ medicineId: 'med-1', dosage: '500mg', frequency: 'Twice daily', durationDays: 5 }],
  });
  assert.deepEqual(valid, {});

  const validManual = validatePrescriptionInput({
    manualPatientName: 'Rohan Kulkarni',
    manualDoctorName: 'Dr. Neha Kapoor',
    diagnosis: 'Seasonal allergic rhinitis',
    items: [{ medicineId: 'med-1', dosage: '10mg', frequency: 'Once daily', durationDays: 7 }],
  });
  assert.deepEqual(validManual, {});

  const invalidManual = validatePrescriptionInput({
    manualPatientName: 'A',
    manualDoctorName: '',
    diagnosis: 'Seasonal allergic rhinitis',
    items: [{ medicineId: 'med-1', dosage: '10mg', frequency: 'Once daily', durationDays: 7 }],
  });
  assert.ok(invalidManual.patientId);
  assert.ok(invalidManual.doctorId);
});

test('FR-23: calculateBillTotals computes line totals, subtotal, bounded discount, and net total', () => {
  const result = calculateBillTotals(
    [
      { description: 'Cardiology Consultation', category: 'Consultation', quantity: 1, unitPrice: 800 },
      { description: 'ECG Diagnostic', category: 'Procedure', quantity: 2, unitPrice: 350.5 },
    ],
    100
  );
  assert.deepEqual(result.errors, {});
  assert.equal(result.subtotal, 1501);
  assert.equal(result.discount, 100);
  assert.equal(result.totalAmount, 1401);
});

test('FR-27: suggestDepartmentFromSymptoms maps symptoms & keywords to appropriate department with disclaimer', () => {
  const cardio = suggestDepartmentFromSymptoms(['chest_pain', 'palpitations']);
  assert.equal(cardio.recommendedDepartment, 'Cardiology');
  assert.ok(cardio.disclaimer.toLowerCase().includes('not a medical diagnosis'));

  const ortho = suggestDepartmentFromSymptoms(['fracture_trauma'], 'twisted ankle and bone pain');
  assert.equal(ortho.recommendedDepartment, 'Orthopedics');

  const fallback = suggestDepartmentFromSymptoms([], '');
  assert.equal(fallback.recommendedDepartment, 'General Medicine');
});

test('FR-28: suggestAppointmentPriority assigns High, Medium, and Low priorities deterministically', () => {
  const high = suggestAppointmentPriority({
    symptomIds: ['chest_pain', 'shortness_of_breath'],
    painScale: 9,
    durationDays: 1,
    patientAge: 68,
    isUrgentFlag: true,
  });
  assert.equal(high.suggestedPriority, 'High');
  assert.ok(high.totalScore >= 8);

  const medium = suggestAppointmentPriority({
    symptomIds: ['joint_back_pain'],
    painScale: 5,
    durationDays: 4,
    patientAge: 32,
    hasFever: true,
  });
  assert.equal(medium.suggestedPriority, 'Medium');

  const low = suggestAppointmentPriority({
    symptomIds: ['mild_fatigue'],
    painScale: 2,
    durationDays: 2,
    patientAge: 28,
  });
  assert.equal(low.suggestedPriority, 'Low');
});
