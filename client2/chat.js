const conversationList = document.getElementById('conversationList');
const messageList = document.getElementById('messageList');
const username = localStorage.getItem('username');

const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');

const newConversationInput = document.getElementById('newConversationInput');
const newConversationButton = document.getElementById('newConversationButton');

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
  newConversationButton.addEventListener('click', function() {
    const participant = newConversationInput.value.trim();
    if (participant !== '') {
      createNewConversation(participant);
      newConversationInput.value = '';
    }
  });
}
function createNewConversation(partner) {
  const token = localStorage.getItem('token');
  if (!token) {
    console.error('No token found');
  }
  fetch(`http://localhost:3001/api/create-conversation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ partner: partner}),
  })
    .then(response => response.json())
    .then(data => {
      if (!conversations) {
        conversations = [];
      }
      conversations.push(data);
      renderConversationList();
    })
    .catch();
}
function sendMessage(message) {
  console.log('in sendMessage');
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
  var content2msg = message + " encrypted";
  const chatMessage = {
    To: currentConversation.Participants.user1.Partner,
    ConvID: currentConversationId,
    From: username,
    content: message,
    content2: content2msg 
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
        // TODO: need to change this since conversations have changed
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
  console.log('in handleIncomingMessage');
  console.log('message is ');
  console.log(message);
  // TODO: message currently doesn't have a type field I think
  wsStatus();
  const currentConversation = conversations.find(
    conversation => conversation.ID === currentConversationId
  );
  // test
  if (currentConversation) {
    console.log('current conversation is');
    console.log(currentConversation);
    currentConversation.Participants.user1.Messages.push(message);
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
    for (const cidx in conversations) {
      const listItem = document.createElement('li');
      
      const partner = conversations[cidx].Participants.user1.Partner
      listItem.textContent = partner;
      listItem.addEventListener('click', () => {
        currentConversationId = conversations[cidx].ID;
        updateMessageList(conversations[cidx]);
      });
      conversationList.appendChild(listItem);
    }
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
    if (!conversation.Participants.user1.Messages) {
      conversation.Participants.username.Messages = [];
    }
    conversation.Participants.user1.Messages.forEach(message => {
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
function updateActiveConversation(conversation) {
  // Clear the existing message list
  messageList.innerHTML = '';

  // Update the message list with the messages of the selected conversation
  updateMessageList(conversation.Messages);

  // Clear the message input
  messageInput.value = '';
}
function renderConversationList() {
  conversationList.innerHTML = '';
  for (const cidx in conversations) {
    const listItem = document.createElement('li');
    //test    
    const partner = conversations[cidx].Participants.user1.Partner
    listItem.textContent = partner;
    listItem.addEventListener('click', () => {
      currentConversationId = conversations[cidx].ID;
      updateMessageList(conversations[cidx]);
    });
    conversationList.appendChild(listItem);
  }
}
