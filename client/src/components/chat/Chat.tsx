import React, { useEffect, useState } from 'react'
import { Message, Conversation } from '../../types'


interface ChatProps {
  sendMessage: (messag: Message) => void;
  username: string;
  conversation: Conversation | undefined;
}

const Chat: React.FC<ChatProps> = ( { sendMessage, username, conversation: initialConversation }) => {
  const [messageState, setMessageState] = useState('');
  const [conversationState, setConversationState] = useState<Conversation | undefined>(initialConversation);

  const handleSendMessage = () => {
    if (conversationState && messageState.trim() !== '') {
      let to = '';
      for (const user of conversationState.Participants) {
        if (user !== username) {
          to = user;
        }
      }
      const messageToSend: Message = {
        ID: '',
        To: to,
        From: username,
        Content: messageState,
        ConvID: conversationState?.ID,
      };
      sendMessage(messageToSend);
      setMessageState('');
    }
  };

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
        <textarea rows={5} cols={10} value={messageState} onChange={e => setMessageState(e.target.value)} />
        <button onClick={handleSendMessage}>Send</button>
      </section>
    </section>
  );
}

export default Chat;
