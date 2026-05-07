package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	_ "github.com/lib/pq"
)

var db *sql.DB

type ShippingAddress struct {
	Name    string `json:"name"`
	Email   string `json:"email"`
	Address string `json:"address"`
	City    string `json:"city"`
	State   string `json:"state"`
	Zip     string `json:"zip"`
}

type OrderItem struct {
	ID        int     `json:"id,omitempty"`
	OrderID   int     `json:"order_id,omitempty"`
	ProductID string  `json:"product_id"`
	Name      string  `json:"name"`
	Quantity  int     `json:"quantity"`
	Price     float64 `json:"price"`
}

type Order struct {
	ID              int              `json:"id"`
	UserID          int              `json:"user_id"`
	Status          string           `json:"status"`
	Total           float64          `json:"total"`
	ShippingAddress *ShippingAddress `json:"shipping_address,omitempty"`
	Items           []OrderItem      `json:"items,omitempty"`
	CreatedAt       time.Time        `json:"created_at"`
}

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func initDB() {
	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		env("DB_HOST", "localhost"), env("DB_PORT", "5432"),
		env("DB_USER", "postgres"), env("DB_PASSWORD", "password"),
		env("DB_NAME", "ordersdb"))

	for i := 0; i < 10; i++ {
		var err error
		db, err = sql.Open("postgres", connStr)
		if err == nil {
			if pingErr := db.Ping(); pingErr == nil {
				break
			}
		}
		log.Printf("⏳ DB retry %d/10...", i+1)
		time.Sleep(3 * time.Second)
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)

	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS orders (
			id               SERIAL PRIMARY KEY,
			user_id          INT NOT NULL,
			status           VARCHAR(30) DEFAULT 'pending',
			total            DECIMAL(10,2) DEFAULT 0,
			shipping_address JSONB,
			created_at       TIMESTAMP DEFAULT NOW()
		);
		CREATE TABLE IF NOT EXISTS order_items (
			id         SERIAL PRIMARY KEY,
			order_id   INT REFERENCES orders(id) ON DELETE CASCADE,
			product_id VARCHAR(100) NOT NULL,
			name       VARCHAR(200),
			quantity   INT NOT NULL,
			price      DECIMAL(10,2) NOT NULL
		);
	`)
	if err != nil {
		log.Fatal("Schema error:", err)
	}
	log.Println("✅ Orders DB ready")
}

func getUserIDFromToken(r *http.Request) int {
	auth := r.Header.Get("Authorization")
	if auth == "" {
		return 0
	}
	// In production, verify JWT here. For demo, extract user_id from request body.
	return 1
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func errJSON(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

// GET /api/orders/my  — list orders for authenticated user
func myOrdersHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		errJSON(w, 405, "method not allowed"); return
	}
	// In real impl: parse JWT → userID. Using demo userID=1 for simplicity.
	userID := 1
	rows, err := db.Query(`SELECT id,user_id,status,total,shipping_address,created_at FROM orders WHERE user_id=$1 ORDER BY id DESC`, userID)
	if err != nil {
		errJSON(w, 500, err.Error()); return
	}
	defer rows.Close()
	var orders []Order
	for rows.Next() {
		var o Order
		var addrJSON []byte
		rows.Scan(&o.ID, &o.UserID, &o.Status, &o.Total, &addrJSON, &o.CreatedAt)
		if addrJSON != nil {
			json.Unmarshal(addrJSON, &o.ShippingAddress)
		}
		// Fetch items
		itemRows, _ := db.Query(`SELECT id,order_id,product_id,name,quantity,price FROM order_items WHERE order_id=$1`, o.ID)
		for itemRows.Next() {
			var it OrderItem
			itemRows.Scan(&it.ID, &it.OrderID, &it.ProductID, &it.Name, &it.Quantity, &it.Price)
			o.Items = append(o.Items, it)
		}
		itemRows.Close()
		if o.Items == nil { o.Items = []OrderItem{} }
		orders = append(orders, o)
	}
	if orders == nil { orders = []Order{} }
	writeJSON(w, 200, orders)
}

// POST /api/orders  — create order
func createOrderHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		errJSON(w, 405, "method not allowed"); return
	}
	var body struct {
		UserID          int              `json:"user_id"`
		Items           []OrderItem      `json:"items"`
		Total           float64          `json:"total"`
		ShippingAddress *ShippingAddress `json:"shipping_address"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		errJSON(w, 400, "invalid body"); return
	}
	if body.UserID == 0 { body.UserID = 1 }

	addrJSON, _ := json.Marshal(body.ShippingAddress)
	tx, _ := db.Begin()
	var orderID int
	err := tx.QueryRow(`INSERT INTO orders(user_id,total,shipping_address) VALUES($1,$2,$3) RETURNING id`,
		body.UserID, body.Total, addrJSON).Scan(&orderID)
	if err != nil { tx.Rollback(); errJSON(w, 500, err.Error()); return }

	for _, item := range body.Items {
		tx.Exec(`INSERT INTO order_items(order_id,product_id,name,quantity,price) VALUES($1,$2,$3,$4,$5)`,
			orderID, item.ProductID, item.Name, item.Quantity, item.Price)
	}
	tx.Commit()

	writeJSON(w, 201, map[string]interface{}{
		"id": orderID, "status": "pending", "total": body.Total,
		"shipping_address": body.ShippingAddress, "items": body.Items,
		"created_at": time.Now(),
	})
}

