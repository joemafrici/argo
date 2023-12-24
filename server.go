package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

// type UserConnection struct {
// 	Username    string
// 	WebSocket *websocket.Conn
// }
type Message struct {
	Recipient string `json:"recipient"`
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

		var msg Message
		if err := json.Unmarshal(p, &msg); err != nil {
			log.Println("Unmarshal", err)
		}
		response := fmt.Sprintf("message sent to %v", msg.Recipient)
		clients[username].WriteMessage(messageType, []byte(response))
		clients[msg.Recipient].WriteMessage(messageType, []byte(msg.Content))
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
