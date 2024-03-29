package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/joemafrici/argo/utils"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
)

// ***********************************************
func HandleSendSalt(w http.ResponseWriter, r *http.Request) {
	log.Println("in HandleSalt")

	if r.Method != "POST" {
		log.Println("Method not allowed")
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var saltRequest struct {
		Salt string `json:"salt"`
	}
	if err := json.NewDecoder(r.Body).Decode(&saltRequest); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	username, ok := r.Context().Value("username").(string)
	if !ok {
		http.Error(w, "Invalid user context", http.StatusInternalServerError)
		return
	}

	c := dbclient.Database(dbname).Collection("users")
	f := bson.M{"username": username}
	u := bson.M{
		"$set": bson.M{
			"salt": saltRequest.Salt,
		},
	}

	_, err := c.UpdateOne(context.TODO(), f, u)
	if err != nil {
		http.Error(w, "Failed to store salt", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}
// ***********************************************
func HandleSendKeys(w http.ResponseWriter, r *http.Request) {
	log.Println("in HandleSendKeys")

	if r.Method != "POST" {
		log.Println("Method not allowed")
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var keysRequest struct {
		PublicKey string `json:"publicKey"`
		EncryptedPrivateKey string `json:"encryptedPrivateKey"`
	}
	if err := json.NewDecoder(r.Body).Decode(&keysRequest); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	username, ok := r.Context().Value("username").(string)
	if !ok {
		http.Error(w, "Invalid user context", http.StatusInternalServerError)
		return
	}

	c := dbclient.Database(dbname).Collection("users")
	f := bson.M{"username": username}
	u := bson.M{
		"$set": bson.M{
			"publicKey": keysRequest.PublicKey,
			"encryptedPrivateKey": keysRequest.EncryptedPrivateKey,
		},
	}

	_, err := c.UpdateOne(context.TODO(), f, u)
	if err != nil {
		http.Error(w, "Failed to store keys", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}
// ***********************************************
func HandleDeleteMessage(w http.ResponseWriter, r *http.Request) {
	log.Println("in HandleDeleteMessage")

	if r.Method != "DELETE" {
		log.Println("Method not allowed")
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var deleteRequest struct {
		ConversationID string `json:"conversationID"`
		MessageID      string `json:"messageID"`
	}

	if err := json.NewDecoder(r.Body).Decode(&deleteRequest); err != nil {
		log.Println("Bad request")
		http.Error(w, err.Error(), http.StatusBadRequest)
		return // fairly certain I should be returning here
	}

	c := dbclient.Database(dbname).Collection("conversations")
	f := bson.M{
		"id":          deleteRequest.ConversationID,
		"messages.id": deleteRequest.MessageID,
	}

	u := bson.M{
		"$pull": bson.M{
			"messages": bson.M{"id": deleteRequest.MessageID},
		},
	}

	_, err := c.UpdateOne(context.TODO(), f, u)
	if err != nil {
		log.Printf("Error deleting message: %v", err)
		http.Error(w, "Failed to delete message", http.StatusInternalServerError)
		return
	}

	var updatedConversation Conversation
	err = c.FindOne(context.TODO(), bson.M{"id": deleteRequest.ConversationID}).Decode(&updatedConversation)
	if err != nil {
		log.Println("Error fetching updated conversation:", err)
		http.Error(w, "Failed to fetch updated conversation", http.StatusInternalServerError)
		return
	}

	response := DeleteMessageResponse{
		Type: "conversationUpdate",
		Conversation: updatedConversation,
	}
	responseJSON, err := json.Marshal(response)
	if err != nil {
		log.Println("Error marshalling response:", err)
		return
	}
	clientsMu.RLock()
	for _, user := range updatedConversation.Participants {
		ws, ok := clients[user]
		if !ok {
			log.Println("No WebSocket connection found for user:", user, err)
			continue
		}

		if err := ws.WriteMessage(websocket.TextMessage, responseJSON); err != nil {
			log.Println("Error sending message over WebSocket to user:", user, err)
			continue
		}
	}
	clientsMu.RUnlock()

	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updatedConversation)
	log.Println("Response sent")
}

// ***********************************************
func HandleRegister(w http.ResponseWriter, r *http.Request) {
	log.Println("in HandleRegister")

	var newUser struct {
		Username string `json:"username"`
		Password string `json:"password"`
		PublicKey string `json:"publicKey"`
		EncryptedPrivateKey string `json:"encryptedPrivateKey"`
	}
	if err := json.NewDecoder(r.Body).Decode(&newUser); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	var existingUser User
	filter := bson.M{"username": newUser.Username}
	err := dbclient.Database(dbname).Collection("users").FindOne(context.TODO(), filter).Decode(&existingUser)
	if err == nil {
		http.Error(w, "User already exists", http.StatusConflict)
		return
	} else if err != mongo.ErrNoDocuments {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newUser.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Server Error", http.StatusInternalServerError)
		return
	}

	userToInsert := User{
		Username: newUser.Username,
		Password: string(hashedPassword),
		PublicKey: newUser.PublicKey,
		EncryptedPrivateKey: newUser.EncryptedPrivateKey,
	}

	_, err = dbclient.Database(dbname).Collection("users").InsertOne(context.TODO(), userToInsert)
	if err != nil {
		http.Error(w, "Failed to create new user", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}
// ***********************************************
func HandleLogin(w http.ResponseWriter, r *http.Request) {
	log.Println("in HandleLogin")

	var loginUser User
	if err := json.NewDecoder(r.Body).Decode(&loginUser); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	var storedUser User
	filter := bson.M{"username": loginUser.Username}
	err := dbclient.Database(dbname).Collection("users").FindOne(context.TODO(), filter).Decode(&storedUser)
	if err != nil {
		http.Error(w, "user not found", http.StatusUnauthorized)
	}
	err = bcrypt.CompareHashAndPassword([]byte(storedUser.Password), []byte(loginUser.Password))
	if err != nil {
		log.Println("Invalid Credentials", err)
		http.Error(w, "Invalid Credentials", http.StatusUnauthorized)
		return
	}
	tokenString, err := utils.NewTokenString(loginUser.Username)
	if err != nil {
		http.Error(w, "Server Error", http.StatusInternalServerError)
		return
	}

	response := LoginResponse{
		Token: tokenString,
		Keys: struct{
			Public string `json:"public"` 
			EncryptedPrivate string `json:"encryptedPrivate"`
		}{
			Public: storedUser.PublicKey,
			EncryptedPrivate: storedUser.EncryptedPrivateKey,
		},
	}

	json.NewEncoder(w).Encode(response)
}
// ***********************************************
// This function is not needed right now.
// Could be needed in the future if I want a user to be able to log out
// on one client and still be logged in on another.
// func HandleLogout(w http.ResponseWriter, r *http.Request) {
// 	log.Println("in HandleLogout")
// 	// get username from request
// 	//username := r.Context().Value("username").(string)
//
// 	clientsMu.Lock()
// 	conn, exists := clients[username]
// 	if exists {
// 		closeConnection(conn)
// 		delete(clients, username)
// 	}
// 	clientsMu.Unlock()
//
// 	clientsMu.RLock()
// 	log.Println(clients)
// 	clientsMu.RUnlock()
// }

// ***********************************************
func HandleCreateConversation(w http.ResponseWriter, r *http.Request) {
	log.Println("in HandleCreateConversation")

	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	initiator, ok := r.Context().Value("username").(string)
	if !ok {
		http.Error(w, "Invalid user context", http.StatusInternalServerError)
		return
	}
	var requestData struct {
		Participants []string `json:"participants"`
	}
	if err := json.NewDecoder(r.Body).Decode(&requestData); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	participants := append(requestData.Participants, initiator)
	participants = utils.RemoveDuplicates(participants)
	newConversation := Conversation{
		ID:           uuid.NewString(),
		Participants: participants,
		Messages:     []Message{},
	}

	coll := dbclient.Database("argodb").Collection("conversations")
	_, err := coll.InsertOne(context.TODO(), newConversation)
	if err != nil {
		http.Error(w, "Failed to create conversation", http.StatusInternalServerError)
	}
	log.Println(newConversation)
	json.NewEncoder(w).Encode(newConversation)
}

// ***********************************************
func HandleGetUserConversation(w http.ResponseWriter, r *http.Request) {
	log.Println("in HandleGetUserConversation")

	if dbclient == nil {
		http.Error(w, "Unable to retrieve conversations", http.StatusInternalServerError)
		log.Println("handleGetUserConversations client is nil")
		return
	}

	username, ok := r.Context().Value("username").(string)
	if !ok {
		http.Error(w, "Invalid user context", http.StatusInternalServerError)
		return
	}
	if username == "" {
		http.Error(w, "username is required", http.StatusBadRequest)
		return
	}

	conversationID := r.URL.Query().Get("id")
	if conversationID == "" {
		http.Error(w, "id is required", http.StatusBadRequest)
		return
	}

	conversation, err := getUserConversation(username, conversationID)
	if err != nil {
		log.Println("conversations err", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(conversation)
}

// ***********************************************
func HandleGetUserConversations(w http.ResponseWriter, r *http.Request) {
	log.Println("in HandleGetUserConversations")

	if dbclient == nil {
		http.Error(w, "Unable to retrieve conversations", http.StatusInternalServerError)
		log.Println("handleGetUserConversations client is nil")
		return
	}

	username, ok := r.Context().Value("username").(string)
	if !ok {
		http.Error(w, "Invalid user context", http.StatusInternalServerError)
		return
	}
	if username == "" {
		http.Error(w, "username is required", http.StatusBadRequest)
		return
	}
	conversations, err := getUserConversations(username)
	if err != nil {
		log.Println("conversations err", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(conversations)
}

// ***********************************************
func HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	log.Println("in HandleWebSocket")

	upgrader := websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
	}
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}

	_, message, err := conn.ReadMessage()
	if err != nil {
		log.Println("Error reading WebSocket message", err)
		return
	}

	var authMessage struct {
		Token string `json:"token"`
	}
	if err := json.Unmarshal(message, &authMessage); err != nil {
		log.Println("Invalid authentication message")
		conn.WriteMessage(websocket.CloseMessage, []byte("Invalid authentication message"))
		return
	}

	username, err := utils.ValidateTokenFromString(authMessage.Token)
	if err != nil {
		log.Println("Invalid token:", err)
		conn.WriteMessage(websocket.CloseMessage, []byte("Invalid token"))
		return
	}

	clientsMu.Lock()
	if oldConn, ok := clients[username]; ok {
		log.Println("WebSocket connection already exists for", username)
		closeConnection(oldConn)
	}
	clients[username] = conn
	clientsMu.Unlock()
	log.Println(username, "authenticated")
	go HandleConnection(username, conn)
}
// ***********************************************
func HandleConnection(username string, conn *websocket.Conn) {
	log.Println("in HandleConnection")
	defer closeConnection(conn)
	defer func() {
		clientsMu.Lock()
		delete(clients, username)
		clientsMu.Unlock()
	}()

	conn.SetPongHandler(func(appData string) error {
		log.Println("Pong received from:", username, "with data:", appData)
		conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	pingTicker := time.NewTicker(50 * time.Second)
	defer pingTicker.Stop()

	go func() {
		for range pingTicker.C {
			log.Println("Sending ping to:", username)
			conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				log.Println("write ping:", err)
				return
			}
		}
	}()

	for {
		messageType, p, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsCloseError(err, websocket.CloseNormalClosure, websocket.CloseGoingAway) {
				log.Println("connection closed:", err)
				break
			} else {
				log.Println("ReadMessage:", err)
			}
			closeConnection(conn)
			return
		}

		var echo Message
		if err := json.Unmarshal(p, &echo); err != nil {
			log.Println("Unmarshal", err)
		}
		
		log.Println("Received message", echo.Content, "from", echo.From)

		if echo.Timestamp == nil {
			now := time.Now()
			echo.Timestamp = &now
		}
		if echo.ID == "" {
			echo.ID = uuid.NewString()
		}

		forward := Message{
			ID:        uuid.NewString(),
			ConvID:    echo.ConvID,
			To:        echo.To,
			From:      echo.From,
			Content:   echo.Content,
			Timestamp: echo.Timestamp,
		}
		forwardBytes, err := json.Marshal(forward)
		if err != nil {
			log.Println("Marshal", err)
		}
		echoBytes, err := json.Marshal(echo)
		if err != nil {
			log.Println("Marshal", err)
		}

		clientsMu.RLock()
		recipientConn, recipientExists := clients[echo.To]
		echoConn, echoExists := clients[echo.From]
		clientsMu.RUnlock()

		if echoExists {
			echoConn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := echoConn.WriteMessage(messageType, echoBytes); err != nil {
				log.Println("Error writing message to echo connection:", err)
				closeConnection(echoConn)
				clientsMu.Lock()
				delete(clients, echo.From)
				clientsMu.Unlock()
			}
			log.Println("echoed: ", echo)
		} else {
			log.Println(echo.From, "is not logged in")
		}
		if recipientExists {
			recipientConn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := recipientConn.WriteMessage(messageType, forwardBytes); err != nil {
				log.Println("Error writng message to recipient connection:", err)
				closeConnection(recipientConn)
				clientsMu.Lock()
				delete(clients, echo.To)
				clientsMu.Unlock()
			}
		} else {
			log.Println(echo.To, "is not logged in")
		}
		if err := addMessageToConversation(forward); err != nil {
			utils.HandleDatabaseError(err)
		}
	}
}
