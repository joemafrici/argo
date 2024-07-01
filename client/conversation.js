import * as encrypt from './encrypt.js';

export class Conversation {
  constructor(id, participants) {
    this.id = id;
    this.messages = [];
    this.participants = participants;
    this.symmetricKey = null;
  }

  // Create Conversation object from existing conversation data
  // This function is used when a conversation is retrieved from the server
  static async fromExisting(conversationData) {
    const conversation = new Conversation(conversationData.ID, conversationData.Participants);
    await conversation.initializeExisting(conversationData);
    return conversation;
  }
  async initializeExisting(conversationData) {
    this.messages = conversationData.Messages || [];

    const currentUserUsername = localStorage.getItem('username');
    const currentUserParticipant = this.participants[currentUserUsername];
    if (!currentUserParticipant) {
      throw new Error('Current user not found in conversation participants');
    }

    const encryptedSymmetricKey = currentUserParticipant.EncryptedSymmetricKey;
    if (!encryptedSymmetricKey) {
      throw new Error('Encrypted symmetric key not found for current user');
    }

    try {
      const encryptedPrivateKey = localStorage.getItem('privateKey');
      const derivedKey = await encrypt.retrieveDerivedKey();
      const privateKey = await encrypt.decryptPrivateKey(encryptedPrivateKey, derivedKey);

      this.symmetricKey = await encrypt.decryptSymmetricKey(encryptedSymmetricKey, privateKey);

      await this.decryptAllMessages();
    } catch (err) {
      console.error('Failed to decrypt symmetric key:', err);
      throw new Error('Failed to initialize conversation');
    }
  }

  // Create Conversation object
  // This function is used when creating a new Conversation that is not
  // stored on the server
  static async create(participants) {
    console.log('in create');
    const myPublicKey = localStorage.getItem('publicKey');
    const myUsername = localStorage.getItem('username')

    const request = {
      Participants: participants.map(username => ({
        Username: username,
        PublicKey: username === myUsername ? myPublicKey : null
      }))
    };

    const response = await fetch('http://localhost:3001/api/create-conversation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error('Failed to create conversation');
    }

    const conversationWithKeys = await response.json();
    console.log(conversationWithKeys);
    const conversation = new Conversation(conversationWithKeys.ID, conversationWithKeys.Participants);
    await conversation.initializeNew();
    return conversation;
  }
  async initializeNew() {
    // TODO: should this be in trycatch? should everything be in trycatch?
    // await this.exchangePublicKeys();
    await this.generateAndDistributeSymmetricKey();
  }

  async exchangePublicKeys() {
    try {
      // TODO: update api endpoint
      // I think id may be in the token so maybe no need to put in url
      const response = await fetch(`/api/conversation/${this.id}/public-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          username: Conversation.currentUser,
          publicKey: await Conversation.getMyPublicKey()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to exchange public keys');
      }

      const updatedParticipants = await response.json();
      this.participants = updatedParticipants;
    } catch (err) {
      console.error('Error exchanging public keys:', err);
      throw err;
    }
  }

  async generateAndDistributeSymmetricKey() {
    this.symmetricKey = await encrypt.generateSymmetricKey();
    const symmetricKeyBuffer = await window.crypto.subtle.exportKey('raw', this.symmetricKey);
    const encryptedKeys = {};

    for (const username in this.participants) {
      const participant = this.participants[username];
      const publicKey = await encrypt.createPublicCryptoKey(participant.PublicKey);
      const encryptedSymmetricKey = await encrypt.encryptSymmetricKey(symmetricKeyBuffer, publicKey);
      encryptedKeys[participant.Username] = encryptedSymmetricKey;
    }

    await this.distributeEncryptedKeys(encryptedKeys);
  }

  async distributeEncryptedKeys(encryptedKeys) {
    try {
      const response = await fetch(`http://localhost:3001/api/symmetric-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ConversationId: this.id,
          EncryptedKeys: encryptedKeys
        })
      });

      if (!response.ok) {
        throw new Error('Failed to distribute encrypted keys');
      }

    } catch (err) {
      console.error('Error distributing encrypted keys:', err);
      throw err;
    }
  }

  async initializeSymmetricKey() {
    try {
      this.symmetricKey = await encrypt.generateSymmetricKey();
      const currentUser = localStorage.getItem('username');

      for (const [username, participant] of Object.entries(this.participants)) {
        if (username !== currentUser) {
          const publicKey = await encrypt.createPublicCryptoKey(participant.publicKey);
          const encryptedKey = await encrypt.encryptSymmetricKey(this.symmetricKey, publicKey);
          this.participants[username].encryptedSymmetricKey = encryptedKey;
        }
      }

      const myPublicKey = localStorage.getItem('publicKey');
      if (myPublicKey) {
        const myPublicKey = await encrypt.createPublicCryptoKey(myPublicKey);
        const myEncryptedKey = await encrypt.encryptSymmetricKey(this.symmetricKey, myPublicKey);
        this.participants[currentUser].encryptedSymmetricKey = myEncryptedKey;
      }
    } catch (err) {
      console.error('Error initializing symmetric key:', err);
      throw err;
    }
  }

  async decryptSymmetricKey(privateKey) {
    const encryptedKey = this.participants.find(p => p.username === currentUser).encryptedSymmetricKey;
    this.symmetricKey = await encrypt.decryptSymmetricKey(encryptedKey, privateKey);
  }

  addMessage(message) {
    try {
      if (!this.symmetricKey) {
        throw new Error('Symmetric key not initialized');
      }
      const encryptedContent = encrypt.encryptMessage(message.Content, this.symmetricKey);
      message.Content = encryptedContent;
      this.messages.push(message);
    } catch (err) {
      console.error('Failed to add message:', err);
      throw err;
    }
  }

  async encryptMessage(content) {
    try {
      if (!this.symmetricKey) {
        throw new Error('Symmetric key not initialized');
      }
      const encryptedContent = encrypt.encryptMessage(content, this.symmetricKey);
      return encryptedContent;
    } catch (err) {
      console.error('Failed to encrypt message:', err);
      throw new Error('Failed to encrypt message');
    }
  }

  async decryptMessage(content) {
    try {
      if (!this.symmetricKey) {
        throw new Error('Symmetric key not initialized');
      }
      const decryptedContent = encrypt.decryptMessage(content, this.symmetricKey);
      return decryptedContent;
    } catch (err) {
      console.error('Failed to decrypt message:', err);
      throw new Error('Failed to decrypt message');
    }
  }
  async decryptAllMessages() {
    this.messages = await Promise.all(this.messages.map(async (message) => {
      const decryptedContent = await encrypt.decryptMessage(message.Content, this.symmetricKey);
      return { ...message, Content: decryptedContent };
    }));
  }

  renderMessages(messageListElement) {
    messageListElement.innerHTML = '';

    this.messages.forEach(message => {
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
      messageListElement.appendChild(messageElement);
    });

    messageListElement.scrollTop = messageListElement.scrollHeight;
  }

  updateMessages(newMessage) {
    this.messages.push(newMessage);
    this.renderMessages();
  }

  // TODO: this function was ripped from chat.js...
  // need to adapt to be a Conversation method
  deleteMessage(messageID) {
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
}
