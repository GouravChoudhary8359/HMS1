import type {
  Appointment,
  BillItem,
  DepartmentAdvisoryResult,
  Doctor,
  PriorityAdvisoryResult,
  PriorityLevel,
  PriorityRuleMatch,
  ValidationErrorMap,
} from './types.ts';

export const SYMPTOM_CATALOG: ReadonlyArray<{
  id: string;
  label: string;
  category: string;
  severityWeight: number;
}> = [
  { id: 'chest_pain', label: 'Chest pain or tightness', category: 'Cardiac', severityWeight: 5 },
  { id: 'shortness_of_breath', label: 'Shortness of breath', category: 'Respiratory / Cardiac', severityWeight: 5 },
  { id: 'palpitations', label: 'Irregular heartbeat / palpitations', category: 'Cardiac', severityWeight: 4 },
  { id: 'high_fever', label: 'High fever (> 101°F / 38.3°C)', category: 'General / Infectious', severityWeight: 3 },
  { id: 'persistent_cough', label: 'Persistent cough or wheezing', category: 'Respiratory', severityWeight: 2 },
  { id: 'fracture_trauma', label: 'Suspected fracture or severe joint injury', category: 'Musculoskeletal', severityWeight: 4 },
  { id: 'joint_back_pain', label: 'Joint swelling or chronic back pain', category: 'Musculoskeletal', severityWeight: 2 },
  { id: 'severe_headache', label: 'Sudden severe headache or dizziness', category: 'Neurological', severityWeight: 4 },
  { id: 'numbness_weakness', label: 'Numbness or limb weakness', category: 'Neurological', severityWeight: 5 },
  { id: 'skin_rash', label: 'Skin rash, hives, or itching', category: 'Dermatological', severityWeight: 1 },
  { id: 'blurred_vision', label: 'Blurred vision or eye redness', category: 'Ophthalmic', severityWeight: 3 },
  { id: 'abdominal_pain', label: 'Abdominal pain or nausea', category: 'Gastrointestinal', severityWeight: 3 },
  { id: 'pediatric_fever', label: 'Child fever / earache / poor feeding', category: 'Pediatric', severityWeight: 3 },
  { id: 'mild_fatigue', label: 'Mild fatigue or seasonal cold', category: 'General', severityWeight: 1 },
];

interface DepartmentRule {
  departmentName: string;
  departmentCode: string;
  symptomWeights: Record<string, number>;
  keywords: string[];
}

const DEPARTMENT_RULES: DepartmentRule[] = [
  {
    departmentName: 'Cardiology',
    departmentCode: 'CARD',
    symptomWeights: { chest_pain: 6, palpitations: 5, shortness_of_breath: 3 },
    keywords: ['chest', 'heart', 'palpitation', 'angina', 'blood pressure', 'bp'],
  },
  {
    departmentName: 'Pulmonology',
    departmentCode: 'PULM',
    symptomWeights: { shortness_of_breath: 5, persistent_cough: 5, high_fever: 2 },
    keywords: ['cough', 'wheeze', 'breath', 'asthma', 'lung', 'sputum'],
  },
  {
    departmentName: 'Orthopedics',
    departmentCode: 'ORTH',
    symptomWeights: { fracture_trauma: 6, joint_back_pain: 5 },
    keywords: ['fracture', 'bone', 'knee', 'joint', 'sprain', 'back pain', 'shoulder'],
  },
  {
    departmentName: 'Neurology',
    departmentCode: 'NEUR',
    symptomWeights: { severe_headache: 5, numbness_weakness: 6 },
    keywords: ['migraine', 'headache', 'seizure', 'numbness', 'dizzy', 'vertigo', 'tremor'],
  },
  {
    departmentName: 'Dermatology',
    departmentCode: 'DERM',
    symptomWeights: { skin_rash: 6 },
    keywords: ['rash', 'itch', 'eczema', 'acne', 'hives', 'skin', 'allergy'],
  },
  {
    departmentName: 'Ophthalmology',
    departmentCode: 'OPHT',
    symptomWeights: { blurred_vision: 6 },
    keywords: ['eye', 'vision', 'blur', 'cataract', 'red eye'],
  },
  {
    departmentName: 'Pediatrics',
    departmentCode: 'PEDI',
    symptomWeights: { pediatric_fever: 6, high_fever: 2, persistent_cough: 2 },
    keywords: ['child', 'infant', 'baby', 'kid', 'pediatric', 'toddler'],
  },
  {
    departmentName: 'General Medicine',
    departmentCode: 'GENM',
    symptomWeights: { high_fever: 4, abdominal_pain: 4, mild_fatigue: 4, persistent_cough: 2 },
    keywords: ['fever', 'cold', 'flu', 'stomach', 'fatigue', 'weakness', 'nausea', 'vomit'],
  },
];

