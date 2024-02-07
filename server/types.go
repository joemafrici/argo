package main

import (
	"time"
)

type User struct {
	Username string `bson:"username"`
	Password string `bson:"password"`
}
type Message struct {
	ID        string    `bson:"id"`
	ConvID string `bson:"convid"`
	To        string    `bson:"to"`
	From      string    `bson:"from"`
	Content   string    `bson:"content"`
	Timestamp *time.Time `bson:"timestamp,omitempty"`
}
type Conversation struct {
	ID           string    `bson:"id"`
	Participants []string  `bson:"participants"`
	Messages     []Message `bson:"messages"`
}
type DeleteMessageResponse struct {
	Type string `json:"type"`
	Conversation Conversation `json:"conversation"`
}
//	type UserConnection struct {
//		Username    string
//		WebSocket *websocket.Conn
//	}

// type Server struct {
// 	listenAddr string
// 	isRunning bool
//
// 	peersMu sync.RWMutex
// 	peers map[string]net.Conn
// }
// func NewServer() *Server {
// 	return &Server{}
// }
