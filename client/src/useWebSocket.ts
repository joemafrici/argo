import { useEffect, useState } from 'react';
import { Message } from './Types';

export function useWebSocket(url: string, onMessage: (newMessage: Message) => void) {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    console.log('in useWebSocket');
    useEffect(() => {
        if (!url) return;
        const token = localStorage.getItem('token');
        const newSocket = new WebSocket(url);
        newSocket.onopen = () => {
            console.log("onopen called"); 
            console.log(token);
            console.log('sending auth message');
            if (newSocket) {
                newSocket.send(JSON.stringify({ type: 'authenticate', token }));
                console.log('auth message sent');
            }
        }
        newSocket.onclose = event => console.log("WebSocket closed", event);
        newSocket.onmessage = event => onMessage(JSON.parse(event.data));
        newSocket.onerror = event => console.error("WebSocket error", event);

        setSocket(newSocket);

        return () => newSocket.close();
    }, [url]);

    return socket;
}