// GET /api/orders/{id}
func getOrderHandler(w http.ResponseWriter, r *http.Request, id int) {
	var o Order
	var addrJSON []byte
	err := db.QueryRow(`SELECT id,user_id,status,total,shipping_address,created_at FROM orders WHERE id=$1`, id).
		Scan(&o.ID, &o.UserID, &o.Status, &o.Total, &addrJSON, &o.CreatedAt)
	if err == sql.ErrNoRows { errJSON(w, 404, "order not found"); return }
	if err != nil { errJSON(w, 500, err.Error()); return }
	if addrJSON != nil { json.Unmarshal(addrJSON, &o.ShippingAddress) }

	rows, _ := db.Query(`SELECT id,order_id,product_id,name,quantity,price FROM order_items WHERE order_id=$1`, id)
	defer rows.Close()
	for rows.Next() {
		var it OrderItem
		rows.Scan(&it.ID, &it.OrderID, &it.ProductID, &it.Name, &it.Quantity, &it.Price)
		o.Items = append(o.Items, it)
	}
	if o.Items == nil { o.Items = []OrderItem{} }
	writeJSON(w, 200, o)
}

// PATCH /api/orders/{id}/status
func updateStatusHandler(w http.ResponseWriter, r *http.Request, id int) {
	var body struct{ Status string `json:"status"` }
	json.NewDecoder(r.Body).Decode(&body)
	db.Exec(`UPDATE orders SET status=$1 WHERE id=$2`, body.Status, id)
	writeJSON(w, 200, map[string]string{"message": "updated", "status": body.Status})
}

func router(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimSuffix(r.URL.Path, "/")
	switch {
	case path == "/health":
		writeJSON(w, 200, map[string]string{"status": "ok", "service": "order-service"})
	case path == "/api/orders/my":
		myOrdersHandler(w, r)
	case path == "/api/orders" && r.Method == http.MethodPost:
		createOrderHandler(w, r)
	default:
		// /api/orders/{id} or /api/orders/{id}/status
		parts := strings.Split(path, "/")
		if len(parts) >= 4 {
			id, err := strconv.Atoi(parts[3])
			if err == nil {
				if len(parts) == 5 && parts[4] == "status" && r.Method == http.MethodPatch {
					updateStatusHandler(w, r, id); return
				}
				if len(parts) == 4 && r.Method == http.MethodGet {
					getOrderHandler(w, r, id); return
				}
			}
		}
		errJSON(w, 404, "not found")
	}
}

func main() {
	initDB()
	http.HandleFunc("/", router)
	port := env("PORT", "3003")
	log.Printf("📦 Order Service → port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
