package main

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/joemafrici/argo/utils"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/crypto/bcrypt"
)

// ***********************************************
func setupTestDB(t *testing.T) (*DBClient, func()) {
	dbName := "testdb_" + time.Now().Format("2006012150405")

	ctx := context.TODO()
	opts := options.Client().ApplyURI("mongodb://mongo:27017")
	client, err := mongo.Connect(ctx, opts)
	if err != nil {
		t.Fatalf("Failed to connect to test database: %v", err)
	}

	err = client.Ping(ctx, nil)
	if err != nil {
		t.Fatalf("Failed to ping test database: %v", err)
	}

	testDB := &DBClient{
		client: client,
		name:   dbName,
	}

	// replace production database with test database
	db = testDB

	cleanup := func() {
		err := client.Database(dbName).Drop(ctx)
		if err != nil {
			t.Fatalf("Failed to drop test database: %v", err)
		}

		if err := client.Disconnect(ctx); err != nil {
			t.Fatalf("Failed to disconnect from test database: %v", err)
		}
	}

	return testDB, cleanup
}

// ***********************************************
func TestHandleRegister(t *testing.T) {
	testDB, cleanup := setupTestDB(t)
	defer cleanup()

	newUser := User{
		Username:            "testuser",
		Password:            "testpassword",
		PublicKey:           "testpublickey",
		EncryptedPrivateKey: "testencryptedprivatekey",
		SaltBase64:          "testsalt",
	}

	requestBody, _ := json.Marshal(newUser)
	request, _ := http.NewRequest("POST", "/api/register", bytes.NewBuffer(requestBody))
	responseRecorder := httptest.NewRecorder()

	HandleRegister(responseRecorder, request)

	result := responseRecorder.Result()
	if result.StatusCode != http.StatusCreated {
		t.Errorf("expected status %v; got %v", http.StatusCreated, result.StatusCode)
	}

	var resultUser User
	filter := bson.M{
		"username": newUser.Username,
	}
	ctx := context.TODO()
	coll := testDB.client.Database(testDB.name).Collection("users")
	err := coll.FindOne(ctx, filter).Decode(&resultUser)
	if err != nil {
		t.Errorf("Failed to find created user: %v", err)
	}

	if resultUser.Username != newUser.Username {
		t.Errorf("Created user does not match: got %v want %v", resultUser.Username, newUser.Username)
	}
}

// ***********************************************
func TestHandleLogin(t *testing.T) {
	testDB, cleanup := setupTestDB(t)
	defer cleanup()

	errSecret := utils.LoadSecret()
	if errSecret != nil {
		t.Fatalf("Failed to load JWT secret: %v", errSecret)
	}

	/////////////////////////////////////////////////
	// test login success
	/////////////////////////////////////////////////
	testUsername := "testuser"
	testPassword := "testpassword"
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(testPassword), bcrypt.DefaultCost)

	testUser := User{
		Username:            testUsername,
		Password:            string(hashedPassword),
		PublicKey:           "testpublickey",
		EncryptedPrivateKey: "testencryptedprivatekey",
		SaltBase64:          "testsalt",
	}

	ctx := context.TODO()
	coll := testDB.client.Database(testDB.name).Collection("users")
	_, err := coll.InsertOne(ctx, testUser)
	if err != nil {
		t.Fatalf("Failed to insert test user: %v", err)
	}

	loginCredentials := struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}{
		Username: testUsername,
		Password: testPassword,
	}

	requestBody, _ := json.Marshal(loginCredentials)
	request, _ := http.NewRequest("POST", "/api/login", bytes.NewBuffer(requestBody))

	responseRecorder := httptest.NewRecorder()

	HandleLogin(responseRecorder, request)

	result := responseRecorder.Result()
	if result.StatusCode != http.StatusOK {
		t.Errorf("expected status %v; got %v", http.StatusOK, result.StatusCode)
	}

	var loginResponse LoginResponse
	err = json.NewDecoder(responseRecorder.Body).Decode(&loginResponse)
	if err != nil {
		t.Fatalf("Failed to record response body: %v", err)
	}

	if loginResponse.Token == "" {
		t.Errorf("No token returned in login response")
	}

	if loginResponse.Keys.Public != testUser.PublicKey {
		t.Errorf("Incorrect public key returned: got %v want %v", loginResponse.Keys.Public,
			testUser.PublicKey)
	}
	if loginResponse.Keys.EncryptedPrivate != testUser.EncryptedPrivateKey {
		t.Errorf("Incorrect private key returned: got %v want %v",
			loginResponse.Keys.EncryptedPrivate, testUser.EncryptedPrivateKey)
	}
	if loginResponse.Keys.SaltBase64 != testUser.SaltBase64 {
		t.Errorf("Incorrect salt returned: got %v want %v", loginResponse.Keys.SaltBase64,
			testUser.SaltBase64)
	}

	/////////////////////////////////////////////////
	// test wrong password
	/////////////////////////////////////////////////

	loginCredentials.Password = "wrongpassword"

	requestBody, _ = json.Marshal(loginCredentials)
	request, _ = http.NewRequest("POST", "/api/login", bytes.NewBuffer(requestBody))

	responseRecorder = httptest.NewRecorder()

	HandleLogin(responseRecorder, request)
	result = responseRecorder.Result()
	if result.StatusCode != http.StatusUnauthorized {
		t.Errorf("expected status %v; got %v", http.StatusUnauthorized, result.StatusCode)
	}

	/////////////////////////////////////////////////
	// test nonexistent user
	/////////////////////////////////////////////////
	loginCredentials.Username = "nonexistentuser"
	requestBody, _ = json.Marshal(loginCredentials)
	request, _ = http.NewRequest("POST", "/api/login", bytes.NewBuffer(requestBody))

	responseRecorder = httptest.NewRecorder()

	HandleLogin(responseRecorder, request)

	result = responseRecorder.Result()
	if result.StatusCode != http.StatusUnauthorized {
		t.Errorf("expected status %v; got %v", http.StatusUnauthorized, result.StatusCode)
	}
}

