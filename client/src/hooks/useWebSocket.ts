import { useEffect, useState, useCallback, useRef } from 'react';
import { Message } from './../types';
import handleLogout from './useAuth';

export function useWebSocket(shouldConnect: boolean, token: string | null, onMessage: (newMessage: Message) => void) {
  const sockRef = useRef<WebSocket | null>(null);
  const [ retryCount, setRetryCount ] = useState(0);
  const timeoutIDRef = useRef<number | null>(null);

  const sendMessage = useCallback((message: any) => {
    if (sockRef.current?.readyState === WebSocket.OPEN) {
      sockRef.current.send(JSON.stringify(message));
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    if (timeoutIDRef.current !== null) {
      clearTimeout(timeoutIDRef.current);
      timeoutIDRef.current = null;
    }

    const newSocket = new WebSocket('ws://localhost:3001/ws');
    sockRef.current = newSocket;

    newSocket.onopen = () => {
      setRetryCount(0);
      if (token) {
        sendMessage({ type: 'authenticate', token });
      } else {
        console.error('Token is null during WebSocket connection');
        newSocket.close();
        handleLogout();
      }
    };
    newSocket.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type && data.type === 'ping') {
        sendMessage({ type: 'pong' });
      } else {
        onMessage(data);
      }
    };
    newSocket.onclose = event => {
      console.log("WebSocket closed", event);
      if (shouldConnect) {
        console.log("Attempting to reconnect...");
        setRetryCount(prevRetryCount => prevRetryCount + 1);
      }
    }
    newSocket.onerror = event => {
      console.error("WebSocket error", event);
      newSocket.close();
    }
  }, [token, onMessage, sendMessage, shouldConnect]);

  useEffect(() => {
    if (retryCount > 0) {
      const retryDelay = Math.min(10000, (Math.pow(2, retryCount) - 1) * 1000);
      console.log(`Reconnecting in ${retryDelay}ms...`);
      timeoutIDRef.current = setTimeout(connectWebSocket, retryDelay);
    }
  }, [retryCount, connectWebSocket]);

  useEffect(() => {
    if (shouldConnect && token) {
      connectWebSocket();
    }

    return () => {
      if (sockRef.current) {
      sockRef.current.close();
      }
      if (timeoutIDRef.current !== null) {
        clearTimeout(timeoutIDRef.current);
      }
    };
  }, [shouldConnect, token, connectWebSocket, onMessage]);

  return { sendMessage };
}
