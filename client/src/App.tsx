import { useState, useEffect } from 'react'
import Login from './Login'
import './App.css'

function Message({ content }: { content: string }) {
  return (
    <li>{content}</li>
  );
}
type conversation = {
  id: string;
  content: string;
}

const Chat: React.FC = () => {
  const chatHistory: conversation[] = [
    {id: '1', content: 'hello socrates'},
    {id: '2', content: 'hello deepwater'},
    {id: '3', content: 'shall we go down to the Piraeus'},
    {id: '4', content: 'yes... lead the way'},
  ];
  const messages = chatHistory.map(message => 
    <li key={message.id}>
      <p>{message.content}</p>
    </li>
  );

  return(
    <section>
      <h1>Conversation</h1>
      <ul>{messages}</ul>
    </section>
  );
}

function App() {
  const [username, setUsername] = useState('');
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [renderLogin, setRenderLogin] = useState(true);

  const handleLogin = (username: string) => {
    setUsername(username);
    setRenderLogin(false);
  }

  useEffect(() => {
    if (username) {
      const socket = new WebSocket(
        `ws://localhost:3001/ws?username=${encodeURIComponent(username)}`,
      );
      socket.onopen = () => console.log("onopen called");
      socket.onclose = (event: CloseEvent) => {
        if (event.wasClean) {
          console.log(
            `connection closed cleanly... code=${event.code}, reason=${event.reason}`,
          );
        } else {
          console.log("connection died");
        }
      };
      socket.onmessage = (event: MessageEvent) => {
        console.log(event.data);
        //setResponses((prev) => [...prev, event.data]);
      };
      socket.onerror = (event: Event) => {
        console.error("Websocket Error:", event);
      };

      setSocket(socket);
    }

    return () => {
      socket?.close();
      //setRenderLogin(true);
    }
  }, [username]);

  return (
    <>
      { renderLogin && <Login onLogin={handleLogin}/> }
      <Chat />
      <ul>
        <Message content='hello socrates' />
        <Message content='hello deepwater' />
      </ul>
    </>
  )
}

export default App