// ***********************************************
func TestHandleCreateConversation(t *testing.T) {
	testDB, cleanup := setupTestDB(t)
	defer cleanup()

	ctx := context.TODO()
	usersColl := testDB.client.Database(testDB.name).Collection("users")

	/////////////////////////////////////////////////
	// test create conversation success
	/////////////////////////////////////////////////

	testUsers := []User{
		{Username: "user1", PublicKey: "publicKey1"},
		{Username: "user2", PublicKey: "publicKey2"},
	}

	for _, user := range testUsers {
		_, err := usersColl.InsertOne(ctx, user)
		if err != nil {
			t.Fatalf("Failed to insert test user: %v", err)
		}
	}

	createConversationRequest := struct {
		Participants []struct {
			Username  string `json:"username"`
			PublicKey string `json:"publicKey"`
		} `json:"participants"`
	}{
		Participants: []struct {
			Username  string `json:"username"`
			PublicKey string `json:"publicKey"`
		}{
			{Username: "user1", PublicKey: "publicKey1"},
			{Username: "user2", PublicKey: "publicKey2"},
		},
	}

	requestBody, _ := json.Marshal(createConversationRequest)
	request, _ := http.NewRequest("POST", "/api/create-conversation", bytes.NewBuffer(requestBody))

	responseRecorder := httptest.NewRecorder()

	ctx = context.WithValue(request.Context(), "username", "user1")
	request = request.WithContext(ctx)

	HandleCreateConversation(responseRecorder, request)

	result := responseRecorder.Result()
	if result.StatusCode != http.StatusOK {
		t.Errorf("expected status %v; got %v", http.StatusOK, result.StatusCode)
	}

	var conversationResponse Conversation
	err := json.NewDecoder(responseRecorder.Body).Decode(&conversationResponse)
	if err != nil {
		t.Fatalf("Failed to decode response body: %v", err)
	}

	if conversationResponse.ID == "" {
		t.Errorf("No conversation ID returned in response")
	}

	if len(conversationResponse.Participants) != 2 {
		t.Errorf("Incorrect number of participants: got %v want 2", len(conversationResponse.Participants))
	}

	for _, user := range testUsers {
		if _, ok := conversationResponse.Participants[user.Username]; !ok {
			t.Errorf("Participant %s not found in conversation response", user.Username)
		}
	}

	var dbConversation Conversation
	conversationColl := testDB.client.Database(testDB.name).Collection("conversations")
	ctx = context.TODO()
	filter := bson.M{
		"id": conversationResponse.ID,
	}
	err = conversationColl.FindOne(ctx, filter).Decode(&dbConversation)
	if err != nil {
		t.Fatalf("Failed to find conversation in database: %v", err)
	}

	if len(dbConversation.Participants) != 2 {
		t.Errorf("Incorrect number of participants in database: got %v want 2", len(dbConversation.Participants))
	}

	/////////////////////////////////////////////////
	// test create conversation with non-existent user
	/////////////////////////////////////////////////
	createConversationRequest.Participants = append(createConversationRequest.Participants, struct {
		Username  string `json:"username"`
		PublicKey string `json:"publicKey"`
	}{Username: "nonexistentuser", PublicKey: "nonexistentkey"})

	requestBody, _ = json.Marshal(createConversationRequest)
	request, _ = http.NewRequest("POST", "/api/create-conversation", bytes.NewBuffer(requestBody))
	responseRecorder = httptest.NewRecorder()

	ctx = context.WithValue(request.Context(), "username", "user1")
	request = request.WithContext(ctx)

	HandleCreateConversation(responseRecorder, request)

	result = responseRecorder.Result()
	if result.StatusCode != http.StatusBadRequest {
		t.Errorf("expected status %v; got %v", http.StatusBadRequest, result.StatusCode)
	}

}

