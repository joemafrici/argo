import { Conversation } from './types'

export async function login(username: string, password: string): Promise<string> {
  const response = await fetch('http://localhost:3001/api/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    throw new Error('Failed to login');
  }

  const data = await response.json();
  return data.token;
}
export async function register(username: string, password: string): Promise<void> {
  const response = await fetch('http://localhost:3001/api/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    throw new Error('Failed to register');
  }
}
export const fetchUserConversations = async (): Promise<Conversation[] | null> => {
  const token = localStorage.getItem('token');
  try {
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
    const conversations: Conversation[] = (await response.json());
    return conversations;
  } catch (error) {
    console.error('Failed to fetch conversations', error);
    return null;
  }
}
export const fetchNewConversation = async (creatorUsername: string, participantUsername: string): Promise<Conversation | null> => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }
    const response = await fetch(`http://localhost:3001/api/create-conversation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
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
