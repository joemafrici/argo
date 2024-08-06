import React from 'react';
import { Outlet, useParams, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Conversation from './components/Conversation';
import { sampleConversations } from './sampleData';

const Home: React.FC = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();

  const handleConversationSelect = (id: string) => {
    navigate(`/home/${id}`);
  };

  const selectedConversation = sampleConversations.find(conv => conv.id === conversationId);
  return (
    <div className='home'>
      <Sidebar
        conversations={sampleConversations}
        onSelect={handleConversationSelect}
        selectedId={conversationId}
      />
      <div className='conversation-area'>
        {selectedConversation ? (
          <Conversation conversation={selectedConversation} />
        ) : (
          <div>Select a conversation to start chatting</div>
        )}
      </div>
      <Outlet />
    </div>
  )
}
export default Home
