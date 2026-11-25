# CareLedger HMS — Hospital Management System

An academic full-stack Hospital Management System implementing **all 28 Core Functional Requirements (FR-01 to FR-28)**, Nonfunctional Performance/Safety/Security requirements (`PR-01..04`, `SEC-01..07`), and interactive SRS/UML/DFD traceability views.

## Demo Login Accounts

| Role | Username | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | Users & Roles, Doctors, Departments, Patients, Appointments, Admissions, Pharmacy, Billing, Reports, AI Advisory |
| **Doctor** | `doctor` | `doctor123` | View Patients, Accept/Complete Appointments, Write Prescriptions, View Admissions/Medicines, Reports |
| **Receptionist** | `reception` | `reception123` | Register/Update Patients, Book/Reschedule Appointments, Admit/Discharge Patients, Adjust Medicine Stock, Generate Bills & Record Payments |
| **Patient** | `patient` | `patient123` | View/Book/Cancel Own Appointments, View Prescriptions, View Admissions, View Bills, AI Triage Advisory |

## Running Locally

```bash
npm install
npm run dev       # Starts Express API + Vite frontend on http://localhost:3000
npm run build     # Builds production frontend bundle in dist/
npm start         # Runs production server (node server.ts)
```

## Running Unit Tests

```bash
npx --yes tsx --test src/lib/hmsRules.test.ts
```
