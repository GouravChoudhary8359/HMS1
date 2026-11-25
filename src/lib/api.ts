const TOKEN_KEY = 'careledger_hms_token';

export function setAuthToken(token: string | null): void {
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Ignore storage restrictions
  }
}

export function getAuthToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string>;
  availableSlots?: string[];

  constructor(
    message: string,
    status: number,
    errors?: Record<string, string>,
    availableSlots?: string[]
  ) {
    super(message);
    this.status = status;
    this.errors = errors;
    this.availableSlots = availableSlots;
  }
}

export async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  let data: Record<string, unknown> = {};
  if (text) {
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      data = {};
    }
  }

  if (!res.ok) {
    throw new ApiError(
      (data.error as string) || `Request failed with status ${res.status}`,
      res.status,
      data.errors as Record<string, string> | undefined,
      data.availableSlots as string[] | undefined
    );
  }

  return data as T;
}
