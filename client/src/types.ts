export interface Conversations {
  [id: string]: Conversation[]
}
export interface Conversation {
  ID: string;
  Participants: string[];
  Messages: Message[];

}
export interface Message {
  ID: string;
  ConvID: string;
  To: string;
  From: string;
  Content: string;
  Timestamp?: Date;
}
export interface AuthenticateMessage {
  type: 'authenticate';
  token: string;
}
export interface PongMessage {
  type: 'pong';
}
export type SystemMessage = AuthenticateMessage | PongMessage;
export interface ConversationPreview {
  ID: string;
  MostRecentMessage: Message;
}
export interface LoginResponse {
  token: string,
  keys: {
    public: string,
    encryptedPrivate: string,
  };
}
