import { Conversation } from './conversation.js';
import * as encrypt from './encrypt.js';

const conversationList = document.getElementById('conversationList');
const messageList = document.getElementById('messageList');
const messageInput = document.getElementById('messageInput');
const newConversationInput = document.getElementById('newConversationInput');
const newConversationButton = document.getElementById('newConversationButton');
const logoutButton = document.getElementById('logoutButton');

const username = localStorage.getItem('username');

let socket;
let conversations = new Map();
let currentConversationId = null;

// ***********************************************
function initializeWebSocket() {
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
    }
  };
  socket.onmessage = async (event) => {
    const data = JSON.parse(event.data)
    if (data.type && data.type === 'ping') {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'pong' }));
      } else {
        console.error('error socket not in ready state');
      }
    } else if (data.type && data.type === 'conversationUpdate') {
      // The server sends a conversation update when a partner deletes a message
      handleConversationUpdate(data.conversation);
    } else {
      await handleIncomingMessage(data);
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
// ***********************************************
async function fetchConversations() {
  try {
    const token = localStorage.getItem('token');
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

    let fetchedConversations = await response.json();
    if (!fetchedConversations) {
      console.log('no conversations to fetch');
      return;
    }

    for (let convData of fetchedConversations) {
      let conversation = await Conversation.fromExisting(convData);

      //await conversation.initializeSymmetricKey();
      conversations.set(convData.ID, conversation);
    }

    renderConversationList();
  } catch (err) {
    console.error('Failed to fetch conversations', err);
  }
}
// ***********************************************
function switchConversation(conversationId) {
  const conversation = conversations.get(conversationId);
  if (conversation) {
    currentConversationId = conversationId;
    conversation.renderMessages(messageList);
  }
}
// ***********************************************
function updateActiveConversation(conversation) {
  // Clear the existing message list
  messageList.innerHTML = '';

  // Update the message list with the messages of the selected conversation
  updateMessageList(conversation.Messages);

  // Clear the message input
  messageInput.value = '';
}

// ***********************************************
// Event Listeners
// ***********************************************

// ***********************************************
document.addEventListener('DOMContentLoaded', function() {
  fetchConversations();
  initializeWebSocket();
  setupEventListeners();
});
// ***********************************************
function setupEventListeners() {
  const sendButton = document.getElementById('sendButton');
  sendButton.addEventListener('click', handleSendMessage);

  messageInput.addEventListener('keydown', handleMessageInputKeyDown);
  newConversationButton.addEventListener('click', handleNewConversation);
  logoutButton.addEventListener('click', handleLogoutPress);
}

// ***********************************************
// Render UI
// ***********************************************

// ***********************************************
function renderConversationList() {
  conversationList.innerHTML = '';
  const currentUser = localStorage.getItem('username');

  conversations.forEach((conversation, conversationId) => {
    const listItem = document.createElement('li');
    const partnerUsername = Object.keys(conversation.participants).find(username => username !== currentUser);
    if (partnerUsername) {
      listItem.textContent = partnerUsername;
      listItem.addEventListener('click', async () => {
        currentConversationId = conversationId;
        conversation.renderMessages(messageList);
      });
      conversationList.appendChild(listItem);
    } else {
      console.error('Could not find partner in conversation:', conversation);
    }
  });
}

// ***********************************************
// Handlers
// ***********************************************

// ***********************************************
function handleConversationUpdate(updatedConversation) {
  wsStatus();
  // WARN: this needs to be updated too.. can use the index directly
  // instead of findIndex
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
// ***********************************************
async function handleIncomingMessage(encryptedMessage) {
  let conversation = conversations.get(encryptedMessage.ConvID);

  // TODO: need to determine if this can actually happen
  // since there's stuff with the key exchange and symmetric key distribution
  // I'm thinking it can't happen where someone receives a message for a conversation they didn't already have the Conversation object for..
  if (!conversation) {
    conversation = await Conversation.fromExisting({
      id: encryptedMessage.ConvID,
      participants: [encryptedMessage.From, encryptedMessage.To]
    });
    conversations.set(conversation.id, conversation);
    updateConversationList();
  }

  const decryptedContent = await conversation.decryptMessage(encryptedMessage.Content);
  const decryptedMessage = {
    ...encryptedMessage,
    Content: decryptedContent
  }
  conversation.messages.push(decryptedMessage);

  if (encryptedMessage.ConvID === currentConversationId) {
    conversation.renderMessages(messageList);
  }
}
// ***********************************************
async function handleSendMessage() {
  const messageContent = messageInput.value.trim();
  if (messageContent === '') return;

  const currentConversation = conversations.get(currentConversationId);
  if (!currentConversation) {
    console.error('no active conversation selected');
    return;
  }

  try {
    const currentUsername = localStorage.getItem('username');
    let recipientUsername = '';
    for (const username in currentConversation.participants) {
      if (username !== currentUsername) {
        recipientUsername = username;
        // only get the first recipient username... this is fine for now since
        // no group chat.... yet
        break;
      }
    }

    if (!recipientUsername) {
      console.error('No recipient for message');
      return;
    }

    const encryptedContent = await currentConversation.encryptMessage(messageContent);
    const message = {
      To: recipientUsername,
      ConvID: currentConversationId,
      From: username,
      Content: encryptedContent,
    };


    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    } else {
      throw new Error('WebSocket is not open');
    }

    messageInput.value = '';
  } catch (err) {
    console.error('Failed to send message:', err);
  }

}
// ***********************************************
function handleMessageInputKeyDown(event) {
  // TODO: changed from enter -> Enter
  // see if that makes event fire
  if (event.key === 'Enter') {
    handleSendMessage();
  }
}
// ***********************************************
async function handleNewConversation() {
  const participant = newConversationInput.value.trim();
  if (participant !== '') {
    try {
      const newConversation = await Conversation.create([username, participant]);
      conversations.set(newConversation.id, newConversation);
      renderConversationList();
      newConversationInput.value = '';
    } catch (err) {
      console.error('Failed to create conversation', err);
    }
  }
}
// ***********************************************
function handleLogoutPress() {
  conversations = null;
  window.location.href = 'login.html';
}
// ***********************************************
function wsStatus() {
  if (socket.readyState !== WebSocket.OPEN) {
    console.error('socket is not ready');
  }
}
