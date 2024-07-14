package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"sync"

	"github.com/golang-jwt/jwt"
	"github.com/joemafrici/argo/utils"

	"github.com/gorilla/websocket"
)

var (
	// userConnections []UserConnection
	clientsMu = &sync.RWMutex{}
	clients   = make(map[string]*websocket.Conn, 0)
	dbname    = "argodb"
	db        *DBClient
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
	//cs := "mongodb://localhost:27017"
	mongoURI := os.Getenv("MONGODB_URI")
	if mongoURI == "" {
		mongoURI = "mongodb://mongo:27017/argodb"
	}
	var err error
	db, err = NewDBClient(mongoURI, dbname)
	if err != nil {
		log.Fatal("Failed to connect to database", err)
	}
	defer db.Close()

	mux := http.NewServeMux()
	port := "0.0.0.0:3001"
	mux.Handle("/ws", loggingMiddleware(http.HandlerFunc(HandleWebSocket)))
	mux.Handle("/api/register", loggingMiddleware(http.HandlerFunc(HandleRegister)))
	mux.Handle("/api/login", loggingMiddleware(http.HandlerFunc(HandleLogin)))
	//mux.Handle("/api/logout", loggingMiddleware(http.HandlerFunc(HandleLogout)))
	mux.Handle("/api/conversations", loggingMiddleware(protectedEndpoint(HandleGetUserConversations)))
	//mux.Handle("/api/conversation", loggingMiddleware(protectedEndpoint(HandleGetUserConversation)))
	mux.Handle("/api/create-conversation", loggingMiddleware(protectedEndpoint(HandleCreateConversation)))
	mux.Handle("/api/symmetric-key", loggingMiddleware(protectedEndpoint(HandleSymmetricKey)))
	mux.Handle("/api/delete-message", loggingMiddleware(protectedEndpoint(HandleDeleteMessage)))
	mux.Handle("/api/keys", loggingMiddleware(protectedEndpoint(HandleSendKeys)))
	mux.Handle("/api/salt", loggingMiddleware(protectedEndpoint(HandleSendSalt)))
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
func closeConnection(conn *websocket.Conn) {
	message := websocket.FormatCloseMessage(websocket.CloseNormalClosure, "")
	conn.WriteMessage(websocket.CloseMessage, message)

	err := conn.Close()
	if err != nil {
		log.Println("error closing WebSocket connection", err)
	}
}