export const AI_ADVISORY_DISCLAIMER =
  'Academic Advisory Only: This suggestion uses predefined rule/score logic for educational workflow support. It is not a medical diagnosis and does not replace evaluation by a licensed clinician.';

export function validatePatientInput(input: {
  fullName?: string;
  age?: number | string;
  gender?: string;
  phone?: string;
  email?: string;
  address?: string;
  bloodGroup?: string;
  emergencyContact?: string;
}): ValidationErrorMap {
  const errors: ValidationErrorMap = {};

  if (!input.fullName || input.fullName.trim().length < 2) {
    errors.fullName = 'Full name is required (at least 2 characters).';
  }

  const ageNum = Number(input.age);
  if (input.age === undefined || input.age === '' || Number.isNaN(ageNum) || ageNum < 0 || ageNum > 120) {
    errors.age = 'Age must be a valid number between 0 and 120.';
  }

  if (!input.gender || !['Male', 'Female', 'Other'].includes(input.gender)) {
    errors.gender = 'Please select a valid gender.';
  }

  const cleanPhone = (input.phone || '').replace(/[\s\-()+]/g, '');
  if (!cleanPhone || cleanPhone.length < 7 || cleanPhone.length > 15 || !/^\d+$/.test(cleanPhone)) {
    errors.phone = 'Valid contact phone number (7–15 digits) is required.';
  }

  if (input.email && input.email.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    errors.email = 'Please enter a valid email address.';
  }

  if (!input.address || input.address.trim().length < 4) {
    errors.address = 'Residential address is required.';
  }

  if (!input.bloodGroup || input.bloodGroup.trim() === '') {
    errors.bloodGroup = 'Blood group is required.';
  }

  if (!input.emergencyContact || input.emergencyContact.trim().length < 5) {
    errors.emergencyContact = 'Emergency contact name/number is required.';
  }

  return errors;
}

export function validateDoctorInput(input: {
  fullName?: string;
  departmentId?: string;
  specialization?: string;
  phone?: string;
  email?: string;
  consultationFee?: number | string;
  availableDays?: string[];
  timeSlots?: string[];
}): ValidationErrorMap {
  const errors: ValidationErrorMap = {};

  if (!input.fullName || input.fullName.trim().length < 3) {
    errors.fullName = 'Doctor name is required.';
  }
  if (!input.departmentId || input.departmentId.trim() === '') {
    errors.departmentId = 'Department selection is required.';
  }
  if (!input.specialization || input.specialization.trim().length < 2) {
    errors.specialization = 'Specialization is required.';
  }
  if (!input.phone || input.phone.trim().length < 7) {
    errors.phone = 'Contact phone is required.';
  }
  if (!input.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    errors.email = 'Valid email address is required.';
  }
  const fee = Number(input.consultationFee);
  if (Number.isNaN(fee) || fee < 0) {
    errors.consultationFee = 'Consultation fee must be 0 or greater.';
  }
  if (!input.availableDays || input.availableDays.length === 0) {
    errors.availableDays = 'Select at least one available day.';
  }
  if (!input.timeSlots || input.timeSlots.length === 0) {
    errors.timeSlots = 'Provide at least one consultation time slot.';
  }

  return errors;
}

