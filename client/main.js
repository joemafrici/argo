import { createLoginHandler, createRegisterHandler } from './login.js';
import { initChat } from './chat.js';
const app = document.getElementById('app');

const router = new Navigo('/');
router
  .on('/', async () => {
    console.log('rendering login page');
    app.innerHTML = `
      <h2>Login</h2>
      <form id="loginForm">
        <input type="text" id="username" placeholder="Username" required><br>
        <input type="password" id="password" placeholder="Password" required><br>
        <button type="submit">Login</button>
      </form>

      <h2>Register</h2>
      <form id="registerForm">
        <input type="text" id="newUsername" placeholder="Username" required><br>
        <input type="password" id="newPassword" placeholder="Password" required><br>
        <button type="submit">Register</button>
      </form>
    `;
    console.log('setting up event listeners');
    const handleLogin = await createLoginHandler(router);
    const handleRegister = await createRegisterHandler(router);

    console.log('setting up event listeners');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        console.log('Login form submitted');
        handleLogin(e);
      });
    } else {
      console.error("Login form not found");
    }

    if (registerForm) {
      registerForm.addEventListener('submit', (e) => {
        console.log('Register form submitted');
        handleRegister(e);
      });
    } else {
      console.error("Register form not found");
    }
  })
  .on('/chat', () => {
    console.log('rendering chat page');
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('no token found, redirecting to login');
      router.navigate('/');
      return
    }
    app.innerHTML = `
      <div class="chat-container">
        <div class="conversation-list">
          <h2>Conversations</h2>
          <ul id="conversationList">
            <!-- Conversation list items will be dynamically populated here -->
          </ul>
          <div class="new-conversation">
            <input type="text" id="newConversationInput" placeholder="Enter username...">
            <button id="newConversationButton">New Conversation</button>
          </div>
        </div>
        <div class="active-conversation">
          <div id="messageList" class="message-list">
            <!-- Message elements will be dynamically populated here -->
          </div>
          <div class="message-input">
            <input type="text" id="messageInput" placeholder="Type your message...">
            <button id="sendButton">Send</button>
          </div>
        </div>
      </div>
      <div class="logout">
        <button id="logoutButton">Logout</button>
      </div>
    `;
    initChat(router);
  })

console.log('setting up router');
router.resolve();
