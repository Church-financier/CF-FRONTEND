import { create } from 'zustand';
import { initializeSocket, disconnectSocket, getSocket } from '@/lib/socket';

type SocketEventListener = (...args: unknown[]) => void;

interface SocketState {
  isConnected: boolean;
  socketError: string | null;
  subscribe: (event: string, listener: SocketEventListener) => void;
  unsubscribe: (event: string, listener: SocketEventListener) => void;
  clearSocketError: () => void;
}

export const useSocketStore = create<SocketState>(() => ({
  isConnected: false,
  socketError: null,

  subscribe: (event, listener) => {
    const socket = getSocket();
    if (socket) {
      socket.on(event, listener);
    }
  },

  unsubscribe: (event, listener) => {
    const socket = getSocket();
    if (socket) {
      socket.off(event, listener);
    }
  },

  clearSocketError: () => {
    useSocketStore.setState({ socketError: null });
  },
}));

let currentToken: string | null = null;
const currentListeners: Map<string, SocketEventListener> = new Map();

export function connectSocket(token: string) {
  if (currentToken === token && getSocket()?.connected) {
    return;
  }

  if (getSocket()) {
    disconnectSocket();
    currentListeners.clear();
  }

  currentToken = token;
  const socket = initializeSocket(token);

  socket.on('connect', () => {
    useSocketStore.setState({ isConnected: true, socketError: null });
  });

  socket.on('disconnect', () => {
    useSocketStore.setState({ isConnected: false });
  });

  socket.on('connect_error', (error) => {
    useSocketStore.setState({ socketError: (error as Error)?.message || 'Socket connection failed' });
  });

  socket.on('connect_timeout', () => {
    useSocketStore.setState({ socketError: 'Socket connection timed out' });
  });

  currentListeners.forEach((listener, event) => {
    socket.on(event, listener);
  });
}

export function disconnectSocketStore() {
  disconnectSocket();
  currentToken = null;
  currentListeners.clear();
  useSocketStore.setState({ isConnected: false, socketError: null });
}

export function onSocketEvent(event: string, listener: SocketEventListener) {
  currentListeners.set(event, listener);
  const socket = getSocket();
  if (socket) {
    socket.on(event, listener);
  }
}

export function offSocketEvent(event: string, listener: SocketEventListener) {
  currentListeners.delete(event);
  const socket = getSocket();
  if (socket) {
    socket.off(event, listener);
  }
}
