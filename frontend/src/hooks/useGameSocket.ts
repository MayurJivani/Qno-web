// hooks/useGameSocket.ts
import { useEffect, useRef } from 'react';

type MessageHandler = (data: any) => void;

export const useGameSocket = (
    onMessage: MessageHandler
) => {
    const socketRef = useRef<WebSocket | null>(null);

    const sendMessage = (message: any) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify(message));
        }
    };

    const connect = (onOpenMessage: any) => {
        if (socketRef.current) {
            socketRef.current.close();
        }

        const socket = new WebSocket(import.meta.env.VITE_WS_URL);
        socketRef.current = socket;

        socket.onopen = () => {
            console.log('[WS] Connected');
            sendMessage(onOpenMessage);
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            onMessage(data);
        };

        socket.onclose = () => {
            console.log('[WS] Disconnected');
        };

        socket.onerror = (e) => {
            console.error('[WS] Error:', e);
        };
    };

    const disconnect = () => {
        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }
    };

    useEffect(() => {
        return () => {
            disconnect();
        };
    }, []);

    return { connect, disconnect, sendMessage };
};
