#!/bin/bash

SERVER_PATH="/Users/deepwater/code/argo/server"
CLIENT_PATH="/Users/deepwater/code/argo/client3"

docker start mongodb

cd $SERVER_PATH
go run . &

cd $CLIENT_PATH
npm run dev &
