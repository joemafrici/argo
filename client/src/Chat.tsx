import React, { useEffect, useState } from 'react'
import { Message, Conversation } from './Types'


interface ChatProps {
  socket: WebSocket | null;
  username: string;
  conversation: Conversation | undefined;
}

const Chat: React.FC<ChatProps> = ( { socket, username, conversation }) => {
  console.log('in Chat');
  console.log(conversation);
  const [messageState, setMessageState] = useState("");
  const [to, setTo] = useState("");
  const [history, setHistory] = useState<Message[]>([]);

  const sendMessage = () => {
    if (socket) {
      const time = new Date();
      const messageToSend: Message = {
        ID: crypto.randomUUID(),
        To: to,
        From: username,
        Content: messageState,
        Timestamp: time,
      };
      socket?.send(JSON.stringify(messageToSend));
    }
  };

  useEffect(() => {
    if (socket) {
      socket.onmessage = (event: MessageEvent) => {
        const newMessage = JSON.parse(event.data);
        //console.log(newMessage);
        setHistory(prevMessages => [...prevMessages, newMessage]);
      }
    }
  }, [socket]);

  if (!conversation) {
    return <div>Select a conversation to start chatting</div>;
  }

  const conversationUI = conversation.Messages.map((message) =>
    <li key={message.ID}>
      <p>{message.From}: {message.Content}</p>
    </li>
  );
  return(
    <section>
      <h1>Conversation</h1>
      <input type='text' placeholder='person to chat with' onChange={e => setTo(e.target.value)}></input>
      <ul>{conversationUI}</ul>
      <section>
        <textarea rows={5} cols={10} onChange={e => setMessageState(e.target.value)} />
        <button onClick={sendMessage}>Send</button>
      </section>
    </section>
  );
}

export default Chat;
