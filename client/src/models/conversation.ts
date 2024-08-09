import { Message, Conversation as ConversationType } from '../sampleData';
import { KeyManager, Encryptor } from '../utils/encrypt.ts'

export const createFromExisting = async (data: ConversationType): Promise<ConversationType> => {
  const decryptedMessages = await decryptMessages(data);
  return {
    ...data,
    Messages: decryptedMessages
  };
};

//export const createNew = async (participants: string[]): Promise<Conversation> => {
//  const keyManager = KeyManager.getInstance();
//  const symmetricKey = keyManager.generateSymmetricKey();
//};

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
  if (!encryptedSymmetricKey) throw new Error('encrypted symmetric key not found in participant object');

  const derivedKey = await keyManager.retrieveDerivedKey();
  if (!derivedKey) throw new Error('derived key not found retrieveable from key manager');

  const encryptedPrivateKey = localStorage.getItem('privateKey');
  if (!encryptedPrivateKey) throw new Error('private key not found in local storage');

  const privateKey = await keyManager.decryptPrivateKey(encryptedPrivateKey, derivedKey);
  return await keyManager.decryptSymmetricKey(encryptedSymmetricKey, privateKey);
}
