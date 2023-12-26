package main

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
	"github.com/google/uuid"
)

// type UserConnection struct {
// 	Username    string
// 	WebSocket *websocket.Conn
// }
type Message struct {
	Id string `json:"id"`
	To string `json:"to"`
	From string `json:"from"`
	Content string `json:"content"`
}

//var userConnections []UserConnection
var clients = make(map[string]*websocket.Conn, 0)

const timeoutDuration = 5

// ***********************************************
func main() {
	port := ":3001"
	http.HandleFunc("/ws", handler)
	log.Println("server listening on port", port)
	log.Fatal(http.ListenAndServe(port, nil))
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
			Id: uuid.NewString(),
			To: msg.To,
			From: msg.From,
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
