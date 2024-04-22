export async function generateDerivedKey(password, salt) {
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );
  const derivedKey = await window.crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  return derivedKey;
}
export async function encryptPrivateKey(privKey, derivedKey) {
  try {
    if (!derivedKey) {
      throw new Error('Derived key is not set');
    }

    const privKeyBuffer = await window.crypto.subtle.exportKey('pkcs8', privKey);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedKeyBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      derivedKey,
      privKeyBuffer
    );

    const resultBuffer = new Uint8Array(iv.byteLength + encryptedKeyBuffer.byteLength);
    resultBuffer.set(new Uint8Array(iv), 0);
    resultBuffer.set(new Uint8Array(encryptedKeyBuffer), iv.byteLength);
    return arrayBufferToBase64(resultBuffer);
  } catch (err) {
    console.error('Failed to encrypt private key', err); 
    return null;
  }
}
export async function decryptPrivateKey(encryptedData, derivedKey) {
  const dataBuffer = base64ToArrayBuffer(encryptedData);
  if (!dataBuffer) {
    throw new Error('Failed to convert encrypted data to ArrayBuffer');
  }
  const iv = dataBuffer.slice(0, 12);
  const encryptedKeyBuffer = dataBuffer.slice(12);
  // TODO: need to convert this to a cryptokey
  //window.crypto.subtle.importKey('pkcs8', encryptedKeyBuffer);
  const privateKeyBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    derivedKey,
    encryptedKeyBuffer
  ).catch(err => {
      throw new Error('Failed to decrypt private key: ' + err);
  });
  const privateKey = await window.crypto.subtle.importKey(
    'pkcs8',
    privateKeyBuffer,
    { name: 'RSA-OAEP', hash: 'SHA-256'},
    true,
    ['decrypt']
  ).catch(err => {
      throw new Error('Failed to import private key: ' + err);
  });

  return privateKey;
}
/*
export async function encryptMessage(message, key) {

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptedMessage = await window.crypto.subtle.encrypt(
    { name: 'RSA-OAEP', iv: iv },
    key,
    new TextEncoder().encode(message)
  );

  const combined = new Uint8Array(iv.length + encryptedMessage.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encryptedMessage), iv.length);

  try {
    return arrayBufferToBase64(combined.buffer);
  } catch (err) {
    throw new Error('Failed to convert encrypted message to base64: ' + err);
  }
}
export async function decryptMessage(encryptedMessage, privateKey) {
  try {
    const combined = base64ToArrayBuffer(encryptedMessage);
    const iv = new Uint8Array(combined, 0, 12);
    const encryptedData = new Uint8Array(combined, 12);
    console.log('about to decrypt message');
    const decryptedData = await window.crypto.subtle.decrypt(
      { name: 'RSA-OAEP', iv: iv },
      privateKey,
      encryptedData
    );
    console.log('after decrypting message');
    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (err) {
    throw new Error('Failed to decrypt message: ' + err);
  }
}
*/
export async function encryptMessage(message, key) {
  const encryptedMessage = await window.crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    key,
    new TextEncoder().encode(message)
  );

  try {
    return arrayBufferToBase64(encryptedMessage);
  } catch (err) {
    throw new Error('Failed to convert encrypted message to base64: ' + err);
  }
}
export async function decryptMessage(encryptedMessage, privateKey) {
  try {
    const encryptedData = base64ToArrayBuffer(encryptedMessage);
    const decryptedData = await window.crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      privateKey,
      encryptedData
    );
    console.log('after decrypting message');
    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (err) {
    throw new Error('Failed to decrypt message: ' + err);
  }
}
export async function sendKeys(publicKey, encryptedPrivateKey) {

  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('token not found');
  } 
  const response = await fetch(`http://localhost:3001/api/keys`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ publicKey, encryptedPrivateKey }),
  });
  if (!response.ok) {
    throw new Error('Failed to send keys');
  }
}
export async function sendSalt(salt) {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('token not found');
  }
  let saltBase64;
  try {
    saltBase64 = arrayBufferToBase64(salt);
  } catch (err) {
    throw new Error('Failed to convert salt to base64: ' + err);    
  }

  const response = await fetch('http://localhost:3001/api/salt', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ salt: saltBase64 }),
  });
  if (!response.ok) {
    throw new Error('Failed to send salt');
  }
}
//************************************************
export async function generateKeyPair() {
  try {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['encrypt', 'decrypt']
    );
  return keyPair;
  } catch (error) {
    console.error('Failed to generate key pair:', error);  
    return null;
  }
}
//************************************************
export function base64ToArrayBuffer(base64) {
  try {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let ii = 0; ii < len; ++ii) {
      bytes[ii] = binaryString.charCodeAt(ii);
    }
    return bytes.buffer;
  } catch (err) {
    throw new Error('Failed to convert base64 to ArrayBuffer: ' + err);
  }
}
//************************************************
export function arrayBufferToBase64(buffer) {
  try {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let ii = 0; ii < bytes.byteLength; ++ii) {
      binary += String.fromCharCode(bytes[ii]);
    }
    return window.btoa(binary);
  } catch (err) {
    throw new Error('Failed to convert ArrayBuffer to base64: ' + err);
  }
}
export function saltArrayBufferToBase64(buffer) {
  try {
    const bytes = new Uint8Array(buffer);
    const binary = String.fromCharCode.apply(null, bytes);
    return window.btoa(binary);
  } catch (err) {
    throw new Error('Failed to convert ArrayBuffer to base64: ' + err);
  }
}
export function saltBase64ToArrayBuffer(base64) {
  try {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let ii = 0; ii < binary.length; ++ii) {
      bytes[ii] = binary.charCodeAt(ii);
    }
    return bytes.buffer;
  } catch (err) {
    throw new Error('Failed to convert base64 to ArrayBuffer: ' + err);
  }
}
//************************************************
// Transforms keyData into CryptoKey object for use in Web Cryptogrophy API
export async function createPublicCryptoKey(keyData) {
  try {
    const keyBuffer = base64ToArrayBuffer(keyData);
    if (keyBuffer) {
      const pubKey = await window.crypto.subtle.importKey(
        'spki', 
        keyBuffer, 
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256',
        },
        true, 
        ['encrypt'],
      );
      return pubKey;
    }
    throw new Error("keyBuffer is null");
  } catch (err) {
    console.error('Failed to import public key:', err);    
    return null;
  }
}
//************************************************
// Uses password to encrypt private key privKey
/*
export async function encryptPrivateKey(privKey, password) {
  try {
    const privKeyBuffer = await window.crypto.subtle.exportKey('pkcs8', privKey);
    const passwordKey = await window.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey'],
    );
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const derivedKey = await window.crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
      passwordKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedKeyBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      derivedKey,
      privKeyBuffer,
    );

    const resultBuffer = new Uint8Array(iv.byteLength + salt.byteLength + encryptedKeyBuffer.byteLength);
    resultBuffer.set(new Uint8Array(iv), 0);
    resultBuffer.set(new Uint8Array(salt), iv.byteLength);
    resultBuffer.set(new Uint8Array(encryptedKeyBuffer), iv.byteLength + salt.byteLength);

    return arrayBufferToBase64(resultBuffer);

  } catch (err) {
    console.error('Failed to encrypt private key', err); 
    return null;
  }
}
*/
//************************************************
// Decrypts a private key, encryptedData, that was encrypted using 
// encryptPrivateKey and password
/*
export async function decryptPrivateKey(encryptedData, password) {
  try {
    const dataBuffer = base64ToArrayBuffer(encryptedData);
    if (dataBuffer) {
      const iv = dataBuffer.slice(0, 12);
      const salt = dataBuffer.slice(12, 28);
      const encryptedKeyBuffer = dataBuffer.slice(28);
      const passwordKey = await window.crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey'],
      );
      const derivedKey = await window.crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
        passwordKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt'],
      );

      const privateKeyBuffer = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv, },
        derivedKey,
        encryptedKeyBuffer
      );

      const privateKey = await window.crypto.subtle.importKey(
        'pkcs8',
        privateKeyBuffer,
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        true,
        ['decrypt', 'encrypt']
      );

      return privateKey;
    }else {
      throw 'Error encryptedKeyBuffer null';
      
    }
  } catch (err) {
    console.error('Failed to decrypt private key:', err);
    return null;
  }
}
*/
//************************************************
export function generateSalt() {
  return window.crypto.getRandomValues(new Uint8Array(16));
}
// Storing the CryptoKey object
export async function storeDerivedKey(derivedKey) {
  const jwk = await window.crypto.subtle.exportKey('jwk', derivedKey);
  const jwkString = JSON.stringify(jwk);
  localStorage.setItem('derivedKey', jwkString);
}

