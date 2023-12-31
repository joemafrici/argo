import { Conversation } from './Types'

export const fetchUserConversations = async (username: string): Promise<Conversation[] | null> => {
    try {
        const response = await fetch(`http://localhost:3001/api/conversations?user=${username}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const conversations: Conversation[] = (await response.json());
        return conversations;
    } catch (error) {
        console.error('Failed to fetch conversations', error);
        return null;
    }
}

export const fetchNewConversation = async (creatorUsername: string, participantUsername: string): Promise<Conversation | null> => {
    try {
        const response = await fetch(`http://localhost:3001/api/create-conversation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ participants: [creatorUsername, participantUsername] }),
        });
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const conversation: Conversation = await response.json() as Conversation;
        return conversation;
    } catch (error) {
        console.error('Failed to create new conversation', error);
        return null;
    }
}
