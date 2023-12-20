package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

type UserConnection struct {
	UserID    string
	WebSocket *websocket.Conn
}

var userConnections []UserConnection

const timeoutDuration = 5

// ***********************************************
func main() {
	port := ":3000"
	http.HandleFunc("/", handler)
	log.Println("server listening on port", port)
	log.Fatal(http.ListenAndServe(port, nil))
}

// ***********************************************
func handler(w http.ResponseWriter, r *http.Request) {
	log.Println("received request from", r.Host)

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
	var usrConn UserConnection = UserConnection{
		UserID:    "user1",
		WebSocket: conn,
	}
	userConnections = append(userConnections, usrConn)
	for {
		messageType, p, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsCloseError(err, websocket.CloseNormalClosure, websocket.CloseGoingAway) {
				log.Println("connection closed:", err)
				break
			} else {
				log.Println(err)
			}
			return
		}
		log.Println(string(p))
		response := fmt.Sprintf("hello there %v", len(userConnections))
		for _, wsconn := range userConnections {
			wsconn.WebSocket.WriteMessage(messageType, []byte(response))
		}
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
