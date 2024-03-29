import React, { useEffect, useState } from 'react';
import { Message, Conversation } from '../../types';
import MessageComponent from '../message/Message';
import { deleteMessage } from '../../api';


interface ChatProps {
  sendMessage: (message: Message) => void;
  username: string;
  conversation: Conversation | undefined;
  encryptMessageHandler: (message: string) => Promise<string>;
}

const Chat: React.FC<ChatProps> = ({ sendMessage, username, conversation: initialConversation, encryptMessageHandler }) => {
  const [messageState, setMessageState] = useState('');
  const [conversationState, setConversationState] = useState<Conversation | undefined>(initialConversation);

  const handleSendMessage = async () => {
    if (conversationState && messageState.trim() !== '') {
      const recipient = conversationState.Participants.find(participant => participant != username);
      try {
        const encryptedContent = await encryptMessageHandler(messageState);
        const messageToSend: Message = {
          ID: '',
          To: recipient || '',
          From: username,
          Content: encryptedContent,
          ConvID: conversationState.ID,
        };
        console.log('sending message: ', messageToSend);
        sendMessage(messageToSend);
        setMessageState('');
      } catch (err) {
        console.error('Failed to encrypt message:', err);  
      }
    }
  };
  const handleDeleteMessage = async (messageID: string, conversationID: string): Promise<void> => {
    try {
      const updatedConversation = await deleteMessage(messageID, conversationID);
      if (updatedConversation) {
        setConversationState(updatedConversation);
      }
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  useEffect(() => {
    setConversationState(initialConversation);
  }, [initialConversation]);

  if (!conversationState) {
    return (
      <div className='flex items-center justify-center h-full'>
        <span className='text-gray-500'>Select a conversation to start chatting</span>;
      </div>
    );
  }

  const MessageList = () => (
    <ul className='space-y-2 overflow-auto p-4'>
      {conversationState?.Messages.map((message) => (
        <MessageComponent 
          key={message.ID}
          message={message}
          onDelete={handleDeleteMessage}
          isOwnMessage={message.From === username}
        />
      ))}
    </ul>
  );

  return(
    <section className='flex flex-col h-full bg-white'>
      <h1 className='text-xl font-bold p-4 border-b bg-gray-50'>
        Conversation with {conversationState.Participants.join(',')}</h1>
      <MessageList />
      <section className='p-4 border-t'>
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
