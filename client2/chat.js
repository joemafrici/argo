const conversationList = document.getElementById('conversationList');
const messageList = document.getElementById('messageList');
const username = localStorage.getItem('username');
let socket;
let conversations = [];
let currentConversationId = null;
function wsStatus() {
  if (socket.readyState !== WebSocket.OPEN) {
    console.error('socket is not ready');
  }
}

function setupEventListeners() {
  const messageInput = document.getElementById('messageInput');
  const sendButton = document.getElementById('sendButton');
  sendButton.addEventListener('click', function() {
    const message = messageInput.value.trim();
    if (message !== '') {
      sendMessage(message);
      messageInput.value = '';
    }
  });
  messageInput.addEventListener('keydown', function(event) {
    if (event.key === 'enter') {
      const message = messageInput.value.trim();
      if (message != '') {
        sendMessage(message);
        messageInput.value = '';
      }
    }
  });
}
function sendMessage(message) {
  wsStatus();
  const currentConversation = conversations.find(
    conversation => conversation.ID === currentConversationId
  );
  var partner;
  if (currentConversation.Participants[0] === username) {
    partner = currentConversation.Participants[1];
  } else {
    partner = currentConversation.Participants[0];
  }
  const chatMessage = {
    To: partner,
    ConvID: currentConversationId,
    From: username,
    content: message
  };
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(chatMessage));
  } else {
    console.error(socket.readyState);
  }
  wsStatus();
}


document.addEventListener('DOMContentLoaded', function() {
  fetchConversations();
  initializeChat();
});

function initializeChat() {

  const token = localStorage.getItem('token');
  socket = new WebSocket('ws://localhost:3001/ws');
  socket.onopen = () => {
    if (token) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'authenticate', token }));
      } else {
        console.error('error socket not in ready state');
      }
    } else {
      console.error('Token is null during WebSocket connection');
      socket.close();
      //handleLogout();
    }
    socket.onmessage = async (event) => {
      const data = JSON.parse(event.data)
      if (data.type && data.type === 'ping') {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'pong' }));
        } else {
          console.error('error socket not in ready state');
        }
      } else if (data.type && data.type === 'conversationUpdate') {
        // this was for delete I think
        console.log('received conversation update');
        console.log(data.conversation);
        onConversationUpdate(data.conversation);
      } else {
        handleIncomingMessage(data);
      }
    };
    socket.onclose = event => {
      console.log('WebSocket closed', event);
    }
    socket.onerror = event => {
      console.error('WebSocket error', event);
      socket.close();
    }
  }

  //fetchConversations();
  setupEventListeners();
}
function handleIncomingMessage(message) {
  // TODO: message currently doesn't have a type field I think
  wsStatus();
  const currentConversation = conversations.find(
    conversation => conversation.ID === currentConversationId
  );
  if (currentConversation) {
    currentConversation.Messages.push(message);
    updateMessageList(currentConversation);
  }
  //addMessageToList(message);
  wsStatus();
}
function addMessageToList(message) {
  wsStatus();
  const messageElement = document.createElement('div');
  messageElement.classList.add('message');
  messageElement.dataset.messageID = message.ID;

  const senderElement = document.createElement('span');
  senderElement.classList.add('sender');
  senderElement.textContent = message.From + ': ';

  const contentElement = document.createElement('span');
  contentElement.classList.add('content');
  contentElement.textContent = message.Content;

  const deleteButton = document.createElement('button');
  deleteButton.classList.add('delete-button');
  deleteButton.textContent = 'Delete';
  deleteButton.addEventListener('click', function() {
    deleteMessage(message.ID);
  });
  
  messageElement.appendChild(senderElement);
  messageElement.appendChild(contentElement);
  messageElement.appendChild(deleteButton);
  messageList.appendChild(messageElement);

  messageList.scrollTop = messageList.scrollHeight;
  wsStatus();
}
function deleteMessage(messageID) {
  console.log(`deleting message ${messageID}`);
  wsStatus();
  const token = localStorage.getItem('token');
  if (!token) {
    console.error('No token found');
  }
  fetch('http://localhost:3001/api/delete-message', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ currentConversationId, messageID }),
  })
  .then(response => {
    if (response.ok) {
    } else {
        console.error('Failed to delete message:', response.status);
    }
  })
  .catch(error => {
      console.error('Error deleting message: ', error);
  });
  wsStatus();
}
const fetchConversations = async () => {
  const token = localStorage.getItem('token');
  try {
    if (!token) {
      throw new Error('No token found');
    }
    const response = await fetch('http://localhost:3001/api/conversations', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    conversations = (await response.json());
    conversationList.innerHTML = '';
    // populate list
    conversations.forEach(conversation => {
      const listItem = document.createElement('li');
      var from = conversation.Messages[0].From;
      var to = conversation.Messages[0].To;
      var username = localStorage.getItem('username');
      if (from === username) {
        listItem.textContent = to;
      } else if (to === username) {
        listItem.textContent = from;
      }

      listItem.addEventListener('click', () => {
        currentConversationId = conversation.ID;
        updateMessageList(conversation);
      });
      conversationList.appendChild(listItem);
    });

  } catch (error) {
    console.error('Failed to fetch conversations', error);
    return null;
  }
  wsStatus();
}
function updateMessageList(conversation) {
  wsStatus();
  // Clear the existing message list
  messageList.innerHTML = '';
  if (conversation) {
    // Populate the message list with the messages of the current conversation
    conversation.Messages.forEach(message => {
      addMessageToList(message);
    });
  }
  wsStatus();
}
function onConversationUpdate(updatedConversation) {
  wsStatus();
  const conversationIndex = conversations.findIndex(
    conversation => conversation.ID === updatedConversation.ID
  );
  if (conversationIndex !== -1) {
    conversations[conversationIndex].Messages = updatedConversation.Messages;
    if (currentConversationId === updatedConversation.ID) {
      updateMessageList(updatedConversation);
    }
  }
  wsStatus();
}
