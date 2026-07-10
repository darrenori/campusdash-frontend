export const PASSWORD_POLICY_ERROR = 'Password must be at least 8 characters and include uppercase, lowercase, and number.';

export const passwordRequirements = [
    { id: 'minLength', label: 'At least 8 characters', test: (value) => String(value || '').length >= 8 },
    { id: 'uppercase', label: 'Contains uppercase letter', test: (value) => /[A-Z]/.test(String(value || '')) },
    { id: 'lowercase', label: 'Contains lowercase letter', test: (value) => /[a-z]/.test(String(value || '')) },
    { id: 'number', label: 'Contains number', test: (value) => /[0-9]/.test(String(value || '')) },
];

export const isStrongPassword = (value) => passwordRequirements.every((requirement) => requirement.test(value));