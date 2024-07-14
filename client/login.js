import * as encrypt from './encrypt.js';
export async function createLoginHandler(router) {
  return async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    try {
      //http://localhost:3001/api/login
      const response = await fetch('http://localhost:3001/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      console.log('fetch response received');

      const data = await response.json();

      if (data.token) {
        console.log('login successful, token recieved');
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', username);
        localStorage.setItem('saltBase64', data.keys.saltBase64);
        const salt = encrypt.base64ToArrayBuffer(data.keys.saltBase64);
        // TODO: use this line after retrieving key from localstorage
        //const publicKey = await encrypt.createPublicCryptoKey(data.keys.public);
        const derivedKey = await encrypt.generateDerivedKey(password, salt);
        await encrypt.storeDerivedKey(derivedKey);
        localStorage.setItem('publicKey', data.keys.public);
        localStorage.setItem('privateKey', data.keys.encryptedPrivate);

        console.log('attempting to navigate to /chat');
        router.navigate('/chat');
        console.log('naviatation command issued');
      } else {
        console.error('Login failed');
      }
    } catch (error) {
      console.error('error handling login', error);
    }
  }
}
export async function createRegisterHandler(router) {
  return async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('newUsername').value;
    const password = document.getElementById('newPassword').value;
    try {
      const keyPair = await encrypt.generateKeyPair();
      if (keyPair) {
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const saltBase64 = encrypt.arrayBufferToBase64(salt);
        const derivedKey = await encrypt.generateDerivedKey(password, salt);
        const encryptedPrivateKey = await encrypt.encryptPrivateKey(keyPair.privateKey, derivedKey);
        const publicKeyArrayBuffer = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);

        const publicKey = encrypt.arrayBufferToBase64(publicKeyArrayBuffer);
        fetch('http://localhost:3001/api/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password, publicKey, encryptedPrivateKey: encryptedPrivateKey, saltBase64 }),
        })
          .then(response => {
            if (!response.ok) {
              console.error('Failed to register: ', response.status);
            }
          })
          .catch(error => {
            console.error('Error registering: ', error);
          });
      } else {
        throw new Error('keyPair not valid');
      }
    } catch (error) {
      console.error('Failed to generate public/private key pair:', error);
    }
  }
}