export function validateDepartmentInput(input: {
  code?: string;
  name?: string;
  floor?: string;
  headDoctorName?: string;
}): ValidationErrorMap {
  const errors: ValidationErrorMap = {};
  if (!input.code || input.code.trim().length < 2) {
    errors.code = 'Department code (e.g. CARD) is required.';
  }
  if (!input.name || input.name.trim().length < 2) {
    errors.name = 'Department name is required.';
  }
  if (!input.floor || input.floor.trim() === '') {
    errors.floor = 'Floor/wing location is required.';
  }
  if (!input.headDoctorName || input.headDoctorName.trim().length < 2) {
    errors.headDoctorName = 'Head of department name is required.';
  }
  return errors;
}

export function checkAppointmentConflict(
  appointments: Appointment[],
  doctorId: string,
  date: string,
  timeSlot: string,
  excludeAppointmentId?: string
): Appointment | undefined {
  return appointments.find(
    (appt) =>
      appt.id !== excludeAppointmentId &&
      appt.doctorId === doctorId &&
      appt.date === date &&
      appt.timeSlot === timeSlot &&
      appt.status !== 'Cancelled'
  );
}

export function getAvailableSlotsForDoctor(
  appointments: Appointment[],
  doctor: Doctor,
  date: string,
  excludeAppointmentId?: string
): string[] {
  if (!doctor.available) {
    return [];
  }
  return doctor.timeSlots.filter(
    (slot) => !checkAppointmentConflict(appointments, doctor.id, date, slot, excludeAppointmentId)
  );
}

export function validateMedicineInput(input: {
  name?: string;
  category?: string;
  unitPrice?: number | string;
  stockQuantity?: number | string;
  reorderLevel?: number | string;
  unit?: string;
}): ValidationErrorMap {
  const errors: ValidationErrorMap = {};
  if (!input.name || input.name.trim().length < 2) {
    errors.name = 'Medicine name is required.';
  }
  if (!input.category || input.category.trim().length < 2) {
    errors.category = 'Category is required.';
  }
  const price = Number(input.unitPrice);
  if (input.unitPrice === '' || input.unitPrice === undefined || Number.isNaN(price) || price < 0) {
    errors.unitPrice = 'Unit price must be a non-negative number.';
  }
  const stock = Number(input.stockQuantity);
  if (input.stockQuantity === '' || input.stockQuantity === undefined || Number.isNaN(stock) || stock < 0) {
    errors.stockQuantity = 'Stock quantity must be 0 or greater.';
  }
  const reorder = Number(input.reorderLevel);
  if (input.reorderLevel === '' || input.reorderLevel === undefined || Number.isNaN(reorder) || reorder < 0) {
    errors.reorderLevel = 'Reorder level must be 0 or greater.';
  }
  if (!input.unit || input.unit.trim() === '') {
    errors.unit = 'Dosage unit (e.g. Tablet, Vial, Bottle) is required.';
  }
  return errors;
}

export function validatePrescriptionInput(input: {
  patientId?: string;
  manualPatientName?: string;
  doctorId?: string;
  manualDoctorName?: string;
  diagnosis?: string;
  items?: Array<{
    medicineId?: string;
    dosage?: string;
    frequency?: string;
    durationDays?: number | string;
  }>;
}): ValidationErrorMap {
  const errors: ValidationErrorMap = {};
  if (!input.patientId && (!input.manualPatientName || input.manualPatientName.trim().length < 2)) {
    errors.patientId = 'Patient selection or manual patient name is required.';
  }
  if (!input.doctorId && (!input.manualDoctorName || input.manualDoctorName.trim().length < 2)) {
    errors.doctorId = 'Prescribing doctor selection or manual doctor name is required.';
  }
  if (!input.diagnosis || input.diagnosis.trim().length < 3) {
    errors.diagnosis = 'Clinical diagnosis / indication is required.';
  }
  if (!input.items || input.items.length === 0) {
    errors.items = 'Add at least one medicine to the prescription.';
  } else {
    const invalidRow = input.items.find(
      (item) =>
        !item.medicineId ||
        !item.dosage ||
        item.dosage.trim() === '' ||
        !item.frequency ||
        item.frequency.trim() === '' ||
        Number(item.durationDays) <= 0 ||
        Number.isNaN(Number(item.durationDays))
    );
    if (invalidRow) {
      errors.items = 'Each medicine row requires medicine, dosage, frequency, and duration (> 0 days).';
    }
  }
  return errors;
}

