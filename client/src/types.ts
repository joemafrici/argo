// export interface Message {
//     recipient: string;
//     content: string
// }

export interface WebSocketMessageEvent extends Event {
    data: string;
}
