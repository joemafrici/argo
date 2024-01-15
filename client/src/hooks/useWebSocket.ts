import { useEffect, useCallback, useRef } from 'react';
import { Message } from './../types';

//export function useWebSocket(url: string, onMessage: (newMessage: Message) => void) {
export function useWebSocket(shouldConnect: boolean, token: string | null, onMessage: (newMessage: Message) => void) {
    //const [socket, setSocket] = useState<WebSocket | null>(null);
    const sockRef = useRef<WebSocket | null>(null);

    const sendMessage = useCallback((message: any) => {
        console.log('sendMessage callBack called');
        if (sockRef.current?.readyState === WebSocket.OPEN) {
            sockRef.current.send(JSON.stringify(message));
        }
    }, []);

    useEffect(() => {
        if (!shouldConnect || !token) {
            sockRef.current?.close();
            return;
        }

        const newSocket = new WebSocket('ws://localhost:3001/ws');
        sockRef.current = newSocket;
        newSocket.onopen = () => {
            sendMessage({ type: 'authenticate', token });
        }
        newSocket.onmessage = event => onMessage(JSON.parse(event.data));
        newSocket.onclose = event => console.log("WebSocket closed", event);
        newSocket.onerror = event => console.error("WebSocket error", event);

        return () => newSocket.close();
    }, [shouldConnect, token, onMessage]);

    return { sendMessage };
}
