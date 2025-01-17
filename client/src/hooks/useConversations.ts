import { useEffect, useState } from 'react';
import { Conversation } from '../sampleData';
import * as ConversationUtils from '../models/conversation'

export const useConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAndDecryptConversations = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No token found');
        }

        const response = await fetch('/api/conversations', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
        });

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const fetchedConversations = (await response.json()) as Conversation[];
        if (!fetchedConversations) {
          console.log('no conversations to fetch');
          return;
        }
        const decryptedConversations = await Promise.all(
          fetchedConversations.map(ConversationUtils.createFromExisting)
        );
        setConversations(decryptedConversations);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error fetching conversations');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndDecryptConversations();
  }, []);

  const fetchConversation = async (convID: string) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }

      const response = await fetch(`/api/conversation?id=${convID}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const fetchedConversation = (await response.json()) as Conversation;
      if (!fetchedConversation) {
        throw new Error('could not get conversation from server');
      }
      const decryptedConversation = await ConversationUtils.createFromExisting(fetchedConversation);
      setConversations([
        ...conversations,
        decryptedConversation
      ]);

    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error fetching conversations');
    } finally {
      setIsLoading(false);
    }
  }

  return { conversations, isLoading, error, setConversations, fetchConversation };
};
