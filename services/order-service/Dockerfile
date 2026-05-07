FROM golang:1.21-alpine AS builder
WORKDIR /app
RUN apk add --no-cache git ca-certificates
COPY go.mod ./
RUN go mod tidy && go mod download
COPY . .
RUN go mod tidy
RUN CGO_ENABLED=0 GOOS=linux go build -a -o order-service .

FROM alpine:3.18
RUN apk --no-cache add ca-certificates wget
WORKDIR /app
COPY --from=builder /app/order-service .
EXPOSE 3003
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://localhost:3003/health || exit 1
CMD ["./order-service"]
