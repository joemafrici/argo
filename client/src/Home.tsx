import React, { useEffect, useState } from 'react';
import { Outlet, useParams, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Conversation from './components/Conversation';
import { Conversation as ConversationType, Message } from './sampleData';

const Home: React.FC = () => {
  const [conversations, setConversations] = useState<ConversationType[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationType | undefined>(undefined);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();

  const handleConversationSelect = (id: string) => {
    navigate(`/home/${id}`);
  };

  const handleSendMessage = (conversationId: string, newMessage: Message) => {
    setConversations(prevConversations =>
      prevConversations.map(conv => conv.ID === conversationId
        ? { ...conv, messages: [...conv.Messages, newMessage], lasMessage: newMessage.Content }
        : conv
      )
    );
  };

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No token found');
        }

        const response = await fetch('http://localhost:3001/api/conversations', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
        });

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const fetchedConversations = (await response.json()) as ConversationType[];
        console.log(fetchedConversations);
        if (!fetchedConversations) {
          console.log('no conversations to fetch');
          return;
        }

        setConversations(fetchedConversations);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error fetching conversations');
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversations();
  }, []);

  useEffect(() => {
    console.log('setting selected conversation', conversationId);
    const conversation = conversations.find(conv => conv.ID === conversationId);
    console.log(conversation);
    setSelectedConversation(conversation);
  }, [conversations, conversationId]);

  if (isLoading) return (<div>Loading...</div>)
  if (error) return (<div>Error:{error}</div>)

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
            onSendMessage={(message) => handleSendMessage(selectedConversation.ID, message)} />
        ) : (
          <div>Select a conversation to start chatting</div>
        )}
      </div>
      <Outlet />
    </div>
  )
}
export default Home
