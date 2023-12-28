export interface Conversations {
  [id: string]: Conversation[]
}
export interface Conversation {
  id: string;
  participants: string[];
  messages: Message[];

}
export interface Message {
  id: string;
  to: string;
  from: string;
  content: string;
  timestamp: Date;
}
export interface ConversationPreview {
    id: string;
    mostRecentMessage: Message;
}