// Retrieving the CryptoKey object
export async function retrieveDerivedKey() {
  const jwkString = localStorage.getItem('derivedKey');
  if (jwkString) {
    const jwk = JSON.parse(jwkString);
    const derivedKey = await window.crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    return derivedKey;
  }
  return null;
}
export async function decryptConversation(conversation) {
  console.log(conversation);
  const derivedKey = await retrieveDerivedKey();

  // Retrieve encryptedPrivateKey from localstorage
  const encryptedPrivateKey = localStorage.getItem('privateKey');

  // Decrypt encryptedPrivateKey with derivedKey
  const privateKey = await decryptPrivateKey(encryptedPrivateKey, derivedKey);

  // Create a copy of the conversation object
  const decryptedConversation = { ...conversation };

  // Create a copy of the Participants object
  decryptedConversation.Participants = { ...conversation.Participants };

  // Create a copy of the user1 object
  decryptedConversation.Participants.user1 = { ...conversation.Participants.user1 };

  // Create a new array for the decrypted messages
  decryptedConversation.Participants.user1.Messages = [];

  // Decrypt the messages and add them to the new array
  for (const message of conversation.Participants.user1.Messages) {
    console.log(message);
    const decryptedMessage = await decryptMessage(message.Content, privateKey);
    decryptedConversation.Participants.user1.Messages.push({
      ...message,
      Content: decryptedMessage,
    });
  }

  return decryptedConversation;
}
/*
export async function decryptConversation(conversation) {
  const derivedKey = await retrieveDerivedKey();
  // retrieve encryptedPrivateKey from localstorage
  const encryptedPrivateKey = localStorage.getItem('privateKey');
  // convert to crypto key
  // decrypt encryptedPrivateKey with derivedKey
  const privateKey = await decryptPrivateKey(encryptedPrivateKey, derivedKey);
  // decrypt message contentn with privateKey
  for (const message of conversation.Participants.user1.Messages) {
    const decryptedMessage = await decryptMessage(message.Content, privateKey);
    message.Content = decryptedMessage;
  }
}
*/
