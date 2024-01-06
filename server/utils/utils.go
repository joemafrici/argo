package utils

import (
	"bufio"
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
func EnableCORS(w *http.ResponseWriter) {
	(*w).Header().Set("Access-Control-Allow-Origin", "*") // Adjust in production
	(*w).Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
	(*w).Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	(*w).Header().Set("Access-Control-Allow-Credentials", "true")
}
// ***********************************************
func ValidateTokenFromString(tokenString string) (string, error) {
	jwtSecret, err := getJWTSecret()
	if err != nil {
		return "", errors.New("unable to retrieve secret")
	}

	secretKey := []byte(jwtSecret)

	token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return secretKey, nil
	})

	if err != nil {
		return "", err
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		username, ok := claims["username"].(string)
		if !ok {
			return "", errors.New("username not found in token")
		}
		return username, nil
	}

	return "", errors.New("invalid token")
}
// ***********************************************
func ValidateToken(r *http.Request) (*jwt.Token, error) {
	authHeader := r.Header.Get("authorization")
	if authHeader == "" {
		log.Println("authheader blank")
		return nil, errors.New("authorization header is required")
	}

	tokenString := strings.TrimPrefix(authHeader, "Bearer")
	tokenString = strings.TrimSpace(tokenString)
	if authHeader == tokenString {
		log.Println("auth equal to token string")
		return nil, errors.New("bearer token not found")
	}

	token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			log.Println("method check no good... returning")
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
func RemoveDuplicates(e []string) []string {
	encountered := map[string]bool{}
	result := []string{}

	for v := range e {
		if encountered[e[v]] == true {
			// no duplicates allowed
		} else {
			encountered[e[v]] = true
			result = append(result, e[v])
		}
	}
	return result
}
// ***********************************************
func LoadSecret() error {
	file, err := os.Open(".env")	
	if err != nil {
		return err
	}
	defer file.Close()

	s := bufio.NewScanner(file)
	if s.Scan() {
		jwtSecret := s.Text()
		os.Setenv("JWT_SECRET", jwtSecret)
	}
	return s.Err()
}
// ***********************************************
func getJWTSecret() (string, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		return "", errors.New("JWT_SECRET is not set in the environment")
	}
	return secret, nil
}
// ***********************************************
func PrintEnvVariables() {
	for _, env := range os.Environ() {
		log.Println(env)
	}
}
