import { Conversation, LoginResponse } from './types'
import { arrayBufferToBase64 } from './utils';

export async function deleteMessage(messageID: string, conversationID: string): Promise<Conversation> {
  const token = localStorage.getItem('token');
  try {
    if (!token) {
      throw new Error('No token found');
    }
    const response = await fetch('http://localhost:3001/api/delete-message', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ conversationID, messageID }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete message');
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    } else {
      throw new Error('An unknown error occurred');
    }
  }
}
export async function login(username: string, password: string): Promise<LoginResponse> {
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

  const resp: LoginResponse = await response.json();
  return resp;
}
export async function logout(): Promise<void> {
  const token = localStorage.getItem('token');
  try {
    if (!token) {
      throw new Error('No token found');
    }
    const response = await fetch('http://localhost:3001/api/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });
    if (!response.ok) {
      throw new Error('Failed to logout');
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    } else {
      throw new Error('An unknown error occurred');
    }
  }
}
export async function register(username: string, password: string, publicKey: string, encryptedPrivateKey: string): Promise<void> {
  const response = await fetch('http://localhost:3001/api/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password, publicKey, encryptedPrivateKey }),
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
export const fetchConversation = async (conversationID: string): Promise<Conversation | null> => {
  const token = localStorage.getItem('token');
  try {
    if (!token) {
      throw new Error('No token found');
    }
    const url = new URL('http://localhost:3001/api/conversation');
    url.searchParams.append('id', conversationID);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const conversation: Conversation = (await response.json());
    return conversation;
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
export async function sendKeys(publicKey: JsonWebKey, encryptedPrivateKey: string): Promise<void> {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('token not found');
  } 
  const response = await fetch(`http://localhost:3001/api/keys`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ publicKey, encryptedPrivateKey }),
  });
  if (!response.ok) {
    throw new Error('Failed to send keys');
  }
}
export async function sendSalt(salt: ArrayBuffer): Promise<void> {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('token not found');
  }
  let saltBase64;
  try {
    saltBase64 = arrayBufferToBase64(salt);
  } catch (err) {
    throw new Error('Failed to convert salt to base64: ' + err);    
  }

  const response = await fetch('http://localhost:3001/api/salt', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ salt: saltBase64 }),
  });
  if (!response.ok) {
    throw new Error('Failed to send salt');
  }
}
