package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

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

type Message struct {
	ID        string    `bson:"id"`
	ConvID string `bson:"convid"`
	To        string    `bson:"to"`
	From      string    `bson:"from"`
	Content   string    `bson:"content"`
	Timestamp time.Time `bson:"timestamp"`
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

	port := ":3001"
	http.HandleFunc("/ws", handleWebSocket)
	http.HandleFunc("/api/conversations", handleGetUserConversations)
	log.Println("server listening on port", port)
	log.Fatal(http.ListenAndServe(port, nil))
}

// ***********************************************
func handleGetUserConversations(w http.ResponseWriter, r *http.Request) {
	log.Println("in handleGetUserConversations")
	if dbclient == nil {
		http.Error(w, "Unable to retrieve conversations", http.StatusInternalServerError)
		log.Println("handleGetUserConversations client is nil")
		return
	}
	w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
	w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	username := r.URL.Query().Get("user")
	if username == "" {
		http.Error(w, "username is required", http.StatusBadRequest)
		return
	}
	conversations, err := getUserConversations("deepwater")
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(conversations)
}

// ***********************************************
func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	log.Println("in handleWebSocket")

	username := r.URL.Query().Get("username")
	if username == "" {
		http.Error(w, "username is required", http.StatusBadRequest)
		return
	}
	
	clientsMu.RLock()
	conn, ok := clients[username]
	clientsMu.RUnlock()
	if ok {
		log.Println("WebSocket connection already exists for", username)
		log.Println("closing old connection... upgrading new connection")
		closeConnection(conn)
	}

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

	clientsMu.Lock()
	log.Println("adding", username, "to clients")
	clients[username] = conn
	clientsMu.Unlock()
	
	go handleConnection(username, conn)
}
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

		var msg Message
		if err := json.Unmarshal(p, &msg); err != nil {
			log.Println("Unmarshal", err)
		}
		resp := Message{
			ID:      uuid.NewString(),
			ConvID: msg.ConvID,
			To:      msg.To,
			From:    msg.From,
			Content: msg.Content,
			Timestamp: msg.Timestamp,
		}
		respBytes, err := json.Marshal(resp)
		if err != nil {
			log.Println("Marshal", err)
		}

		clientsMu.RLock()
		recipientConn, recipientExists := clients[msg.To]
		clientsMu.RUnlock()
		if recipientExists {
			recipientConn.WriteMessage(messageType, respBytes)
		} else {
			log.Println(msg.To, "is not logged in")
		}
		if err := addMessageToConversation(resp); err != nil {
			log.Println("addMessageToConversation", err)	
		}
	}
}
// ***********************************************
func addMessageToConversation(message Message) error {
	log.Println("in addMessageToConversation")

	coll := dbclient.Database(dbname).Collection("conversations")
	log.Println(coll)
	log.Println(message)
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
