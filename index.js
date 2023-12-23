function sendMessage() {
	const message = document.querySelector("#messageInput").value;
	socket.send(message);
}
function closeConnection() {
	socket.close(1000, "user closed connection");
}
function connect() {
	const username = document.querySelector("#username").value;
	socket = new WebSocket(
		`ws://localhost:3000/ws?username=${encodeURIComponent(username)}`,
	);
	socket.onopen = function () {
		console.log("onopen called");
	};
	socket.onclose = function (event) {
		if (event.wasClean) {
			console.log(
				`connection closed cleanly... code=${event.code}, reason=${event.reason}`,
			);
		} else {
			console.log("connection died");
		}
	};
	socket.onmessage = function (event) {
		console.log(event.data);
		const p = document.createElement("p");
		const node = document.createTextNode(event.data);
		p.appendChild(node);
		const responsesElement = document.querySelector("#responses");
		responsesElement.appendChild(p);
	};
	socket.onerror = function (event) {
		console.error("websocket error:", event);
	};
}
let socket;
const btn = document.querySelector("#sendMessage");
btn.addEventListener("click", sendMessage);
const closeBtn = document.querySelector("#closeConnection");
closeBtn.addEventListener("click", closeConnection);
const connectBtn = document.querySelector("#connect");
connectBtn.addEventListener("click", connect);