// ***********************************************
func TestHandleGetUserConversations(t *testing.T) {
	testDB, cleanup := setupTestDB(t)
	defer cleanup()

	testUsers := []User{
		{Username: "user1", PublicKey: "publicKey1"},
		{Username: "user2", PublicKey: "publicKey2"},
		{Username: "user3", PublicKey: "publicKey3"},
	}

	ctx := context.TODO()
	usersColl := testDB.client.Database(testDB.name).Collection("users")
	for _, user := range testUsers {
		_, err := usersColl.InsertOne(ctx, user)
		if err != nil {
			t.Errorf("Failed to insert user into database: %v", err)
		}
	}

	testConversations := []Conversation{
		{
			ID: uuid.New().String(),
			Participants: map[string]Participant{
				"user1": {Username: "user1", PublicKey: "publicKey1"},
				"user2": {Username: "user2", PublicKey: "publicKey2"},
			},
		},
		{
			ID: uuid.New().String(),
			Participants: map[string]Participant{
				"user1": {Username: "user1", PublicKey: "publicKey1"},
				"user3": {Username: "user3", PublicKey: "publicKey3"},
			},
		},
	}

	conversationsColl := testDB.client.Database(testDB.name).Collection("conversations")
	for _, conv := range testConversations {
		_, err := conversationsColl.InsertOne(ctx, conv)
		if err != nil {
			t.Errorf("Failed to insert conversation into database: %v", err)
		}
	}

	request, _ := http.NewRequest("GET", "/api/conversations", nil)
	responseRecorder := httptest.NewRecorder()

	ctx = context.WithValue(request.Context(), "username", "user1")
	request = request.WithContext(ctx)

	HandleGetUserConversations(responseRecorder, request)

	result := responseRecorder.Result()
	if result.StatusCode != http.StatusOK {
		t.Errorf("expected status %v; got %v", http.StatusOK, result.StatusCode)
	}

	var conversationsResponse []Conversation
	err := json.NewDecoder(responseRecorder.Body).Decode(&conversationsResponse)
	if err != nil {
		t.Errorf("Failed to decode response body: %v", err)
	}

	numConversations := len(conversationsResponse)
	if numConversations != 2 {
		t.Errorf("Incorrect number of conversations returned. Got %v want 2", numConversations)
	}

	for _, testConv := range testConversations {
		found := false
		for _, respConv := range conversationsResponse {
			if respConv.ID == testConv.ID {
				found = true
				if len(respConv.Participants) != len(testConv.Participants) {
					t.Errorf("Incorrect number of participants in conversation: %s got %v want %v", respConv.ID, len(respConv.Participants), len(testConv.Participants))
				}
				break
			}
		}
		if !found {
			t.Errorf("Conversation %s not found in response", testConv.ID)
		}
	}

	/////////////////////////////////////////////////
	// test with user that has no conversations
	/////////////////////////////////////////////////

	request, _ = http.NewRequest("GET", "/api/conversations", nil)
	responseRecorder = httptest.NewRecorder()

	ctx = context.WithValue(request.Context(), "username", "user2")
	request = request.WithContext(ctx)

	HandleGetUserConversations(responseRecorder, request)

	result = responseRecorder.Result()
	if result.StatusCode != http.StatusOK {
		t.Errorf("expected status %v; got %v", http.StatusOK, result.StatusCode)
	}

	err = json.NewDecoder(responseRecorder.Body).Decode(&conversationsResponse)
	if err != nil {
		t.Fatalf("Failed to decode response body: %v", err)
	}

	if len(conversationsResponse) != 1 {
		t.Errorf("Incorrect number of conversation responses: got %v want %v", len(conversationsResponse), 1)
	}

	/////////////////////////////////////////////////
	// test with user that has no conversations
	/////////////////////////////////////////////////

	request, _ = http.NewRequest("GET", "/api/conversations", nil)
	responseRecorder = httptest.NewRecorder()

	ctx = context.WithValue(request.Context(), "username", "user4")
	request = request.WithContext(ctx)

	HandleGetUserConversations(responseRecorder, request)

	result = responseRecorder.Result()
	if result.StatusCode != http.StatusOK {
		t.Errorf("expected status %v; got %v", http.StatusOK, result.StatusCode)
	}

	err = json.NewDecoder(responseRecorder.Body).Decode(&conversationsResponse)
	if err != nil {
		t.Fatalf("Failed to decode response body: %v", err)
	}

	if len(conversationsResponse) != 0 {
		t.Errorf("Incorrect number of conversation responses: got %v want %v", len(conversationsResponse), 0)
	}
}
