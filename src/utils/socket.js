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
    const envSocketUrl = import.meta.env.VITE_SOCKET_URL;

    if (import.meta.env.DEV) {
        if (envSocketUrl) return normalizeBaseUrl(envSocketUrl);
        const derived = BACKEND_URL.replace(/\/api$/, '');
        //a relative backend ('/api') strips down to an empty host; dial the dev
        //origin instead so vite's /socket.io ws proxy carries the handshake and
        //the auth cookie through to the backend
        return derived && !isRelativeUrl(derived) ? normalizeBaseUrl(derived) : window.location.origin;
    }

    if (envSocketUrl && !isRelativeUrl(envSocketUrl)) {
        return normalizeBaseUrl(envSocketUrl);
    }

    const envBackendUrl = import.meta.env.VITE_BACKEND_URL;
    if (envBackendUrl && !isRelativeUrl(envBackendUrl)) {
        return normalizeBaseUrl(envBackendUrl.replace(/\/api$/, ''));
    }

    return window.location.origin;
};

const SOCKET_URL = resolveSocketUrl();

let socket;

async function fetchSocketToken() {
    const response = await fetch(`${BACKEND_URL}/auth/socket-token`, {
        credentials: 'include',
        headers: {
            Accept: 'application/json',
        },
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.token) {
        throw new Error(result.error || 'Unable to authenticate realtime connection.');
    }

    return result.token;
}

export function getSocket() {
    if (!socket) {
        const options = {
            withCredentials: true,
        };

        if (!import.meta.env.DEV) {
            options.auth = (callback) => {
                fetchSocketToken()
                    .then((token) => callback({ token }))
                    .catch(() => callback({}));
            };
        }

        socket = io(SOCKET_URL, options);
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
