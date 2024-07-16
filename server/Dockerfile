# syntax=docker/dockerfile:1

# Build stage
# TODO: change to 9
FROM oraclelinux:8 AS build

# Install Go
#RUN dnf install -y oracle-golang-release-el8 && \
#    dnf install -y golang && \
#    dnf clean all
RUN dnf install go-toolset
WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# Development stage
FROM oraclelinux:8 AS dev

# Install Go and development tools
RUN dnf install go-toolset
WORKDIR /app

RUN go install github.com/githubnemo/CompileDaemon@latest
ENV PATH="/root/go/bin:${PATH}"

COPY --from=build /app/go.mod /app/go.sum ./
RUN go mod download

COPY . .

EXPOSE 3001

CMD CompileDaemon -log-prefix=false -build="go build -o main" -command="./main"

# Production stage
FROM oraclelinux:8-slim AS prod

# Install any necessary runtime dependencies
# For a Go binary, we might not need any, but you can add if required
# RUN dnf install -y <any-required-packages> && dnf clean all

WORKDIR /root/

COPY --from=build /app/main .
COPY --from=build /app/.env .

EXPOSE 3001

CMD ["./main"]
