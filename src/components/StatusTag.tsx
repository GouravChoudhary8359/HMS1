interface StatusTagProps {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'accent';
}

const TONE_MAP: Record<NonNullable<StatusTagProps['tone']>, string> = {
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  danger: 'bg-red-50 text-red-800 border-red-200',
  accent: 'bg-teal-50 text-teal-800 border-teal-200',
};

export function StatusTag({ label, tone = 'neutral' }: StatusTagProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border whitespace-nowrap shrink-0 ${TONE_MAP[tone]}`}
    >
      {label}
    </span>
  );
}

export function statusToneFor(value: string): StatusTagProps['tone'] {
  switch (value) {
    case 'Completed':
    case 'Paid':
    case 'Accepted':
    case 'Available':
    case 'Active':
    case 'Low':
      return 'success';
    case 'Scheduled':
    case 'Admitted':
      return 'accent';
    case 'Pending':
    case 'Under Observation':
    case 'Medium':
    case 'Low Stock':
      return 'warning';
    case 'Cancelled':
    case 'Rejected':
    case 'High':
    case 'Unavailable':
    case 'Inactive':
      return 'danger';
    default:
      return 'neutral';
  }
}
