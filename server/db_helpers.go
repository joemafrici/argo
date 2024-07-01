package main

import (
	"context"
	"fmt"
	"log"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type DBClient struct {
	client *mongo.Client
	name   string
}

// ***********************************************
func NewDBClient(connectionString, dbname string) (*DBClient, error) {

	client, err := mongo.Connect(context.TODO(), options.Client().ApplyURI(connectionString))
	if err != nil {
		return nil, fmt.Errorf("Failed to connect to database: %w", err)
	}

	err = client.Ping(context.TODO(), nil)
	if err != nil {
		return nil, fmt.Errorf("Failed to ping database: %w", err)
	}

	return &DBClient{
		client: client,
		name:   dbname,
	}, nil
}

// ***********************************************
func (db *DBClient) Close() error {
	ctx := context.TODO()
	return db.client.Disconnect(ctx)
}

// ***********************************************
func (db *DBClient) CreateConversation(conversation Conversation) error {
	ctx := context.TODO()
	c := db.client.Database("argodb").Collection("conversations")
	if conversation.Messages == nil {
		conversation.Messages = []Message{}
	}
	_, err := c.InsertOne(ctx, conversation)
	if err != nil {
		return fmt.Errorf("Error creating new conversation: %w", err)
	}
	return nil
}

// ***********************************************
func (db *DBClient) AddMessageToConversation(message Message) error {
	ctx := context.TODO()
	coll := db.client.Database(db.name).Collection("conversations")

	// Find the conversation document
	filter := bson.M{"id": message.ConvID}

	// Update the recipient's messages array
	update := bson.M{
		"$push": bson.M{
			"messages": message,
		},
	}

	// Perform the update operation
	result, err := coll.UpdateOne(ctx, filter, update)
	if err != nil {
		fmt.Println(err)
		return fmt.Errorf("error updating recipient's messages: %w", err)
	}
	if result.MatchedCount == 0 {
		return fmt.Errorf("no conversation found with id %s", message.ConvID)
	}
	if result.ModifiedCount == 0 {
		return fmt.Errorf("no updates performed on the conversation with id %s", message.ConvID)
	}
	return nil
}

// ***********************************************
func (db *DBClient) GetUserConversation(username string, id string) (Conversation, error) {
	var conversation Conversation
	collection := db.client.Database(db.name).Collection("conversations")
	filter := bson.M{"id": id}
	err := collection.FindOne(context.TODO(), filter).Decode(&conversation)
	if err != nil {
		return Conversation{}, err
	}

	return conversation, nil
}

// ***********************************************
func (db *DBClient) GetUserConversations(username string) ([]Conversation, error) {
	ctx := context.TODO()
	c := db.client.Database(db.name).Collection("conversations")

	f := bson.M{
		fmt.Sprintf("participants.%s", username): bson.M{"$exists": true},
	}

	cursor, err := c.Find(ctx, f)
	if err != nil {
		return nil, fmt.Errorf("Failed to execute query: %w", err)
	}
	defer cursor.Close(ctx)

	var conversations []Conversation
	for cursor.Next(ctx) {
		var conversation Conversation
		if err := cursor.Decode(&conversation); err != nil {
			return nil, fmt.Errorf("Failed to decode conversation: %w", err)
		}
		conversations = append(conversations, conversation)
	}
	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("Corsor error: %w", err)
	}
	return conversations, nil
}

// ***********************************************
func (db *DBClient) GetAllConversations() ([]Conversation, error) {
	ctx := context.TODO()

	var conversations []Conversation
	collection := db.client.Database(db.name).Collection("conversations")
	query := bson.M{}
	cursor, err := collection.Find(ctx, query)
	if err != nil {
		return nil, err
	}

	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var conversation Conversation
		if err := cursor.Decode(&conversation); err != nil {
			return nil, err
		}
		conversations = append(conversations, conversation)
	}

	if err := cursor.Err(); err != nil {
		return nil, err
	}
	return conversations, nil
}

// ***********************************************
func (db *DBClient) UpdateParticipantSymmetricKey(conversationID, username, encryptedKey string) error {
	ctx := context.TODO()
	coll := db.client.Database(db.name).Collection("conversations")

	filter := bson.M{
		"id":                       conversationID,
		"participants." + username: bson.M{"$exists": true},
	}
	update := bson.M{
		"$set": bson.M{
			"participants." + username + ".encryptedSymmetricKey": encryptedKey,
		},
	}

	_, err := coll.UpdateOne(ctx, filter, update)
	return err
}

// ***********************************************
func (db *DBClient) StoreUserSalt(username, salt string) error {
	ctx := context.TODO()
	c := db.client.Database(db.name).Collection("users")
	f := bson.M{"username": username}
	u := bson.M{
		"$set": bson.M{
			"salt": salt,
		},
	}

	result, err := c.UpdateOne(ctx, f, u)
	if result.MatchedCount == 0 {
		log.Println("Unable to find " + username + " in database")
	} else {
		log.Println("Stored salt for " + username)
	}
	return err
}

// ***********************************************
func (db *DBClient) StoreUserKeys(username, publicKey, encryptedPrivateKey string) error {
	ctx := context.TODO()
	c := db.client.Database(db.name).Collection("users")
	f := bson.M{"username": username}
	u := bson.M{
		"$set": bson.M{
			"publicKey":           publicKey,
			"encryptedPrivateKey": encryptedPrivateKey,
		},
	}

	result, err := c.UpdateOne(ctx, f, u)
	if result.MatchedCount == 0 {
		log.Println("Unable to find " + username + " in database")
	} else {
		log.Println("Stored public key and encrypted private key for " + username)
	}
	return err
}

// ***********************************************
func (db *DBClient) CreateUser(user User) error {
	ctx := context.TODO()
	c := db.client.Database(db.name).Collection("users")
	_, err := c.InsertOne(ctx, user)
	return err
}

// ***********************************************
func (db *DBClient) FindUserByUsername(username string) (User, error) {
	var user User
	ctx := context.TODO()
	c := db.client.Database(db.name).Collection("users")
	f := bson.M{"username": username}
	err := c.FindOne(ctx, f).Decode(&user)
	return user, err
}
