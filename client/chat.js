import { Conversation } from './conversation.js';
import * as encrypt from './encrypt.js';
// Tell me about regression tests... what are they?
// Are they appropriate for this scenario?
//
//
//
//

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
function wsStatus() {
  if (socket.readyState !== WebSocket.OPEN) {
    console.error('socket is not ready');
  }
}
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
      await handleIncomingEncryptedMessage(data);
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
function deleteMessage(messageID) {
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
      if (!response.ok) {
        console.error('Failed to delete message:', response.status);
      }
    })
    .catch(error => {
      console.error('Error deleting message: ', error);
    });
}
// ***********************************************
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

    let fetchedConversations = await response.json();
    fetchedConversations.forEach(conv => {
      let conversation = new Conversation(conv.ID, conv.Participants);
      conversation.messages = conv.Messages;

      conversations.set(conv.ID, conversation);
    });
    // WARN: this could be a problem... who should be
    // rendering the conversation list??
    renderConversationList();
  } catch (error) {
    console.error('Failed to fetch conversations', error);
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
    body: JSON.stringify({ partner: partner }),
  })
    .then(response => response.json())
    .then(data => {
      if (!conversations) {
        conversations = [];
      }
      // WARN: may not be handling this correctly... push on a map??
      // ... should be set..
      // mayb not call renderConversationList also
      conversations.push(data);
      renderConversationList();
    })
    .catch(error => console.error('Error creating new conversation', error));
}
// ***********************************************
// Render UI
// ***********************************************

// ***********************************************
function renderConversationList() {
  conversationList.innerHTML = '';
  // WARN: conversations is a map so can I do this loop now???
  // populate list
  // use for ... of 
  for (const cidx in conversations) {
    const listItem = document.createElement('li');

    const partner = conversations[cidx].Participants.user1.Partner
    listItem.textContent = partner;
    listItem.addEventListener('click', async () => {
      currentConversationId = conversations[cidx].ID;
      const decryptedConvo = await encrypt.decryptConversation(conversations[cidx]);
      conversations[cidx] = decryptedConvo;
      updateMessageList(conversations[cidx]);
    });
    conversationList.appendChild(listItem);
  }
}
/* These functions are now provided by the Conversation class
// ***********************************************
async function updateMessageList(conversation) {
  // Clear the existing message list
  messageList.innerHTML = '';
  // Populate the message list with the messages of the current conversation
  if (conversation) {
    console.log('in updateMessageList')
    console.log(conversation)
    if (!conversation.Participants.user1.Messages) {
      conversation.Participants.username.Messages = [];
    }
    conversation.Participants.user1.Messages.forEach(message => {
      addMessageToList(message);
    })
  }
}
// ***********************************************
function addMessageToList(message) {
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
}
*/

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
async function handleIncomingEncryptedMessage(data) {
  const derivedKey = await encrypt.retrieveDerivedKey();
  // Retrieve encryptedPrivateKey from localstorage
  const encryptedPrivateKey = localStorage.getItem('privateKey');
  // Decrypt encryptedPrivateKey with derivedKey
  const privateKey = await encrypt.decryptPrivateKey(encryptedPrivateKey, derivedKey);
  const decryptedMessage = await encrypt.decryptMessage(data.Content, privateKey);
  data.Content = decryptedMessage;
  handleIncomingMessage(data);
}
// ***********************************************
function handleIncomingMessage(message) {
  let conversation = conversations.get(message.ConvID);

  if (!conversation) {
    conversation = new Conversation(message.ConvID, message.Participants);
    conversations.set(message.ConvID, conversation);

    if (message.ConvID === currentConversationId) {
      conversation.renderMessages(messageList);
    }
  }
}
// ***********************************************
async function handleSendEncryptedMessage() {
  const messageContent = messageInput.value.trim();
  if (messageContent == '') {
    return;
  }

  const currentConversation = conversations.get(currentConversationId);
  if (!currentConversation) {
    console.error('no active conversation selected');
    return;
  }

  try {
    const partnerPublicKeyBase64 = currentConversation.Participants.user1.PublicKey;
    const partnerPublicKey = await encrypt.createPublicCryptoKey(partnerPublicKeyBase64);
    // convert public key
    const encryptedForPartner = await encrypt.encryptMessage(message, partnerPublicKey);

    const selfPublicKeyBase64 = localStorage.getItem('publicKey');
    const selfPublicKey = await encrypt.createPublicCryptoKey(selfPublicKeyBase64);
    const encryptedForSelf = await encrypt.encryptMessage(message, selfPublicKey);
    //var content2msg = message + " encrypted";
    const encryptedMessage = {
      To: currentConversation.Participants.user1.Partner,
      ConvID: currentConversationId,
      From: username,
      Content: encryptedForPartner,
      Content2: encryptedForSelf
    };
  } catch (error) {
    console.error(error)
  }

}
// ***********************************************
async function handleSendMessage() {
  // TODO: encrypt message with partner's public key.. store in content
  // TODO: encrypt message with own public key.. store in content2 

  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(chatMessage));
  } else {
    console.error(socket.readyState);
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
function handleNewConversation() {
  const participant = newConversationInput.value.trim();
  if (participant !== '') {
    createNewConversation(participant);
    newConversationInput.value = '';
  }
}
// ***********************************************
function handleLogoutPress() {
  conversations = null;
  window.location.href = 'login.html';
}
