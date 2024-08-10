import { Message, Conversation as ConversationType } from '../sampleData';
import { KeyManager, Encryptor } from '../utils/encrypt.ts'

export const createFromExisting = async (data: ConversationType): Promise<ConversationType> => {
  const decryptedMessages = await decryptMessages(data);
  return {
    ...data,
    Messages: decryptedMessages
  };
};

export const createNewConversation = async (participants: string[]): Promise<ConversationType> => {
  const myUsername = localStorage.getItem('username')
  const myPublicKey = localStorage.getItem('publicKey');

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

  const conversationWithKeys = (await response.json()) as ConversationType;
  const newConversation: ConversationType = {
    ID: conversationWithKeys.ID,
    Participants: conversationWithKeys.Participants,
    Messages: [],
    LastMessage: '',
    SymmetricKey: '',
  };

  // generateSymmetricKey
  const keyManager = KeyManager.getInstance();
  const symmetricKey = await keyManager.generateSymmetricKey();
  const symmetricKeyBuffer = await window.crypto.subtle.exportKey('raw', symmetricKey);
  const encryptedKeys: { [key: string]: string } = {};
  for (const username in newConversation.Participants) {
    const participant = newConversation.Participants[username];
    const publicKey = await keyManager.createPublicCryptoKey(participant.PublicKey);
    const encryptedSymmetricKey = await keyManager.encryptSymmetricKey(symmetricKeyBuffer, publicKey);
    encryptedKeys[participant.Username] = encryptedSymmetricKey;
  }

  console.log('distributing encrypted keys');
  console.log(encryptedKeys);

  // distributeEncryptedKeys
  try {
    const response = await fetch(`http://localhost:3001/api/symmetric-key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        ConversationId: newConversation.ID,
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

  console.log('new converation is', newConversation);

  return newConversation;
};

const decryptMessages = async (conversation: ConversationType): Promise<Message[]> => {
  const symmetricKey = await getSymmetricKey(conversation);
  const encryptor = new Encryptor();

  return Promise.all(
    conversation.Messages.map(async (message: Message) => ({
      ...message,
      Content: await encryptor.decryptMessage(message.Content, symmetricKey)
    }))
  );
};
export const decryptMessage = async (message: Message, conversation: ConversationType): Promise<Message> => {
  const symmetricKey = await getSymmetricKey(conversation);
  const encryptor = new Encryptor();

  const decryptedContent = await encryptor.decryptMessage(message.Content, symmetricKey)
  return { ...message, Content: decryptedContent };
};

export const encryptMessageContent = async (conversation: ConversationType, content: string): Promise<string> => {
  const symmetricKey = await getSymmetricKey(conversation);
  const encryptor = new Encryptor();
  return await encryptor.encryptMessage(content, symmetricKey);
};

const getSymmetricKey = async (conversation: ConversationType): Promise<CryptoKey> => {
  const keyManager = KeyManager.getInstance();
  const username = localStorage.getItem('username');
  if (!username) throw new Error('username not found in local storage');

  const participant = conversation.Participants[username];
  if (!participant) throw new Error('participant not found in conversation object');

  const encryptedSymmetricKey = participant.EncryptedSymmetricKey;
  console.log(encryptedSymmetricKey);
  if (!encryptedSymmetricKey) throw new Error('encrypted symmetric key not found in participant object');

  const derivedKey = await keyManager.retrieveDerivedKey();
  if (!derivedKey) throw new Error('derived key not found retrieveable from key manager');

  const encryptedPrivateKey = localStorage.getItem('privateKey');
  if (!encryptedPrivateKey) throw new Error('private key not found in local storage');

  const privateKey = await keyManager.decryptPrivateKey(encryptedPrivateKey, derivedKey);
  return await keyManager.decryptSymmetricKey(encryptedSymmetricKey, privateKey);
}
