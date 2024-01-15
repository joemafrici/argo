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
export interface ConversationPreview {
    ID: string;
    MostRecentMessage: Message;
}
