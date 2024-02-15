package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/golang-jwt/jwt"
	"github.com/joemafrici/argo/utils"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/gorilla/websocket"
)

var (
	// userConnections []UserConnection
	clientsMu = &sync.RWMutex{}
	clients   = make(map[string]*websocket.Conn, 0)
	dbname    = "argodb"
	dbclient  *mongo.Client
)

const (
	timeoutDuration = 5
)

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
	mux.Handle("/ws", loggingMiddleware(http.HandlerFunc(HandleWebSocket)))
	mux.Handle("/api/register", loggingMiddleware(http.HandlerFunc(HandleRegister)))
	mux.Handle("/api/login", loggingMiddleware(http.HandlerFunc(HandleLogin)))
	//mux.Handle("/api/logout", loggingMiddleware(http.HandlerFunc(HandleLogout)))
	mux.Handle("/api/conversations", loggingMiddleware(protectedEndpoint(HandleGetUserConversations)))
	//mux.Handle("/api/conversation", loggingMiddleware(protectedEndpoint(HandleGetUserConversation)))
	mux.Handle("/api/create-conversation", loggingMiddleware(protectedEndpoint(HandleCreateConversation)))
	mux.Handle("/api/delete-message", loggingMiddleware(protectedEndpoint(HandleDeleteMessage)))
	mux.Handle("/api/keys", loggingMiddleware(protectedEndpoint(HandleSendKeys)))
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
func addMessageToConversation(message Message) error {
	log.Println("in addMessageToConversation")

	coll := dbclient.Database(dbname).Collection("conversations")
	filter := bson.M{"id": message.ConvID}
	update := bson.M{
		"$push": bson.M{
			"messages": message,
		},
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	res, err := coll.UpdateOne(ctx, filter, update)
	if err != nil {
		return fmt.Errorf("error updating conversation: %w", err)
	}
	if res.MatchedCount == 0 {
		return fmt.Errorf("no conversation found with id %s", message.ConvID)
	}
	return nil
}

// ***********************************************
func closeConnection(conn *websocket.Conn) {
	log.Println("in closeConnection")
	message := websocket.FormatCloseMessage(websocket.CloseNormalClosure, "")
	conn.WriteMessage(websocket.CloseMessage, message)

	err := conn.Close()
	if err != nil {
		log.Println("error closing WebSocket connection", err)
	}
	clientsMu.RLock()
	log.Println(clients)
	clientsMu.RUnlock()
}

// ***********************************************
func getUserConversation(username string, id string) (Conversation, error) {
	log.Println("in getUserConversation")

	var conversation Conversation
	collection := dbclient.Database(dbname).Collection("conversations")
	filter := bson.M{"id": id}
	err := collection.FindOne(context.TODO(), filter).Decode(&conversation)
	if err != nil {
		return Conversation{}, err
	}

	return conversation, nil
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
