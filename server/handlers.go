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
func HandleRegister(w http.ResponseWriter, r *http.Request) {
	log.Println("in handleRegister")

	var newUser User
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
	newUser.Password = string(hashedPassword)

	_, err = dbclient.Database(dbname).Collection("users").InsertOne(context.TODO(), newUser)
	if err != nil {
		http.Error(w, "Failed to create new user", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}
// ***********************************************
func HandleLogin(w http.ResponseWriter, r *http.Request) {
	log.Println("in handleLogin")

	var loginUser User	
	if err := json.NewDecoder(r.Body).Decode(&loginUser); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	log.Println("username: ", loginUser.Username)
	log.Println("password: ", loginUser.Password)
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

	json.NewEncoder(w).Encode(map[string]string{"token": tokenString})
}
// ***********************************************
func HandleCreateConversation(w http.ResponseWriter, r *http.Request) {
	log.Println("in handleCreateConversation")

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
		ID: uuid.NewString(),
		Participants: participants,
		Messages: []Message{},
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
func HandleGetUserConversations(w http.ResponseWriter, r *http.Request) {
	log.Println("in handleGetUserConversations")

	if dbclient == nil {
		http.Error(w, "Unable to retrieve conversations", http.StatusInternalServerError)
		log.Println("handleGetUserConversations client is nil")
		return
	}

	username, ok := r.Context().Value("username").(string)
	log.Println("Request username", username)
	if !ok {
		http.Error(w, "Invalid user context", http.StatusInternalServerError)
		return
	}
	if username == "" {
		http.Error(w, "username is required", http.StatusBadRequest)
		return
	}
	conversations, err := getUserConversations(username)
	log.Println(conversations)
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
	log.Println("in handleWebSocket")

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

	log.Println("ready to receive auth message")
	_, message, err := conn.ReadMessage()
	if err != nil {
		log.Println("Error reading WebSocket message", err)
		return
	}
	log.Println("received auth message")

	var authMessage struct {
		Token string `json:"token"`
	}
	if err := json.Unmarshal(message, &authMessage); err != nil {
		log.Println("Invalid authentication message")
		conn.WriteMessage(websocket.CloseMessage, []byte("Invalid authentication"))
		return
	}
	log.Println(authMessage.Token)

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
	log.Println("in handleConnection")
	defer closeConnection(conn)
	defer func() {
		clientsMu.Lock()
		delete(clients, username)
		clientsMu.Unlock()
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
			return
		}

		var echo Message
		if err := json.Unmarshal(p, &echo); err != nil {
			log.Println("Unmarshal", err)
		}

		if echo.Timestamp == nil {
			now := time.Now()
			echo.Timestamp = &now
		}
		if echo.ID == "" {
			echo.ID = uuid.NewString()
		}

		forward := Message{
			ID:      uuid.NewString(),
			ConvID: echo.ConvID,
			To:      echo.To,
			From:    echo.From,
			Content: echo.Content,
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
			echoConn.WriteMessage(messageType, echoBytes)
		} else {
			log.Println(echo.From, "is not logged in")
		}
		if recipientExists {
			recipientConn.WriteMessage(messageType, forwardBytes)
		} else {
			log.Println(echo.To, "is not logged in")
		}
		if err := addMessageToConversation(forward); err != nil {
			log.Println("addMessageToConversation", err)	
		}
	}
}
