import React, { useEffect, useState } from 'react'
import { Message, Conversation } from './Types'


interface ChatProps {
  socket: WebSocket | null;
  username: string;
  conversation: Conversation | undefined;
}

const Chat: React.FC<ChatProps> = ( { socket, username, conversation: initialConversation }) => {
  console.log('in Chat');
  const [messageState, setMessageState] = useState("");
  const [conversationState, setConversationState] = useState<Conversation | undefined>(initialConversation);

  const sendMessage = () => {
    if (socket && conversationState) {
      const time = new Date();
      let to: string;
      for (const user of conversationState.Participants) {
        if (user !== username) {
          to = user;
        }
      }
      const messageToSend: Message = {
        ID: crypto.randomUUID(),
        To: to,
        From: username,
        Content: messageState,
        Timestamp: time,
        ConvID: conversationState?.ID,
      };
      setConversationState({
        ...conversationState,
        Messages: [...conversationState.Messages, messageToSend],
      });
      socket?.send(JSON.stringify(messageToSend));
    }
  };

  useEffect(() => {
    if (socket) {
      socket.onmessage = (event: MessageEvent) => {
        const newMessage = JSON.parse(event.data) as Message;
        setConversationState((prevState) => {
          if (prevState && prevState.ID === newMessage.ConvID) {
            return { ...prevState, Messages: [...prevState.Messages, newMessage] };
          }
          return prevState;
        });
      }
    }
  }, [socket]);

  useEffect(() => {
    setConversationState(initialConversation);
  }, [initialConversation]);

  if (!conversationState) {
    return <div>Select a conversation to start chatting</div>;
  }

  const conversationUI = conversationState.Messages.map((message) =>
    <li key={message.ID}>
      <p>{message.From}: {message.Content}</p>
    </li>
  );

  return(
    <section>
      <h1>Conversation</h1>
      <ul>{conversationUI}</ul>
      <section>
        <textarea rows={5} cols={10} onChange={e => setMessageState(e.target.value)} />
        <button onClick={sendMessage}>Send</button>
      </section>
    </section>
  );
}

export default Chat;
