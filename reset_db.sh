#! /bin/bash

DATABASE="argodb"
COLLECTION="conversations"
MONGO_URI="mongodb://localhost:27017"

mongosh $MONGO_URI --eval "db.getSiblingDB('$DATABASE').dropDatabase()"

mongosh $MONGO_URI --eval "
db = db.getSiblingDB('$DATABASE');
db.$COLLECTION.insertOne({
    id: 'conv1',
    participants: ['deepwater', 'socrates'],
    messages: [
        {id: 'msg1', to: 'socrates', from: 'deepwater', content: 'How are you?', timestamp: new Date()},
        {id: 'msg2', to: 'deepwater', from: 'socrates', content: 'I am fine, thank you!', timestamp: new Date()},
        {id: 'msg3', to: 'socrates', from: 'deepwater', content: 'What are you doing today?', timestamp: new Date()},
        {id: 'msg4', to: 'deepwater', from: 'socrates', content: 'Just reading some books.', timestamp: new Date()},
        {id: 'msg5', to: 'socrates', from: 'deepwater', content: 'That sounds interesting!', timestamp: new Date()}
    ]
});
db.users.insertOne({
    username: 'testUser',
    passwordHash: 'this wont work'
});
"
echo "Database reset and default data inserted successfully."
