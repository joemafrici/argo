package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/golang-jwt/jwt"
	"github.com/joemafrici/argo/utils"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/crypto/bcrypt"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

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

var (
	// userConnections []UserConnection
	clientsMu = &sync.RWMutex{}
	clients = make(map[string]*websocket.Conn, 0)
	dbname = "argodb"
	dbclient *mongo.Client
)
const timeoutDuration = 5

// ***********************************************
func main() {
	errSecret := utils.LoadSecret()
	if errSecret != nil {
		log.Fatal(errSecret)
	}

	log.Println("connecting to database")
	cs := "mongodb://localhost:27017"
	var err error
	dbclient, err = mongo.Connect(context.TODO(), options.Client().ApplyURI(cs))
	if err != nil {
		log.Fatal("mongo.Connect", err)
	}

	err = dbclient.Ping(context.TODO(), nil)
	if err != nil {
		log.Fatal("client.Ping", err)
	}

	defer func() {
		if err = dbclient.Disconnect(context.TODO()); err != nil {
			log.Fatal("client.Disconnect", err)
		}
	}()

	mux := http.NewServeMux()
	port := ":3001"
	mux.Handle("/ws", loggingMiddleware(http.HandlerFunc(handleWebSocket)))
	mux.Handle("/api/register", loggingMiddleware(http.HandlerFunc(handleRegister)))
	mux.Handle("/api/login", loggingMiddleware(http.HandlerFunc(handleLogin)))
	mux.Handle("/api/conversations", loggingMiddleware(protectedEndpoint(handleGetUserConversations)))
	mux.Handle("/api/create-conversation", loggingMiddleware(protectedEndpoint(handleCreateConversation)))
	handler := corsMiddleware(mux)
	log.Println("server listening on port", port)
	log.Fatal(http.ListenAndServe(port, handler))
}
// ***********************************************
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		//w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
// ***********************************************
func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("Received request: %s %s", r.Method, r.URL)
		
		next.ServeHTTP(w, r)
	})

}
// ***********************************************
func protectedEndpoint(handler http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		log.Println("in protectedEndpoint")
		token, err := utils.ValidateToken(r)
		if err != nil {
			log.Printf("Token validation error: %v", err)
			http.Error(w, err.Error(), http.StatusUnauthorized)
			return
		}
		if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
			ctx := context.WithValue(r.Context(), "username", claims["username"])
			handler(w, r.WithContext(ctx))
		} else {
			http.Error(w, "Invalid token", http.StatusUnauthorized)
		}
	}
}
// ***********************************************
func handleRegister(w http.ResponseWriter, r *http.Request) {
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
func handleLogin(w http.ResponseWriter, r *http.Request) {
	log.Println("in handleLogin")

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

	json.NewEncoder(w).Encode(map[string]string{"token": tokenString})
}
// ***********************************************
func handleCreateConversation(w http.ResponseWriter, r *http.Request) {
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
func handleGetUserConversations(w http.ResponseWriter, r *http.Request) {
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
func handleWebSocket(w http.ResponseWriter, r *http.Request) {
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
	//defer conn.Close()
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
	
	go handleConnection(username, conn)
}
// ***********************************************
func handleConnection(username string, conn *websocket.Conn) {
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
// ***********************************************
func addMessageToConversation(message Message) error {
	log.Println("in addMessageToConversation")

	coll := dbclient.Database(dbname).Collection("conversations")
	filter := bson.M{"id": message.ConvID}
	update := bson.M{
		"$push": bson.M{
			"messages": message,
		},
	}

	res, err := coll.UpdateOne(context.TODO(), filter, update)
	log.Println("matched:", res.MatchedCount)
	return err
}
// ***********************************************
func closeConnection(conn *websocket.Conn) {
	log.Println("in closeConnection")
	message := websocket.FormatCloseMessage(websocket.CloseNormalClosure, "")
	//conn.SetWriteDeadline(time.Now().Add(timeoutDuration))
	conn.WriteMessage(websocket.CloseMessage, message)

	//conn.SetReadDeadline(time.Now().Add(timeoutDuration))
	// if _, _, err := conn.NextReader(); err != nil {
	// 	log.Println("error waiting for client close response:", err)
	// }
}

// ***********************************************
func getAllConversations(client *mongo.Client) ([]Conversation, error) {
	log.Println("in getAllConversations")
	ctx := context.TODO()	

	var conversations []Conversation
	collection := client.Database(dbname).Collection("conversations")
	query := bson.M{}
	cursor, err := collection.Find(ctx, query)
	if err != nil {
		return nil, err
	}

	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var conversation Conversation
		if err := cursor.Decode(&conversation); err != nil {
			return nil, err
		}
		conversations = append(conversations, conversation)
	}

	if err := cursor.Err(); err != nil {
		return nil, err
	}
	return conversations, nil
}

// ***********************************************
func getUserConversations(username string) ([]Conversation, error) {
	log.Println("in getUserConversations")
	ctx := context.TODO()

	collection := dbclient.Database(dbname).Collection("conversations")
	query := bson.M{"participants": username}
	cursor, err := collection.Find(ctx, query)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var conversations []Conversation
	for cursor.Next(ctx) {
		var conversation Conversation
		if err := cursor.Decode(&conversation); err != nil {
			return nil, err
		}
		conversations = append(conversations, conversation)
	}
	if err := cursor.Err(); err != nil {
		return nil, err
	}
	return conversations, nil
}
