#!/bin/bash

docker stop mongodb

SERVER_PID=$(lsof -ti :3001)
CLIENT_PID=$(lsof -ti :5173)

if [[ ! -z "$SERVER_PID" ]]; then
	kill -9 $SERVER_PID
fi

if [[ ! -z "$CLIENT_PID" ]]; then
	kill -9 $CLIENT_PID
fi
