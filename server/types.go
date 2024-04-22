package main

import (
	"time"
)

type User struct {
	Username            string `bson:"username"`
	Password            string `bson:"password"`
	PublicKey           string `bson:"publicKey"`
	EncryptedPrivateKey string `bson:"encryptedPrivateKey"`
	SaltBase64 string `bson:"saltBase64"`
}
type Message struct {
	ID        string     `bson:"id"`
	ConvID    string     `bson:"convid"`
	To        string     `bson:"to"`
	From      string     `bson:"from"`
	Content   string     `bson:"content"`
	Content2   string     `bson:"content2"`
	Timestamp *time.Time `bson:"timestamp,omitempty"`
	IsDuplicate bool `bson:"isDuplicate"`
	OriginalMessageID string `bson:"originalMessageId, omitempty"`
}
type Participant struct {
	Username string `bson:"username"`
	Partner string `bson:"partner"`
	PublicKey string `bson:"publicKey"`
	Messages     []Message `bson:"messages"`
}
type Conversation struct {
	ID           string    `bson:"id"`
	Participants map[string]Participant `bson:"participants"`
}
type DeleteMessageResponse struct {
	Type         string       `json:"type"`
	Conversation Conversation `json:"conversation"`
}
type LoginResponse struct {
	Token string `json:"token"`
	Keys struct {
		Public string `json:"public"`
		EncryptedPrivate string `json:"encryptedPrivate"`
		SaltBase64 string `json:"saltBase64"`
	} `json:"keys"`
}
// type Keys struct {
// 	PublicKey string `json:"publicKey"`
// 	EncryptedPrivateKey string `json:"encryptedPrivateKey"`
// }
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
