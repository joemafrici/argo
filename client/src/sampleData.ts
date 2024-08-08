export interface User {
  Username: string;
  Password: string;
  PublicKey: string;
  EncryptedPrivateKey: string;
  SaltBase64: string;
}
export interface Message {
  ID: string;
  ConvId: string;
  To: string;
  From: string;
  Content: string;
  Timestamp: string;
}
export interface Participant {
  Username: string;
  PublicKey: string;
  EncryptedSymmetricKey: string
}
export interface Conversation {
  ID: string;
  Participants: { [key: string]: Participant };
  Messages: Message[];
  LastMessage: string;
  SymmetricKey: string;
}