export function calculateBillTotals(
  rawItems: Array<{
    description: string;
    category: BillItem['category'];
    quantity: number;
    unitPrice: number;
  }>,
  discountInput = 0
): { items: BillItem[]; subtotal: number; discount: number; totalAmount: number; errors: ValidationErrorMap } {
  const errors: ValidationErrorMap = {};
  if (!rawItems || rawItems.length === 0) {
    errors.items = 'At least one bill line item is required.';
  }

  const items: BillItem[] = [];
  let subtotal = 0;

  for (const raw of rawItems || []) {
    const qty = Number(raw.quantity);
    const price = Number(raw.unitPrice);
    if (!raw.description || raw.description.trim() === '') {
      errors.items = 'All bill items require a description.';
      continue;
    }
    if (Number.isNaN(qty) || qty <= 0 || Number.isNaN(price) || price < 0) {
      errors.items = 'Each bill item requires quantity > 0 and non-negative unit price.';
      continue;
    }
    const lineTotal = Math.round(qty * price * 100) / 100;
    subtotal += lineTotal;
    items.push({
      description: raw.description.trim(),
      category: raw.category || 'Other',
      quantity: qty,
      unitPrice: Math.round(price * 100) / 100,
      lineTotal,
    });
  }

  subtotal = Math.round(subtotal * 100) / 100;
  const discount = Math.max(0, Math.min(subtotal, Number(discountInput) || 0));
  const roundedDiscount = Math.round(discount * 100) / 100;
  const totalAmount = Math.max(0, Math.round((subtotal - roundedDiscount) * 100) / 100);

  return {
    items,
    subtotal,
    discount: roundedDiscount,
    totalAmount,
    errors,
  };
}

export function suggestDepartmentFromSymptoms(
  selectedSymptomIds: string[],
  freeText = ''
): DepartmentAdvisoryResult {
  const normalizedText = freeText.toLowerCase().trim();
  const symptomLabelMap = new Map(SYMPTOM_CATALOG.map((s) => [s.id, s.label]));

  const ranked = DEPARTMENT_RULES.map((rule) => {
    let score = 0;
    const matchedSymptoms: string[] = [];

    for (const symId of selectedSymptomIds) {
      const weight = rule.symptomWeights[symId];
      if (weight) {
        score += weight;
        matchedSymptoms.push(symptomLabelMap.get(symId) || symId);
      }
    }

    if (normalizedText) {
      for (const kw of rule.keywords) {
        if (normalizedText.includes(kw)) {
          score += 3;
          if (!matchedSymptoms.includes(`Keyword: "${kw}"`)) {
            matchedSymptoms.push(`Keyword: "${kw}"`);
          }
        }
      }
    }

    return {
      departmentName: rule.departmentName,
      departmentCode: rule.departmentCode,
      score,
      matchedSymptoms,
    };
  }).sort((a, b) => b.score - a.score);

  const top = ranked[0];
  if (!top || top.score === 0) {
    return {
      recommendedDepartment: 'General Medicine',
      departmentCode: 'GENM',
      confidenceLabel: 'Default Fallback (No specific specialty match)',
      matchedRules: ['No specific specialty rules matched; defaulting to General Medicine triage.'],
      rankedDepartments: ranked,
      disclaimer: AI_ADVISORY_DISCLAIMER,
    };
  }

  const secondScore = ranked[1]?.score ?? 0;
  const margin = top.score - secondScore;
  const confidenceLabel =
    top.score >= 8 && margin >= 3
      ? 'Strong Rule Match'
      : top.score >= 4
        ? 'Moderate Rule Match'
        : 'Initial Triage Match';

  return {
    recommendedDepartment: top.departmentName,
    departmentCode: top.departmentCode,
    confidenceLabel,
    matchedRules: top.matchedSymptoms,
    rankedDepartments: ranked,
    disclaimer: AI_ADVISORY_DISCLAIMER,
  };
}

