# Argo
Argo is an end-to-end encrypted messaging app. It was developed as part of my Senior Project at OIT. I chose to build it because I wanted to learn about what it takes to get full end-to-end encryption.
## System Design
Argo is comprised of a client, server, and database. Each of these components run in their own Docker containers.
### Client
The client is written in React Typescript. It provides the web interface for users to interact with. All encryption is done locally on the client in the user's browser. It uses the Web Cryptography API. 
### Server
The server is written in Go. It provides an API to the client for account registration and login, forwarding messages to recipients, and storing and retrieving messages. It handles each request in its own Goroutine.
It provides authentication with JSON Web Tokens.  Passwords are stored encrypted and hashed. All messages are stored encrypted. The server never has access to unencrypted messages nor the means to decrypt them.
## Features
- Full end-to-end encrypted chat between two users
- Account registration
- Login on new device and still able to decrypt all conversation histories
## Startup Guide
