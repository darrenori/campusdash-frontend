import { io } from 'socket.io-client';

const normalizeBaseUrl = (url = '') => url.replace(/\/+$/, '');
const isRelativeUrl = (url) => !/^https?:\/\//i.test(url);

const resolveBackendUrl = () => {
    const envUrl = import.meta.env.VITE_BACKEND_URL;

    if (import.meta.env.DEV) {
        return normalizeBaseUrl(envUrl || 'http://localhost:8080/api');
    }

    return normalizeBaseUrl(envUrl && isRelativeUrl(envUrl) ? envUrl : '/api');
};

const BACKEND_URL = resolveBackendUrl();

const resolveSocketUrl = () => {
    const envUrl = import.meta.env.VITE_SOCKET_URL;

    if (import.meta.env.DEV) {
        return normalizeBaseUrl(envUrl || BACKEND_URL.replace(/\/api$/, ''));
    }

    return normalizeBaseUrl(envUrl && isRelativeUrl(envUrl) ? envUrl : BACKEND_URL.replace(/\/api$/, ''));
};

const SOCKET_URL = resolveSocketUrl();

let socket;

export function getSocket() {
    if (!socket) {
        socket = io(SOCKET_URL, {
            withCredentials: true,
        });
    }
    return socket;
}

// Tear down the socket on logout / session expiry so no authenticated
// connection lingers. The next getSocket() call creates a fresh one.
export function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = undefined;
    }
}
