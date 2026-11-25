export type Role = 'Admin' | 'Doctor' | 'Receptionist' | 'Patient';

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: Role;
  active: boolean;
  linkedDoctorId?: string;
  linkedPatientId?: string;
  createdAt: string;
}

export interface StoredUser extends User {
  passwordHash: string;
}

export interface Patient {
  id: string;
  fullName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  phone: string;
  email: string;
  address: string;
  bloodGroup: string;
  emergencyContact: string;
  allergies?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  floor: string;
  headDoctorName: string;
  description: string;
}

export interface Doctor {
  id: string;
  fullName: string;
  departmentId: string;
  specialization: string;
  qualification: string;
  phone: string;
  email: string;
  consultationFee: number;
  availableDays: string[];
  timeSlots: string[];
  available: boolean;
}

export type AppointmentStatus = 'Scheduled' | 'Completed' | 'Cancelled';
export type DoctorDecision = 'Pending' | 'Accepted' | 'Rejected';
export type PriorityLevel = 'Low' | 'Medium' | 'High';

export interface Appointment {
  id: string;
  patientId: string;
  patientName?: string;
  doctorId: string;
  doctorName?: string;
  departmentId: string;
  date: string;
  timeSlot: string;
  symptoms: string;
  priority: PriorityLevel;
  status: AppointmentStatus;
  doctorDecision: DoctorDecision;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type AdmissionStatus = 'Admitted' | 'Under Observation' | 'Discharged';

export interface Admission {
  id: string;
  patientId: string;
  patientName?: string;
  doctorId: string;
  doctorName?: string;
  ward: string;
  bedNumber: string;
  admissionDate: string;
  reason: string;
  status: AdmissionStatus;
  dischargeDate?: string;
  dischargeSummary?: string;
  followUpInstructions?: string;
  updatedAt: string;
}

export interface Medicine {
  id: string;
  name: string;
  category: string;
  manufacturer: string;
  unitPrice: number;
  stockQuantity: number;
  reorderLevel: number;
  unit: string;
  expiryDate: string;
}

export interface PrescriptionItem {
  medicineId: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  instructions?: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  patientName?: string;
  doctorId: string;
  doctorName?: string;
  appointmentId?: string;
  diagnosis: string;
  notes: string;
  items: PrescriptionItem[];
  createdAt: string;
}

export type PaymentStatus = 'Pending' | 'Paid';

export interface BillItem {
  description: string;
  category: 'Consultation' | 'Ward' | 'Medicine' | 'Procedure' | 'Other';
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Bill {
  id: string;
  patientId: string;
  patientName?: string;
  items: BillItem[];
  subtotal: number;
  discount: number;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: 'Cash' | 'Card' | 'UPI' | 'Insurance';
  paidAt?: string;
  createdAt: string;
}

export interface ValidationErrorMap {
  [field: string]: string;
}

export interface DepartmentSuggestionScore {
  departmentName: string;
  departmentCode: string;
  score: number;
  matchedSymptoms: string[];
}

export interface DepartmentAdvisoryResult {
  recommendedDepartment: string;
  departmentCode: string;
  confidenceLabel: string;
  matchedRules: string[];
  rankedDepartments: DepartmentSuggestionScore[];
  disclaimer: string;
}

export interface PriorityRuleMatch {
  rule: string;
  points: number;
}

export interface PriorityAdvisoryResult {
  suggestedPriority: PriorityLevel;
  totalScore: number;
  matchedRules: PriorityRuleMatch[];
  recommendedAction: string;
  disclaimer: string;
}

export interface DashboardSummary {
  totalPatients: number;
  totalDoctors: number;
  availableDoctors: number;
  totalDepartments: number;
  totalAppointments: number;
  scheduledAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  activeAdmissions: number;
  dischargedAdmissions: number;
  totalMedicines: number;
  lowStockMedicines: number;
  totalBills: number;
  pendingBillsCount: number;
  pendingBillsAmount: number;
  paidBillsAmount: number;
}
