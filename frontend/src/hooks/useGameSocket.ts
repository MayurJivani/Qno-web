// hooks/useGameSocket.ts
import { useEffect, useRef, useCallback } from 'react';

type MessageHandler = (data: unknown) => void;
type Logger = (direction: 'sent' | 'received', type: string, data: unknown) => void;

interface WebSocketMessage {
    type: string;
    [key: string]: unknown;
}

export const useGameSocket = (
    onMessage: MessageHandler,
    logger?: Logger
) => {
    const socketRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const maxReconnectAttempts = 5;
    const reconnectDelay = 3000;
    const onMessageRef = useRef(onMessage);
    const loggerRef = useRef(logger);

    // Keep refs up to date
    useEffect(() => {
        onMessageRef.current = onMessage;
        loggerRef.current = logger;
    }, [onMessage, logger]);

    const sendMessage = useCallback((message: WebSocketMessage) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            try {
                socketRef.current.send(JSON.stringify(message));
                loggerRef.current?.('sent', message.type, message);
            } catch (error) {
                console.error('[WS] Failed to send message:', error);
                loggerRef.current?.('sent', 'SEND_ERROR', { 
                    messageType: message.type, 
                    error: String(error) 
                });
            }
        } else {
            loggerRef.current?.('sent', 'SEND_FAILED_NOT_OPEN', { 
                messageType: message.type, 
                readyState: socketRef.current?.readyState 
            });
        }
    }, []);

    const connect = useCallback((onOpenMessage: WebSocketMessage) => {
        if (socketRef.current?.readyState === WebSocket.CONNECTING || 
            socketRef.current?.readyState === WebSocket.OPEN) {
            return;
        }

        if (socketRef.current) {
            socketRef.current.close();
        }

        // Get WebSocket URL from environment or use default
        let wsUrl = import.meta.env.VITE_WS_URL;
        
        // Fallback to default if not set (for development)
        if (!wsUrl) {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.hostname;
            const port = import.meta.env.VITE_WS_PORT || '3000';
            wsUrl = `${protocol}//${host}:${port}`;
        }

        // Remove trailing slash if present
        wsUrl = wsUrl.replace(/\/$/, '');

        if (!wsUrl) {
            console.error('[WS] WebSocket URL not configured');
            onMessageRef.current({ 
                type: 'ERROR', 
                message: 'WebSocket URL not configured. Please check your environment variables.' 
            });
            return;
        }

        try {
            loggerRef.current?.('sent', 'CONNECTION_ATTEMPT', { url: wsUrl, timestamp: Date.now() });
            const socket = new WebSocket(wsUrl);
            socketRef.current = socket;

            socket.onopen = () => {
                reconnectAttemptsRef.current = 0;
                if (reconnectTimeoutRef.current) {
                    clearTimeout(reconnectTimeoutRef.current);
                    reconnectTimeoutRef.current = null;
                }
                loggerRef.current?.('received', 'CONNECTION_OPENED', { url: wsUrl, timestamp: Date.now() });
                sendMessage(onOpenMessage);
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data as string);
                    loggerRef.current?.('received', (data as WebSocketMessage).type || 'UNKNOWN', data);
                    onMessageRef.current(data);
                } catch (error) {
                    console.error('[WS] Failed to parse message:', error);
                    loggerRef.current?.('received', 'PARSE_ERROR', { 
                        rawData: event.data,
                        error: String(error)
                    });
                }
            };

            socket.onclose = (event) => {
                loggerRef.current?.('received', 'CONNECTION_CLOSED', { 
                    code: event.code, 
                    reason: event.reason || 'No reason provided',
                    wasClean: event.wasClean,
                    timestamp: Date.now()
                });
                
                // Don't reconnect if it was a normal close
                if (event.code === 1000) {
                    return;
                }

                // Attempt to reconnect only if not manually disconnected
                if (reconnectAttemptsRef.current < maxReconnectAttempts) {
                    reconnectAttemptsRef.current += 1;
                    const attemptMsg = `Reconnecting... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`;
                    loggerRef.current?.('received', 'RECONNECT_ATTEMPT', { 
                        attempt: reconnectAttemptsRef.current, 
                        maxAttempts: maxReconnectAttempts 
                    });
                    onMessageRef.current({ type: 'ERROR', message: attemptMsg });
                    reconnectTimeoutRef.current = setTimeout(() => {
                        connect(onOpenMessage);
                    }, reconnectDelay);
                } else {
                    console.error('[WS] Max reconnection attempts reached');
                    loggerRef.current?.('received', 'MAX_RECONNECT_ATTEMPTS_REACHED', { 
                        maxAttempts: maxReconnectAttempts 
                    });
                    onMessageRef.current({ 
                        type: 'ERROR', 
                        message: `Connection lost after ${maxReconnectAttempts} attempts. Please check if the server is running and refresh the page.` 
                    });
                }
            };

            socket.onerror = (error) => {
                console.error('[WS] Error:', error);
                loggerRef.current?.('received', 'CONNECTION_ERROR', { 
                    error: String(error),
                    url: wsUrl,
                    timestamp: Date.now()
                });
                const errorMessage = `Failed to connect to server at ${wsUrl}. Please make sure the backend server is running on port 3000.`;
                onMessageRef.current({ type: 'ERROR', message: errorMessage });
            };
        } catch (error) {
            console.error('[WS] Failed to create WebSocket:', error);
            onMessageRef.current({ type: 'ERROR', message: 'Failed to connect to server' });
        }
    }, [sendMessage]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        reconnectAttemptsRef.current = maxReconnectAttempts; // Prevent reconnection
        if (socketRef.current) {
            loggerRef.current?.('sent', 'DISCONNECT', { reason: 'Client disconnecting', timestamp: Date.now() });
            socketRef.current.close(1000, 'Client disconnecting');
            socketRef.current = null;
        }
    }, []);

    useEffect(() => {
        return () => {
            disconnect();
        };
    }, [disconnect]);

    return { connect, disconnect, sendMessage };
};
