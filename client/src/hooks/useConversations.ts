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

        const fetchedConversations = (await response.json()) as Conversation[];
        if (!fetchedConversations) {
          console.log('no conversations to fetch');
          return;
        }
        console.log('received conversations');
        console.log(fetchedConversations);
        const decryptedConversations = await Promise.all(
          fetchedConversations.map(ConversationUtils.createFromExisting)
        );
        console.log('decrypted conversations');
        console.log(decryptedConversations);
        setConversations(decryptedConversations);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error fetching conversations');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndDecryptConversations();
  }, []);

  return { conversations, isLoading, error };
};
