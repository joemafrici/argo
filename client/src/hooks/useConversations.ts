import { useState, useEffect, useCallback } from 'react';
import { Conversation, ConversationPreview, Message } from '../types';
import { fetchUserConversations, fetchNewConversation } from '../api';

const useConversations = (username: string, isLoggedIn: boolean) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationID, setSelectedConversationID] = useState<string | null>(null);
  const [conversationPreviews, setConversationPreviews] = useState<ConversationPreview[]>([]);

  const handleConversationSelect = useCallback((conversationID: string) => {
    setSelectedConversationID(conversationID);
  }, []);
  const handleCreateNewConversation = useCallback(async (participantUsername: string) => {
    if (username) {
      const newConversation = await fetchNewConversation(username, participantUsername);
      if (newConversation) {
        setConversations(prev => [...prev, newConversation]);
        setSelectedConversationID(newConversation.ID);
      } else {
        console.error('handleCreateNewConversation unable to fetch new conversation');
      }
    }
  }, [username]);
  const handleConversationUpdate = useCallback((updatedConversation: Conversation) => {
    setConversations(prevConversations => {
      const conversationIndex = prevConversations.findIndex(conv => conv.ID === updatedConversation.ID);
      if (conversationIndex >= 0) {
        const updatedConversations = [
          ...prevConversations.slice(0, conversationIndex),
          updatedConversation,
          ...prevConversations.slice(conversationIndex + 1),
        ];
        return updatedConversations;
      } else {
        return [...prevConversations, updatedConversation];
      }
    });
  }, []);
  const handleNewMessage = useCallback((newMessage: Message) => {
    setConversations(prevConversations => {
      const conversationIndex = prevConversations.findIndex(conv => conv.ID === newMessage.ConvID);
      if (conversationIndex >= 0) {
        const updatedConversation = {
          ...prevConversations[conversationIndex],
          Messages: [...prevConversations[conversationIndex].Messages, newMessage],
        };
        const updatedConversations = [
          ...prevConversations.slice(0, conversationIndex),
          updatedConversation,
          ...prevConversations.slice(conversationIndex + 1),
        ];
        return updatedConversations;
      } else {
        const newConversation: Conversation = {
          ID: newMessage.ConvID,
          Participants: [newMessage.From, username!],
          Messages: [newMessage],
        };
        return [...prevConversations, newConversation];
      }
    });
  }, [username]);

  const generatePreviews = useCallback((conversations: Conversation[]): ConversationPreview[] => {
    const previews = conversations.map((conversation: Conversation) => {
      const mostRecentMessage = conversation.Messages[conversation.Messages.length - 1];
      return {
        ID: conversation.ID,
        MostRecentMessage: mostRecentMessage,
      }
    });
    return previews
  }, []);

  useEffect(() => {
    const previews = generatePreviews(conversations);
    setConversationPreviews(previews);
  }, [conversations, generatePreviews]);

  useEffect(() => {
    const loadConversations = async () => {
      if (isLoggedIn) {
        const fetchedConversations = await fetchUserConversations();
        if (fetchedConversations) {
          setConversations(fetchedConversations)
          const previews = fetchedConversations.map((conversation: Conversation) => {
            const mostRecentMessage = conversation.Messages[conversation.Messages.length - 1];
            return {
              ID: conversation.ID,
              MostRecentMessage: mostRecentMessage,
            }
          });
          setConversationPreviews(previews);
        }
      }
    };
    loadConversations();
  }, [isLoggedIn]);

  return {
    conversations,
    selectedConversationID,
    conversationPreviews,
    handleConversationSelect,
    handleCreateNewConversation,
    handleNewMessage,
    handleConversationUpdate,
  };
};
export default useConversations;
