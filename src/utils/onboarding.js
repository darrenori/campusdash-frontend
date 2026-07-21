const COMPLETION_KEY = 'onboarding';
const STORAGE_UNAVAILABLE = Symbol('storage-unavailable');

function read(key) {
    try {
        return localStorage.getItem(key);
    } catch {
        return STORAGE_UNAVAILABLE;
    }
}

function write(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch {
        return false;
    }
}

export function shouldStartOnboarding() {
    return read(COMPLETION_KEY) === null;
}

export function completeOnboarding() {
    write(COMPLETION_KEY, '1');
}
