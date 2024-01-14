package main

import (
	"context"
	"log"
	"net/http"
	"sync"

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
	clients = make(map[string]*websocket.Conn, 0)
	dbname = "argodb"
	dbclient *mongo.Client
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
