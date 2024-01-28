package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHandleRegister(t *testing.T) {
	newUser := User{
		Username: "asuka",
		Password: "asuka",
	}

	requestBody, _ := json.Marshal(newUser)
	request, _ := http.NewRequest("POST", "/api/register", bytes.NewBuffer(requestBody))
	responseRecorder := httptest.NewRecorder()

	HandleRegister(responseRecorder, request)

	result := responseRecorder.Result()
	if result.StatusCode != http.StatusCreated {
		t.Errorf("expected status %v; got %v", http.StatusCreated, result.StatusCode)
	}
}
