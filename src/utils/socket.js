import { io } from 'socket.io-client';

const normalizeBaseUrl = (url) => url.replace(/\/+$/, '');
const BACKEND_URL = normalizeBaseUrl(import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:8080/api' : '/api'));
const SOCKET_URL = normalizeBaseUrl(import.meta.env.VITE_SOCKET_URL || BACKEND_URL.replace(/\/api$/, ''));

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
