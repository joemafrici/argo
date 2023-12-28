import { Conversation } from './Types'

export const fetchUserConversations = async (username: string): Promise<Conversation[] | null> => {
    try {
        const response = await fetch(`http://localhost:3001/api/conversations?user=${username}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const conversations: Conversation[] = await response.json();
        return conversations;
    } catch (error) {
        console.error('Failed to fetch conversations', error);
        return null
    }
}
