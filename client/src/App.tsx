import React, { useState, useEffect } from "react";
import { Message, WebSocketMessageEvent } from "./types";
import logo from "./logo.svg";
import "./App.css";

const App: React.FC = () => {
  const [username, setUsername] = useState("");
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("");
  const [responses, setResponses] = useState<string[]>([]);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  const connect = () => {
    const socket = new WebSocket(
      `ws://localhost:3000/ws?username=${encodeURIComponent(username)}`,
    );
    socket.onopen = () => console.log("onopen called");
    socket.onclose = (event: CloseEvent) => {
      if (event.wasClean) {
        console.log(
          `connection closed cleanly... code=${event.code}, reason=${event.reason}`,
        );
      } else {
        console.log("connection died");
      }
    };
    socket.onmessage = (event: WebSocketMessageEvent) => {
      console.log(event.data);
      setResponses((prev) => [...prev, event.data]);
    };
    socket.onerror = (event: Event) => {
      console.error("Websocket Error:", event);
    };

    setSocket(socket);
  };

  const sendMessage = () => {
    if (socket) {
      const messageToSend: Message = {
        recipient,
        content: message,
      };
      socket.send(JSON.stringify(messageToSend));
    }
  };

  const closeConnection = () => {
    socket?.close(1000, "user closed connection");
  };

  useEffect(() => {
    return () => {
      socket?.close();
    };
  }, [socket]);

  return (
    <div>
      <label>
        Username
        <input type="text" value={username} onChange={e => setUsername(e.target.value)} />
      </label>
      <button onClick={connect}>Connect</button>
      <textarea rows={5} cols={10} value={message} onChange={e => setMessage(e.target.value)} />
      <label>
        Recipient
        <input type="text" value={recipient} onChange={e => setRecipient(e.target.value)} />
      </label>
      <button onClick={sendMessage}>Send Message</button>
      <button onClick={closeConnection}>Close Connection</button>
      <div>
        {responses.map((response, index) => (
          <p key={index}>{response}</p>
        ))}
      </div>
    </div>
  );
};

export default App;
