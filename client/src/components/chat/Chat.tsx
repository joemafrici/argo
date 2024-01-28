import React, { useEffect, useState } from 'react'
import { Message, Conversation } from '../../types'


interface ChatProps {
  sendMessage: (message: Message) => void;
  username: string;
  conversation: Conversation | undefined;
}

const Chat: React.FC<ChatProps> = ( { sendMessage, username, conversation: initialConversation }) => {
  const [messageState, setMessageState] = useState('');
  const [conversationState, setConversationState] = useState<Conversation | undefined>(initialConversation);

  const handleSendMessage = () => {
    if (conversationState && messageState.trim() !== '') {
      const recipient = conversationState.Participants.find(participant => participant != username);
      const messageToSend: Message = {
        ID: '',
        To: recipient || '',
        From: username,
        Content: messageState,
        ConvID: conversationState.ID,
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


  const MessageList = () => (
    <ul>
      {conversationState?.Messages.map((message) => (
        <li key={message.ID} className={`p-3 ${message.From === username ? 'bg-blue-100' : 'bg-gray 100'} my-1 mx-2 rounded-lg`}>
          <p className='font-medium'>{message.From}:</p> 
          <p>{message.Content}</p>
        </li>
      ))}
    </ul>
  );

  return(
    <section className='flex flex-col h-full'>
      <h1 className='text-xl font-bold p-4 border-b'>Conversation with {conversationState.Participants.join(',')}</h1>
      <MessageList />
      <section className='p-4 border-t bg-white'>
        <textarea 
          className='w-full p-2 border rounded-lg resize-none'
          placeholder='Type a message...'
          rows={3} value={messageState} onChange={e => setMessageState(e.target.value)} />
        <button 
          className='bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg mt-2'
          onClick={handleSendMessage}>Send</button>
      </section>
    </section>
  );
}

export default Chat;
