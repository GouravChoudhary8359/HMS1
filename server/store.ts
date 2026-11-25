import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  Admission,
  Appointment,
  Bill,
  Department,
  Doctor,
  Medicine,
  Patient,
  Prescription,
  StoredUser,
  User,
} from '../src/lib/types.ts';

export interface HmsDatabase {
  users: StoredUser[];
  patients: Patient[];
  departments: Department[];
  doctors: Doctor[];
  appointments: Appointment[];
  admissions: Admission[];
  medicines: Medicine[];
  prescriptions: Prescription[];
  bills: Bill[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'hms-db.json');

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derived = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derived.length) return false;
  return crypto.timingSafeEqual(keyBuf, derived);
}

export function sanitizeUser(u: StoredUser): User {
  const { passwordHash: _removed, ...rest } = u;
  return rest;
}

function createSeedDatabase(): HmsDatabase {
  const now = '2026-11-18T08:00:00.000Z';
  const today = '2026-11-18';
  const tomorrow = '2026-11-19';

  const departments: Department[] = [
    {
      id: 'dept-card',
      code: 'CARD',
      name: 'Cardiology',
      floor: '2nd Floor · Wing A',
      headDoctorName: 'Dr. Kavita Sharma',
      description: 'Cardiac evaluation, ECG diagnostics, hypertension, and arrhythmia care.',
    },
    {
      id: 'dept-genm',
      code: 'GENM',
      name: 'General Medicine',
      floor: '1st Floor · Wing A',
      headDoctorName: 'Dr. Rajesh Nair',
      description: 'Primary adult medicine, acute fever clinics, metabolic and chronic illness management.',
    },
    {
      id: 'dept-orth',
      code: 'ORTH',
      name: 'Orthopedics',
      floor: '3rd Floor · Wing B',
      headDoctorName: 'Dr. Vikram Deshmukh',
      description: 'Fracture fixation, musculoskeletal trauma, spine and joint rehabilitation.',
    },
    {
      id: 'dept-pedi',
      code: 'PEDI',
      name: 'Pediatrics',
      floor: '1st Floor · Wing C',
      headDoctorName: 'Dr. Ananya Rao',
      description: 'Infant, child, and adolescent outpatient & inpatient care.',
    },
    {
      id: 'dept-neur',
      code: 'NEUR',
      name: 'Neurology',
      floor: '4th Floor · Wing A',
      headDoctorName: 'Dr. Siddharth Bose',
      description: 'Headache clinics, stroke triage, neuropathy and seizure management.',
    },
    {
      id: 'dept-derm',
      code: 'DERM',
      name: 'Dermatology',
      floor: '2nd Floor · Wing C',
      headDoctorName: 'Dr. Meera Kulkarni',
      description: 'Skin disorders, allergic dermatitis, and outpatient dermatologic procedures.',
    },
  ];

  const doctors: Doctor[] = [
    {
      id: 'doc-1',
      fullName: 'Dr. Kavita Sharma',
      departmentId: 'dept-card',
      specialization: 'Interventional Cardiology',
      qualification: 'MBBS, MD, DM (Cardiology)',
      phone: '+91 98201 11201',
      email: 'k.sharma@careledger.org',
      consultationFee: 900,
      availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      timeSlots: ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM'],
      available: true,
    },
    {
      id: 'doc-2',
      fullName: 'Dr. Rajesh Nair',
      departmentId: 'dept-genm',
      specialization: 'Internal Medicine',
      qualification: 'MBBS, MD (General Medicine)',
      phone: '+91 98201 11202',
      email: 'r.nair@careledger.org',
      consultationFee: 600,
      availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      timeSlots: ['09:30 AM', '10:30 AM', '11:30 AM', '04:00 PM', '05:00 PM'],
      available: true,
    },
    {
      id: 'doc-3',
      fullName: 'Dr. Vikram Deshmukh',
      departmentId: 'dept-orth',
      specialization: 'Orthopedic Trauma & Joint Care',
      qualification: 'MBBS, MS (Orthopedics)',
      phone: '+91 98201 11203',
      email: 'v.deshmukh@careledger.org',
      consultationFee: 800,
      availableDays: ['Mon', 'Wed', 'Fri', 'Sat'],
      timeSlots: ['10:00 AM', '11:00 AM', '12:00 PM', '03:30 PM'],
      available: true,
    },
    {
      id: 'doc-4',
      fullName: 'Dr. Ananya Rao',
      departmentId: 'dept-pedi',
      specialization: 'Pediatric Care',
      qualification: 'MBBS, MD (Pediatrics)',
      phone: '+91 98201 11204',
      email: 'a.rao@careledger.org',
      consultationFee: 650,
      availableDays: ['Mon', 'Tue', 'Thu', 'Fri', 'Sat'],
      timeSlots: ['09:00 AM', '10:30 AM', '12:00 PM', '03:00 PM'],
      available: true,
    },
    {
      id: 'doc-5',
      fullName: 'Dr. Siddharth Bose',
      departmentId: 'dept-neur',
      specialization: 'Clinical Neurology',
      qualification: 'MBBS, DM (Neurology)',
      phone: '+91 98201 11205',
      email: 's.bose@careledger.org',
      consultationFee: 950,
      availableDays: ['Tue', 'Thu', 'Fri'],
      timeSlots: ['10:00 AM', '11:30 AM', '02:30 PM', '04:00 PM'],
      available: true,
    },
    {
      id: 'doc-6',
      fullName: 'Dr. Meera Kulkarni',
      departmentId: 'dept-derm',
      specialization: 'Clinical Dermatology',
      qualification: 'MBBS, DDVL, MD',
      phone: '+91 98201 11206',
      email: 'm.kulkarni@careledger.org',
      consultationFee: 700,
      availableDays: ['Mon', 'Wed', 'Thu'],
      timeSlots: ['11:00 AM', '12:00 PM', '03:00 PM'],
      available: false,
    },
  ];

  const patients: Patient[] = [
    {
      id: 'PAT-1001',
      fullName: 'Aarav Mehta',
      age: 42,
      gender: 'Male',
      phone: '+91 98111 22001',
      email: 'aarav.mehta@example.com',
      address: '14 Civil Lines, Jaipur',
      bloodGroup: 'O+',
      emergencyContact: 'Priya Mehta (+91 98111 22002)',
      allergies: 'Penicillin',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'PAT-1002',
      fullName: 'Sneha Verma',
      age: 29,
      gender: 'Female',
      phone: '+91 98111 22003',
      email: 'sneha.verma@example.com',
      address: '88 Malviya Nagar, Jaipur',
      bloodGroup: 'A+',
      emergencyContact: 'Rohan Verma (+91 98111 22004)',
      allergies: 'None known',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'PAT-1003',
      fullName: 'Harishankar Joshi',
      age: 67,
      gender: 'Male',
      phone: '+91 98111 22005',
      email: 'h.joshi@example.com',
      address: '21 Vaishali Nagar, Jaipur',
      bloodGroup: 'B+',
      emergencyContact: 'Sunita Joshi (+91 98111 22006)',
      allergies: 'Sulfa drugs',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'PAT-1004',
      fullName: 'Diya Kapoor',
      age: 7,
      gender: 'Female',
      phone: '+91 98111 22007',
      email: 'kapoor.family@example.com',
      address: '5 C-Scheme, Jaipur',
      bloodGroup: 'AB+',
      emergencyContact: 'Nikhil Kapoor (+91 98111 22008)',
      allergies: 'None known',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'PAT-1005',
      fullName: 'Raghavendra Singh',
      age: 54,
      gender: 'Male',
      phone: '+91 98111 22009',
      email: 'r.singh@example.com',
      address: '102 Tonk Road, Jaipur',
      bloodGroup: 'O-',
      emergencyContact: 'Kavya Singh (+91 98111 22010)',
      allergies: 'Aspirin',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'PAT-1006',
      fullName: 'Nandini Iyer',
      age: 35,
      gender: 'Female',
      phone: '+91 98111 22011',
      email: 'nandini.iyer@example.com',
      address: '47 Bani Park, Jaipur',
      bloodGroup: 'A-',
      emergencyContact: 'Karthik Iyer (+91 98111 22012)',
      allergies: 'None known',
      createdAt: now,
      updatedAt: now,
    },
  ];

  const users: StoredUser[] = [
    {
      id: 'usr-admin',
      username: 'admin',
      email: 'admin@careledger.org',
      fullName: 'Gourav Choudhary',
      role: 'Admin',
      active: true,
      passwordHash: hashPassword('admin123'),
      createdAt: now,
    },
    {
      id: 'usr-doctor',
      username: 'doctor',
      email: 'k.sharma@careledger.org',
      fullName: 'Dr. Kavita Sharma',
      role: 'Doctor',
      active: true,
      linkedDoctorId: 'doc-1',
      passwordHash: hashPassword('doctor123'),
      createdAt: now,
    },
    {
      id: 'usr-reception',
      username: 'reception',
      email: 'desk@careledger.org',
      fullName: 'Ritu Bansal',
      role: 'Receptionist',
      active: true,
      passwordHash: hashPassword('reception123'),
      createdAt: now,
    },
    {
      id: 'usr-patient',
      username: 'patient',
      email: 'aarav.mehta@example.com',
      fullName: 'Aarav Mehta',
      role: 'Patient',
      active: true,
      linkedPatientId: 'PAT-1001',
      passwordHash: hashPassword('patient123'),
      createdAt: now,
    },
  ];

  const appointments: Appointment[] = [
    {
      id: 'APT-2001',
      patientId: 'PAT-1001',
      doctorId: 'doc-1',
      departmentId: 'dept-card',
      date: today,
      timeSlot: '09:00 AM',
      symptoms: 'Intermittent chest tightness and mild palpitations',
      priority: 'High',
      status: 'Scheduled',
      doctorDecision: 'Accepted',
      notes: 'Baseline ECG ordered prior to consult.',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'APT-2002',
      patientId: 'PAT-1003',
      doctorId: 'doc-1',
      departmentId: 'dept-card',
      date: today,
      timeSlot: '10:00 AM',
      symptoms: 'Hypertension follow-up and blood pressure review',
      priority: 'Medium',
      status: 'Completed',
      doctorDecision: 'Accepted',
      notes: 'BP stabilized at 132/84 mmHg.',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'APT-2003',
      patientId: 'PAT-1002',
      doctorId: 'doc-2',
      departmentId: 'dept-genm',
      date: today,
      timeSlot: '09:30 AM',
      symptoms: 'Persistent fever (101.4°F) and dry cough for 3 days',
      priority: 'Medium',
      status: 'Scheduled',
      doctorDecision: 'Pending',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'APT-2004',
      patientId: 'PAT-1005',
      doctorId: 'doc-3',
      departmentId: 'dept-orth',
      date: tomorrow,
      timeSlot: '10:00 AM',
      symptoms: 'Right knee swelling after stair slip',
      priority: 'Medium',
      status: 'Scheduled',
      doctorDecision: 'Accepted',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'APT-2005',
      patientId: 'PAT-1004',
      doctorId: 'doc-4',
      departmentId: 'dept-pedi',
      date: today,
      timeSlot: '10:30 AM',
      symptoms: 'Child earache and mild fever',
      priority: 'Medium',
      status: 'Completed',
      doctorDecision: 'Accepted',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'APT-2006',
      patientId: 'PAT-1006',
      doctorId: 'doc-5',
      departmentId: 'dept-neur',
      date: tomorrow,
      timeSlot: '11:30 AM',
      symptoms: 'Recurring migraine episodes with visual aura',
      priority: 'Low',
      status: 'Cancelled',
      doctorDecision: 'Pending',
      notes: 'Patient requested reschedule later this week.',
      createdAt: now,
      updatedAt: now,
    },
  ];

  const admissions: Admission[] = [
    {
      id: 'ADM-3001',
      patientId: 'PAT-1003',
      doctorId: 'doc-1',
      ward: 'Cardiac Care Unit',
      bedNumber: 'CCU-02',
      admissionDate: '2026-11-16',
      reason: 'Hypertensive urgency monitoring and cardiac enzyme panel',
      status: 'Admitted',
      updatedAt: now,
    },
    {
      id: 'ADM-3002',
      patientId: 'PAT-1005',
      doctorId: 'doc-3',
      ward: 'Orthopedic Ward',
      bedNumber: 'ORT-04',
      admissionDate: '2026-11-17',
      reason: 'Pre-operative knee arthroscopy stabilization',
      status: 'Under Observation',
      updatedAt: now,
    },
    {
      id: 'ADM-3003',
      patientId: 'PAT-1002',
      doctorId: 'doc-2',
      ward: 'General Ward A',
      bedNumber: 'GEN-01',
      admissionDate: '2026-11-12',
      reason: 'Acute dehydration and febrile illness',
      status: 'Discharged',
      dischargeDate: '2026-11-15',
      dischargeSummary: 'Afebrile for 48 hours; oral hydration tolerated well.',
      followUpInstructions: 'Follow up with Dr. Nair in 5 days; complete oral course.',
      updatedAt: now,
    },
  ];

  const medicines: Medicine[] = [
    {
      id: 'MED-101',
      name: 'Paracetamol 500mg',
      category: 'Analgesic / Antipyretic',
      manufacturer: 'Cipla Health',
      unitPrice: 4.5,
      stockQuantity: 420,
      reorderLevel: 100,
      unit: 'Tablet',
      expiryDate: '2028-04-30',
    },
    {
      id: 'MED-102',
      name: 'Amoxicillin 500mg',
      category: 'Antibiotic',
      manufacturer: 'Sun Pharma',
      unitPrice: 12.0,
      stockQuantity: 185,
      reorderLevel: 60,
      unit: 'Capsule',
      expiryDate: '2027-11-15',
    },
    {
      id: 'MED-103',
      name: 'Atorvastatin 20mg',
      category: 'Cardiovascular',
      manufacturer: 'Dr. Reddy Labs',
      unitPrice: 18.0,
      stockQuantity: 140,
      reorderLevel: 50,
      unit: 'Tablet',
      expiryDate: '2028-01-20',
    },
    {
      id: 'MED-104',
      name: 'Amlodipine 5mg',
      category: 'Antihypertensive',
      manufacturer: 'Lupin',
      unitPrice: 9.5,
      stockQuantity: 28,
      reorderLevel: 40,
      unit: 'Tablet',
      expiryDate: '2027-09-30',
    },
    {
      id: 'MED-105',
      name: 'Azithromycin 250mg',
      category: 'Antibiotic',
      manufacturer: 'Pfizer India',
      unitPrice: 24.0,
      stockQuantity: 19,
      reorderLevel: 35,
      unit: 'Tablet',
      expiryDate: '2027-07-10',
    },
    {
      id: 'MED-106',
      name: 'Pantoprazole 40mg',
      category: 'Gastrointestinal',
      manufacturer: 'Alkem',
      unitPrice: 11.0,
      stockQuantity: 260,
      reorderLevel: 75,
      unit: 'Tablet',
      expiryDate: '2028-06-01',
    },
    {
      id: 'MED-107',
      name: 'Cetirizine 10mg',
      category: 'Antihistamine',
      manufacturer: 'GSK',
      unitPrice: 5.0,
      stockQuantity: 310,
      reorderLevel: 80,
      unit: 'Tablet',
      expiryDate: '2028-08-18',
    },
    {
      id: 'MED-108',
      name: 'Salbutamol Inhaler 100mcg',
      category: 'Respiratory',
      manufacturer: 'Cipla Health',
      unitPrice: 165.0,
      stockQuantity: 42,
      reorderLevel: 15,
      unit: 'Inhaler',
      expiryDate: '2027-12-31',
    },
  ];

  const prescriptions: Prescription[] = [
    {
      id: 'RX-4001',
      patientId: 'PAT-1003',
      doctorId: 'doc-1',
      appointmentId: 'APT-2002',
      diagnosis: 'Essential Hypertension (Stage 1) & Dyslipidemia',
      notes: 'Low-sodium diet advised. Recheck fasting lipid profile in 4 weeks.',
      items: [
        {
          medicineId: 'MED-104',
          medicineName: 'Amlodipine 5mg',
          dosage: '1 tablet',
          frequency: 'Once daily (morning)',
          durationDays: 30,
          instructions: 'Take with water after breakfast',
        },
        {
          medicineId: 'MED-103',
          medicineName: 'Atorvastatin 20mg',
          dosage: '1 tablet',
          frequency: 'Once daily (night)',
          durationDays: 30,
          instructions: 'Take at bedtime',
        },
      ],
      createdAt: now,
    },
    {
      id: 'RX-4002',
      patientId: 'PAT-1004',
      doctorId: 'doc-4',
      appointmentId: 'APT-2005',
      diagnosis: 'Acute Otitis Media (Pediatric)',
      notes: 'Keep ear canal dry; monitor temperature every 6 hours.',
      items: [
        {
          medicineId: 'MED-101',
          medicineName: 'Paracetamol 500mg',
          dosage: '1/2 tablet (250mg)',
          frequency: 'Every 8 hours as needed for fever',
          durationDays: 5,
        },
      ],
      createdAt: now,
    },
  ];

  const bills: Bill[] = [
    {
      id: 'BILL-5001',
      patientId: 'PAT-1003',
      items: [
        {
          description: 'Cardiology Outpatient Consultation (Dr. Kavita Sharma)',
          category: 'Consultation',
          quantity: 1,
          unitPrice: 900,
          lineTotal: 900,
        },
        {
          description: '12-Lead ECG & Cardiac Profile',
          category: 'Procedure',
          quantity: 1,
          unitPrice: 1250,
          lineTotal: 1250,
        },
        {
          description: 'Cardiac Care Unit Bed (2 Days)',
          category: 'Ward',
          quantity: 2,
          unitPrice: 2200,
          lineTotal: 4400,
        },
      ],
      subtotal: 6550,
      discount: 250,
      totalAmount: 6300,
      paymentStatus: 'Pending',
      createdAt: now,
    },
    {
      id: 'BILL-5002',
      patientId: 'PAT-1002',
      items: [
        {
          description: 'General Ward A Stay (3 Days)',
          category: 'Ward',
          quantity: 3,
          unitPrice: 1200,
          lineTotal: 3600,
        },
        {
          description: 'IV Hydration & Antipyretic Medication',
          category: 'Medicine',
          quantity: 1,
          unitPrice: 850,
          lineTotal: 850,
        },
      ],
      subtotal: 4450,
      discount: 0,
      totalAmount: 4450,
      paymentStatus: 'Paid',
      paymentMethod: 'UPI',
      paidAt: '2026-11-15T14:20:00.000Z',
      createdAt: '2026-11-15T14:00:00.000Z',
    },
    {
      id: 'BILL-5003',
      patientId: 'PAT-1004',
      items: [
        {
          description: 'Pediatrics Consultation (Dr. Ananya Rao)',
          category: 'Consultation',
          quantity: 1,
          unitPrice: 650,
          lineTotal: 650,
        },
        {
          description: 'Pharmacy Dispense (Paracetamol)',
          category: 'Medicine',
          quantity: 10,
          unitPrice: 4.5,
          lineTotal: 45,
        },
      ],
      subtotal: 695,
      discount: 0,
      totalAmount: 695,
      paymentStatus: 'Paid',
      paymentMethod: 'Card',
      paidAt: now,
      createdAt: now,
    },
  ];

  return {
    users,
    patients,
    departments,
    doctors,
    appointments,
    admissions,
    medicines,
    prescriptions,
    bills,
  };
}

export class HmsStore {
  private db: HmsDatabase;

  constructor() {
    this.db = this.loadOrSeed();
  }

  private loadOrSeed(): HmsDatabase {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_PATH)) {
      try {
        const raw = fs.readFileSync(DB_PATH, 'utf8');
        const parsed = JSON.parse(raw) as HmsDatabase;
        if (parsed && Array.isArray(parsed.users) && Array.isArray(parsed.patients)) {
          return parsed;
        }
      } catch {
        // Fallback to re-seed if file was corrupted
      }
    }
    const seed = createSeedDatabase();
    this.persist(seed);
    return seed;
  }

  private persist(data: HmsDatabase = this.db): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmpPath = `${DB_PATH}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmpPath, DB_PATH);
  }

  getData(): HmsDatabase {
    return this.db;
  }

  save(): void {
    this.persist(this.db);
  }

  nextId(prefix: string, items: Array<{ id: string }>, startNum = 1001): string {
    let max = startNum - 1;
    for (const item of items) {
      const m = item.id.match(new RegExp(`^${prefix}-(\\d+)$`));
      if (m) {
        const n = Number(m[1]);
        if (n > max) max = n;
      }
    }
    return `${prefix}-${max + 1}`;
  }
}
