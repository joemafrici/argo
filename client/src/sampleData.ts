export interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  name: string;
  lastMessage: string;
  messages: Message[];
}

export const sampleConversations: Conversation[] = [
  {
    id: '1',
    name: 'Alice',
    lastMessage: 'Hey, how are you?',
    messages: [
      { id: '1', sender: 'Alice', content: 'Hey, how are you?', timestamp: '2023-05-10T10:30:00Z' },
      { id: '2', sender: 'You', content: "I'm good, thanks! How about you?", timestamp: '2023-05-10T10:31:00Z' },
    ],
  },
  {
    id: '2',
    name: 'Bob',
    lastMessage: 'Are we still on for lunch?',
    messages: [
      { id: '1', sender: 'Bob', content: 'Are we still on for lunch?', timestamp: '2023-05-10T09:00:00Z' },
      { id: '2', sender: 'You', content: 'Yes, definitely! See you at 12.', timestamp: '2023-05-10T09:05:00Z' },
    ],
  },
  // Add more sample conversations as needed
];
