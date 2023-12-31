package utils

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt"
)

// ***********************************************
func ValidateToken(r *http.Request) (*jwt.Token, error) {
	authHeader := r.Header.Get("authorization")
	if authHeader == "" {
		return nil, errors.New("authorization header is required")
	}

	tokenString := strings.TrimPrefix(authHeader, "Bearer")
	if authHeader == tokenString {
		return nil, errors.New("bearer token not found")
	}

	token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		secret, err := getJWTSecret()
		if err != nil {
			return nil, errors.New("unable to retrieve secret")
		}
		return []byte(secret), nil
	})
	
	return token, err

}
// ***********************************************
func NewTokenString(username string) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"username": username,
		"exp": time.Now().Add(time.Hour * 72).Unix(),
	})

	secret, err := getJWTSecret()
	if err != nil {
		log.Fatal(err.Error())
	}
	tokenString, err := token.SignedString([]byte(secret))
	return tokenString, err
}
// ***********************************************
func getJWTSecret() (string, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		return "", errors.New("JWT_SECRET is not set in the environment")
	}
	return secret, nil
}
