import React, { useEffect, useState } from 'react'

type conversation = {
  id: string;
  to: string;
  from: string;
  content: string;
}

interface ChatProps {
  socket: WebSocket | null;
  username: string;
}

const Chat: React.FC<ChatProps> = ( { socket, username }) => {
  const [message, setMessage] = useState("");
  const [to, setTo] = useState("");
  const [history, setHistory] = useState<conversation[]>([]);
  const chatHistory: conversation[] = [
    {id: '1', to: 'socrates', from: 'deepwater', content: 'hello socrates'},
    {id: '2', to: 'deepwater', from: 'socrates', content: 'hello deepwater'},
    {id: '3', to: 'socrates', from: 'deepwater', content: 'shall we go down to the Piraeus'},
    {id: '4', to: 'deepwater', from: 'socrates', content: 'yes... lead the way'},
  ];
  const messagesUI = history.map(message => 
    <li key={message.id}>
      <p>{message.content}</p>
    </li>
  );

  const sendMessage = () => {
    if (socket) {
      const messageToSend: conversation = {
        id: crypto.randomUUID(),
        to: to,
        from: username,
        content: message,
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
        <textarea rows={5} cols={10} onChange={e => setMessage(e.target.value)} />
        <button onClick={sendMessage}>Send</button>
      </section>
    </section>
  );
}

export default Chat;
