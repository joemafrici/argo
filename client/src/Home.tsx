import React, { useEffect, useState } from 'react';
import { Outlet, useParams, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Conversation from './components/Conversation';
import { sampleConversations, Conversation as ConversationType, Message } from './sampleData';

const Home: React.FC = () => {
  const [conversations, setConversations] = useState<ConversationType[]>(sampleConversations);
  const [selectedConversation, setSelectedConversation] = useState<ConversationType | undefined>(undefined);
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();

  const handleConversationSelect = (id: string) => {
    navigate(`/home/${id}`);
  };

  const handleSendMessage = (conversationId: string, newMessage: Message) => {
    setConversations(prevConversations =>
      prevConversations.map(conv => conv.id === conversationId
        ? { ...conv, messages: [...conv.messages, newMessage], lasMessage: newMessage.content }
        : conv
      )
    );
  };


  useEffect(() => {
    console.log('setting selected conversation', conversationId);
    const conversation = conversations.find(conv => conv.id === conversationId);
    console.log(conversation);
    setSelectedConversation(conversation);
  }, [conversations, conversationId]);

  return (
    <div className='home'>
      <Sidebar
        conversations={conversations}
        onSelect={handleConversationSelect}
        selectedId={conversationId}
      />
      <div className='conversation-area'>
        {selectedConversation ? (
          <Conversation
            conversation={selectedConversation}
            onSendMessage={(message) => handleSendMessage(selectedConversation.id, message)} />
        ) : (
          <div>Select a conversation to start chatting</div>
        )}
      </div>
      <Outlet />
    </div>
  )
}
export default Home
