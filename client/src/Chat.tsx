import React, { useEffect, useState } from 'react'


interface ChatProps {
  socket: WebSocket | null;
  username: string;
}

const Chat: React.FC<ChatProps> = ( { socket, username }) => {
  const [messageState, setMessageState] = useState("");
  const [to, setTo] = useState("");
  const [history, setHistory] = useState<Message[]>([]);
  const messagesUI = history.map(message => 
    <li key={message.id}>
      <p>{message.content}</p>
    </li>
  );

  const sendMessage = () => {
    if (socket) {
      const messageToSend: Message = {
        id: crypto.randomUUID(),
        to: to,
        from: username,
        content: messageState,
      };
      socket?.send(JSON.stringify(messageToSend));
    }
  };

  useEffect(() => {
    if (socket) {
      socket.onmessage = (event: MessageEvent) => {
        const newMessage = JSON.parse(event.data);
        console.log(newMessage);
        setHistory(prevMessages => [...prevMessages, newMessage]);
      }
    }
  }, [socket]);

  return(
    <section>
      <h1>Conversation</h1>
      <input type='text' placeholder='person to chat with' onChange={e => setTo(e.target.value)}></input>
      <ul>{messagesUI}</ul>
      <section>
        <textarea rows={5} cols={10} onChange={e => setMessageState(e.target.value)} />
        <button onClick={sendMessage}>Send</button>
      </section>
    </section>
  );
}

export default Chat;
