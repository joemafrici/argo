package main

import (
	"time"
)

type User struct {
	Username            string `bson:"username"`
	Password            string `bson:"password"`
	PublicKey           string `bson:"publicKey"`
	EncryptedPrivateKey string `bson:"encryptedPrivateKey"`
	SaltBase64          string `bson:"saltBase64"`
}
type Message struct {
	ID        string     `bson:"id"`
	ConvID    string     `bson:"convid"`
	To        string     `bson:"to"`
	From      string     `bson:"from"`
	Content   string     `bson:"content"`
	Timestamp *time.Time `bson:"timestamp,omitempty"`
}
type Participant struct {
	Username              string `bson:"username"`
	PublicKey             string `bson:"publicKey"`
	EncryptedSymmetricKey string `bson:"encryptedSymmetricKey"`
}
type Conversation struct {
	ID           string                 `bson:"id"`
	Participants map[string]Participant `bson:"participants"`
	Messages     []Message              `bson:"messages"`
}
type DeleteMessageResponse struct {
	Type         string       `json:"type"`
	Conversation Conversation `json:"conversation"`
}
type LoginResponse struct {
	Token string `json:"token"`
	Keys  struct {
		Public           string `json:"public"`
		EncryptedPrivate string `json:"encryptedPrivate"`
		SaltBase64       string `json:"saltBase64"`
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