export function suggestAppointmentPriority(input: {
  symptomIds: string[];
  painScale: number; // 1-10
  durationDays: number;
  patientAge: number;
  hasFever?: boolean;
  isUrgentFlag?: boolean;
}): PriorityAdvisoryResult {
  const matchedRules: PriorityRuleMatch[] = [];
  let totalScore = 0;

  const highRiskSymptoms = ['chest_pain', 'shortness_of_breath', 'numbness_weakness'];
  const highHits = input.symptomIds.filter((id) => highRiskSymptoms.includes(id));
  if (highHits.length > 0) {
    const pts = highHits.length * 5;
    totalScore += pts;
    matchedRules.push({
      rule: `Red-flag symptom(s) selected (${highHits.join(', ')})`,
      points: pts,
    });
  }

  const moderateSymptoms = ['palpitations', 'fracture_trauma', 'severe_headache', 'blurred_vision', 'pediatric_fever'];
  const modHits = input.symptomIds.filter((id) => moderateSymptoms.includes(id));
  if (modHits.length > 0) {
    const pts = modHits.length * 3;
    totalScore += pts;
    matchedRules.push({
      rule: `Moderate clinical symptom(s) (${modHits.join(', ')})`,
      points: pts,
    });
  }

  const pain = Math.max(0, Math.min(10, Number(input.painScale) || 0));
  if (pain >= 8) {
    totalScore += 4;
    matchedRules.push({ rule: `Severe pain/distress score (${pain}/10)`, points: 4 });
  } else if (pain >= 5) {
    totalScore += 2;
    matchedRules.push({ rule: `Moderate pain/distress score (${pain}/10)`, points: 2 });
  } else if (pain > 0) {
    totalScore += 1;
    matchedRules.push({ rule: `Mild pain/distress score (${pain}/10)`, points: 1 });
  }

  if (input.hasFever) {
    totalScore += 2;
    matchedRules.push({ rule: 'Elevated temperature / fever reported', points: 2 });
  }

  if (input.isUrgentFlag) {
    totalScore += 4;
    matchedRules.push({ rule: 'Acute sudden onset / clinician escalation flag', points: 4 });
  }

  const age = Number(input.patientAge);
  if (!Number.isNaN(age) && (age <= 5 || age >= 65)) {
    totalScore += 2;
    matchedRules.push({ rule: `Age risk group (${age} yrs)`, points: 2 });
  }

  const days = Number(input.durationDays) || 0;
  if (days >= 7) {
    totalScore += 1;
    matchedRules.push({ rule: `Persistent duration (${days} days)`, points: 1 });
  }

  let suggestedPriority: PriorityLevel = 'Low';
  let recommendedAction = 'Routine outpatient consultation within standard scheduling window.';

  if (totalScore >= 8) {
    suggestedPriority = 'High';
    recommendedAction = 'Prioritize earliest same-day appointment slot or immediate triage review.';
  } else if (totalScore >= 4) {
    suggestedPriority = 'Medium';
    recommendedAction = 'Schedule priority outpatient appointment within 24–48 hours.';
  }

  return {
    suggestedPriority,
    totalScore,
    matchedRules,
    recommendedAction,
    disclaimer: AI_ADVISORY_DISCLAIMER,
  };
}
