import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080/api';
const SOCKET_URL = BACKEND_URL.replace(/\/api\/?$/, '');

let socket;

export function getSocket() {
    if (!socket) {
        socket = io(SOCKET_URL, {
            withCredentials: true,
        });
    }
    return socket;
}
