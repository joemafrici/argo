package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/joemafrici/argo/utils"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
)

// ***********************************************
func HandleSendSalt(w http.ResponseWriter, r *http.Request) {
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
	err := db.StoreUserSalt(username, saltRequest.Salt)
	if err != nil {
		http.Error(w, "Failed to store salt", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// ***********************************************
func HandleSendKeys(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		log.Println("Method not allowed")
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var keysRequest struct {
		PublicKey           string `json:"publicKey"`
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

	err := db.StoreUserKeys(username, keysRequest.PublicKey, keysRequest.EncryptedPrivateKey)
	if err != nil {
		http.Error(w, "Failed to store keys", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// ***********************************************
func HandleDeleteMessage(w http.ResponseWriter, r *http.Request) {
	log.Println("message delete not available")
	/*

		if r.Method != "DELETE" {
			log.Println("Method not allowed")
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var deleteRequest struct {
			ConversationID string `json:"currentConversationID"`
			MessageID      string `json:"messageID"`
		}

		if err := json.NewDecoder(r.Body).Decode(&deleteRequest); err != nil {
			log.Println("Bad request")
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
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
			Type:         "conversationUpdate",
			Conversation: updatedConversation,
		}
		responseJSON, err := json.Marshal(response)
		if err != nil {
			log.Println("Error marshalling response:", err)
			return
		}
		clientsMu.RLock()
		// TODO: need to determine if I need to echo the updated conversation
		// back to the user that requested the delete

		for _, participant := range updatedConversation.Participants {
			ws, ok := clients[participant]
			if !ok {
				log.Println("No websocket connection found for user:", participant, err)
				continue
			}

			if err := ws.WriteMessage(websocket.TextMessage, responseJSON); err != nil {
				log.Println("Error sending message over WebSocket to user:", participant, err)
			}
		}

		clientsMu.RUnlock()
		w.WriteHeader(http.StatusOK)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(updatedConversation)
	*/
}

// ***********************************************
func HandleRegister(w http.ResponseWriter, r *http.Request) {
	var newUser struct {
		Username            string `json:"username"`
		Password            string `json:"password"`
		PublicKey           string `json:"publicKey"`
		SaltBase64          string `json:"saltBase64"`
		EncryptedPrivateKey string `json:"encryptedPrivateKey"`
	}
	if err := json.NewDecoder(r.Body).Decode(&newUser); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		log.Println(err.Error())
		return
	}

	_, err := db.FindUserByUsername(newUser.Username)

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
		Username:            newUser.Username,
		Password:            string(hashedPassword),
		PublicKey:           newUser.PublicKey,
		EncryptedPrivateKey: newUser.EncryptedPrivateKey,
		SaltBase64:          newUser.SaltBase64,
	}

	err = db.CreateUser(userToInsert)
	if err != nil {
		http.Error(w, "Failed to create new user", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

// ***********************************************
func HandleLogin(w http.ResponseWriter, r *http.Request) {
	var loginUser User
	if err := json.NewDecoder(r.Body).Decode(&loginUser); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	var storedUser User
	storedUser, err := db.FindUserByUsername(loginUser.Username)
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
		Keys: struct {
			Public           string `json:"public"`
			EncryptedPrivate string `json:"encryptedPrivate"`
			SaltBase64       string `json:"saltBase64"`
		}{
			Public:           storedUser.PublicKey,
			EncryptedPrivate: storedUser.EncryptedPrivateKey,
			SaltBase64:       storedUser.SaltBase64,
		},
	}

	json.NewEncoder(w).Encode(response)
}

// ***********************************************
// This function is not needed right now.
// Could be needed in the future if I want a user to be able to log out
// on one client and still be logged in on another.
//
//	func HandleLogout(w http.ResponseWriter, r *http.Request) {
//		log.Println("in HandleLogout")
//		// get username from request
//		//username := r.Context().Value("username").(string)
//
//		clientsMu.Lock()
//		conn, exists := clients[username]
//		if exists {
//			closeConnection(conn)
//			delete(clients, username)
//		}
//		clientsMu.Unlock()
//
//		clientsMu.RLock()
//		log.Println(clients)
//		clientsMu.RUnlock()
//	}
//
// ***********************************************
func validateAndFetchParticipants(requestParticipants []struct {
	Username  string `json:"username"`
	PublicKey string `json:"publicKey"`
}, currentUser string) (map[string]Participant, error) {
	participants := make(map[string]Participant)
	for _, p := range requestParticipants {
		user, err := db.FindUserByUsername(p.Username)
		if err != nil {
			if err == mongo.ErrNoDocuments {
				return nil, fmt.Errorf("User %s does not exist", p.Username)
			}
			return nil, fmt.Errorf("Failed to fetch user %s: %w", p.Username, err)
		}

		participants[p.Username] = Participant{
			Username:  user.Username,
			PublicKey: user.PublicKey,
		}
	}

	if _, exists := participants[currentUser]; !exists {
		return nil, fmt.Errorf("current user must be included in the conversation")
	}

	return participants, nil
}

// ***********************************************
func HandleCreateConversation(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	usr, ok := r.Context().Value("username").(string)
	if !ok {
		http.Error(w, "Invalid user context", http.StatusInternalServerError)
		return
	}

	var requestData struct {
		Participants []struct {
			Username  string `json:"username"`
			PublicKey string `json:"publicKey"`
		} `json:"participants"`
	}
	if err := json.NewDecoder(r.Body).Decode(&requestData); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	participants, err := validateAndFetchParticipants(requestData.Participants, usr)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	newConversation := Conversation{
		ID:           uuid.NewString(),
		Participants: participants,
	}

	if err := db.CreateConversation(newConversation); err != nil {
		http.Error(w, "Failed to create conversation", http.StatusInternalServerError)
	}

	json.NewEncoder(w).Encode(newConversation)
}

// ***********************************************
func HandleSymmetricKey(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	usr, ok := r.Context().Value("username").(string)
	if !ok {
		http.Error(w, "Invalid user context", http.StatusInternalServerError)
		return
	}

	var req struct {
		ConversationID string            `json:"ConversationId"`
		EncryptedKeys  map[string]string `json:"EncryptedKeys"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
	}

	conversation, err := db.GetUserConversation(usr, req.ConversationID)
	if err != nil {
		http.Error(w, "Conversation not found", http.StatusNotFound)
		return
	}
	if _, exists := conversation.Participants[usr]; !exists {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	for username, encryptedKey := range req.EncryptedKeys {
		err := db.UpdateParticipantSymmetricKey(req.ConversationID, username, encryptedKey)
		if err != nil {
			log.Printf("Error updating symmetric key for user %s: %v", username, err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
	}

	w.WriteHeader(http.StatusOK)
}

// ***********************************************
func HandleGetUserConversation(w http.ResponseWriter, r *http.Request) {
	if db == nil {
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

	conversation, err := db.GetUserConversation(username, conversationID)
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
	if db == nil {
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

	conversations, err := db.GetUserConversations(username)
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
	go HandleConnection(username, conn)
}

// ***********************************************
func HandleConnection(username string, conn *websocket.Conn) {
	defer closeConnection(conn)
	defer func() {
		clientsMu.Lock()
		delete(clients, username)
		clientsMu.Unlock()
	}()

	conn.SetPongHandler(func(appData string) error {
		conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	pingTicker := time.NewTicker(50 * time.Second)
	defer pingTicker.Stop()

	go func() {
		for range pingTicker.C {
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
		var receivedMessage Message
		if err := json.Unmarshal(p, &receivedMessage); err != nil {
			log.Println("Unmarshal", err)
		}

		if receivedMessage.Timestamp == nil {
			now := time.Now()
			receivedMessage.Timestamp = &now
		}
		if receivedMessage.ID == "" {
			receivedMessage.ID = uuid.NewString()
		}

		forwardMessage := Message{
			ID:        receivedMessage.ID,
			ConvID:    receivedMessage.ConvID,
			To:        receivedMessage.To,
			From:      receivedMessage.From,
			Content:   receivedMessage.Content,
			Timestamp: receivedMessage.Timestamp,
		}

		forwardMessageBytes, err := json.Marshal(forwardMessage)
		if err != nil {
			log.Println("Marshal", err)
		}

		clientsMu.RLock()
		recipientConn, recipientExists := clients[receivedMessage.To]
		senderConn, senderExists := clients[receivedMessage.From]
		clientsMu.RUnlock()
		// TODO: should probably store the message in the database
		// before sending it to the users
		if senderExists {
			senderConn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := senderConn.WriteMessage(messageType, forwardMessageBytes); err != nil {
				log.Println("Error writing message to echo connection:", err)
				closeConnection(senderConn)
				clientsMu.Lock()
				delete(clients, receivedMessage.From)
				clientsMu.Unlock()
			}
		} else {
			log.Println(receivedMessage.From, "is not logged in")
		}
		if recipientExists {
			recipientConn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := recipientConn.WriteMessage(messageType, forwardMessageBytes); err != nil {
				log.Println("Error writng message to recipient connection:", err)
				closeConnection(recipientConn)
				clientsMu.Lock()
				delete(clients, receivedMessage.To)
				clientsMu.Unlock()
			}
		} else {
			log.Println(receivedMessage.To, "is not logged in")
		}
		if err := db.AddMessageToConversation(forwardMessage); err != nil {
			utils.HandleDatabaseError(err)
		}
	}
}
