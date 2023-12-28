package main

import (
	"context"
	"encoding/json"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"log"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

//	type UserConnection struct {
//		Username    string
//		WebSocket *websocket.Conn
//	}
type Message struct {
	ID        string    `bson:"id"`
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

// var userConnections []UserConnection
var clients = make(map[string]*websocket.Conn, 0)
var dbname = "argodb"
var dbclient *mongo.Client

const timeoutDuration = 5

// ***********************************************
func main() {
	log.Println("connecting to database")
	connectionString := "mongodb://localhost:27017"
	dbclient, err := mongo.Connect(context.TODO(), options.Client().ApplyURI(connectionString))
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

	// conversations, err := getUserConversations(dbclient, "deepwater")
	// log.Println(conversations)
	port := ":3001"
	http.HandleFunc("/ws", handler)
	http.HandleFunc("/api/conversations", conversationsHandler)
	log.Println("server listening on port", port)
	log.Fatal(http.ListenAndServe(port, nil))
}

// ***********************************************
func conversationsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
	w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	username := r.URL.Query().Get("user")
	log.Println("user", username, "requested conversations")
	if username == "" {
		http.Error(w, "username is required", http.StatusBadRequest)
		return
	}

	conversations, err := getUserConversations(dbclient, "deepwater")
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	log.Println("sending conversations:", conversations)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(conversations)
}

// ***********************************************
func handler(w http.ResponseWriter, r *http.Request) {
	log.Println("received request from", r.URL.Query().Get("username"), r.Host)

	var upgrader = websocket.Upgrader{
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
	username := r.URL.Query().Get("username")
	clients[username] = conn
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
		log.Println(string(p))
		var msg Message
		if err := json.Unmarshal(p, &msg); err != nil {
			log.Println("Unmarshal", err)
		}
		log.Println(msg)
		// response := fmt.Sprintf("hello %v", msg.From)
		resp := Message{
			ID:      uuid.NewString(),
			To:      msg.To,
			From:    msg.From,
			Content: msg.Content,
		}
		respBytes, err := json.Marshal(resp)
		if err != nil {
			log.Println("Marshal", err)
		}
		// clients[username].WriteMessage(messageType, respBytes)
		clients[msg.To].WriteMessage(messageType, respBytes)
	}
	closeConnection(conn)
}

// ***********************************************
func closeConnection(conn *websocket.Conn) {
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
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var conversations []Conversation
	collection := client.Database(dbname).Collection("conversations")

	cursor, err := collection.Find(ctx, bson.M{})
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
func getUserConversations(client *mongo.Client, username string) ([]Conversation, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5000*time.Second)
	defer cancel()

	var conversations []Conversation
	log.Println("requesting from ", dbname)
	collection := client.Database(dbname).Collection("conversations")
	log.Println(collection)

	cursor, err := collection.Find(ctx, bson.M{"participants": username})
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
