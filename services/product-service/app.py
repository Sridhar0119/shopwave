from flask import Flask, jsonify, request
from pymongo import MongoClient
from bson import ObjectId
import redis
import json
import os
import time
import random

app = Flask(__name__)

# MongoDB
def get_mongo(retries=10):
    uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017')
    for i in range(retries):
        try:
            client = MongoClient(uri, serverSelectionTimeoutMS=3000)
            client.admin.command('ping')
            print('✅ MongoDB connected')
            return client
        except Exception as e:
            print(f'⏳ MongoDB retry {i+1}/{retries}: {e}')
            time.sleep(3)
    raise RuntimeError('MongoDB unavailable')

mongo_client = get_mongo()
db = mongo_client[os.getenv('DB_NAME', 'productsdb')]
products_col = db['products']

# Redis cache
try:
    cache = redis.Redis.from_url(os.getenv('REDIS_URL', 'redis://localhost:6379'), decode_responses=True)
    cache.ping()
    print('✅ Redis connected')
except Exception as e:
    print(f'⚠️  Redis unavailable: {e}')
    cache = None

CACHE_TTL = 300  # 5 minutes

def serialize(doc):
    doc['id'] = str(doc.pop('_id'))
    return doc

def cached_get(key):
    if cache:
        try: return json.loads(cache.get(key) or 'null')
        except: pass
    return None

def cache_set(key, data):
    if cache:
        try: cache.setex(key, CACHE_TTL, json.dumps(data))
        except: pass

# Seed catalog
PRODUCTS = [
    {"name":"MacBook Pro 16\"","category":"electronics","price":2499.99,"stock":25,"rating":4.8,"review_count":342,"description":"Apple M3 Pro chip, stunning Liquid Retina XDR display.","image_emoji":"💻"},
    {"name":"iPhone 15 Pro","category":"electronics","price":1199.99,"stock":50,"rating":4.7,"review_count":891,"description":"Titanium design, A17 Pro chip, 48MP camera.","image_emoji":"📱"},
    {"name":"Sony WH-1000XM5","category":"electronics","price":349.99,"stock":80,"rating":4.9,"review_count":1204,"description":"Industry-leading noise cancellation, 30-hour battery.","image_emoji":"🎧"},
    {"name":"Samsung 4K OLED TV","category":"electronics","price":1799.99,"stock":15,"rating":4.6,"review_count":267,"description":"65\" OLED panel, 120Hz, Dolby Vision & Atmos.","image_emoji":"📺"},
    {"name":"iPad Air M2","category":"electronics","price":749.99,"stock":60,"rating":4.7,"review_count":523,"description":"M2 chip, 10.9\" Liquid Retina, USB-C, 5G ready.","image_emoji":"📱"},
    {"name":"Nike Air Max 2024","category":"sports","price":149.99,"stock":120,"rating":4.5,"review_count":678,"description":"Iconic Air cushioning meets modern materials.","image_emoji":"👟"},
    {"name":"Adidas Ultraboost 24","category":"sports","price":179.99,"stock":95,"rating":4.6,"review_count":445,"description":"Responsive Boost midsole, Primeknit+ upper.","image_emoji":"👟"},
    {"name":"Yoga Mat Premium","category":"sports","price":79.99,"stock":200,"rating":4.4,"review_count":312,"description":"Non-slip 6mm thick, eco-friendly TPE material.","image_emoji":"🧘"},
    {"name":"Levi's 501 Jeans","category":"clothing","price":89.99,"stock":150,"rating":4.3,"review_count":789,"description":"The original straight fit, 100% cotton denim.","image_emoji":"👖"},
    {"name":"North Face Fleece Jacket","category":"clothing","price":129.99,"stock":75,"rating":4.7,"review_count":234,"description":"Classic full-zip fleece, recycled fabric.","image_emoji":"🧥"},
    {"name":"Uniqlo Ultra Light Down","category":"clothing","price":99.99,"stock":110,"rating":4.8,"review_count":567,"description":"90% down fill, packable to a tiny pouch.","image_emoji":"🧥"},
    {"name":"Atomic Habits","category":"books","price":16.99,"stock":500,"rating":4.9,"review_count":24897,"description":"James Clear's guide to building good habits.","image_emoji":"📚"},
    {"name":"The Pragmatic Programmer","category":"books","price":49.99,"stock":300,"rating":4.8,"review_count":5632,"description":"20th Anniversary Edition. Essential reading for devs.","image_emoji":"📖"},
    {"name":"Deep Work","category":"books","price":14.99,"stock":450,"rating":4.7,"review_count":8901,"description":"Rules for focused success in a distracted world.","image_emoji":"📚"},
    {"name":"Dyson V15 Detect","category":"home","price":699.99,"stock":30,"rating":4.8,"review_count":1123,"description":"Laser dust detection, HEPA filtration, 60-min runtime.","image_emoji":"🌀"},
    {"name":"Instant Pot Duo 7-in-1","category":"home","price":89.99,"stock":85,"rating":4.6,"review_count":34521,"description":"Pressure cooker, slow cooker, rice cooker and more.","image_emoji":"🍲"},
    {"name":"Philips Hue Starter Kit","category":"home","price":199.99,"stock":60,"rating":4.5,"review_count":2341,"description":"3 smart bulbs + bridge, 16M colors, voice control.","image_emoji":"💡"},
    {"name":"La Mer Moisturizer","category":"beauty","price":345.00,"stock":40,"rating":4.7,"review_count":2109,"description":"Legendary healing Crème de la Mer formula.","image_emoji":"💄"},
    {"name":"Fenty Beauty Foundation","category":"beauty","price":40.00,"stock":200,"rating":4.8,"review_count":7823,"description":"40 shades, buildable coverage, matte-velvety finish.","image_emoji":"💄"},
    {"name":"Oura Ring Gen 4","category":"electronics","price":399.99,"stock":45,"rating":4.6,"review_count":1876,"description":"Health tracking ring: HRV, SpO2, sleep insights.","image_emoji":"💍"},
]

def seed_products():
    if products_col.count_documents({}) == 0:
        products_col.insert_many(PRODUCTS)
        products_col.create_index([('name', 'text'), ('description', 'text')])
        products_col.create_index('category')
        products_col.create_index('price')
        print(f'✅ Seeded {len(PRODUCTS)} products')

seed_products()

@app.route('/health')
def health():
    return jsonify({'status': 'ok', 'service': 'product-service'})

@app.route('/api/products')
def list_products():
    category   = request.args.get('category')
    search     = request.args.get('search')
    sort       = request.args.get('sort', 'newest')
    price_min  = float(request.args.get('price_min', 0))
    price_max  = float(request.args.get('price_max', 99999))
    page       = int(request.args.get('page', 1))
    limit      = min(int(request.args.get('limit', 12)), 50)

    cache_key = f"products:{category}:{search}:{sort}:{price_min}:{price_max}:{page}:{limit}"
    cached = cached_get(cache_key)
    if cached:
        return jsonify(cached)

    query = {'price': {'$gte': price_min, '$lte': price_max}}
    if category:
        query['category'] = category.lower()
    if search:
        query['$text'] = {'$search': search}

    sort_map = {
        'newest':     [('_id', -1)],
        'price_asc':  [('price', 1)],
        'price_desc': [('price', -1)],
        'rating':     [('rating', -1)],
    }
    sort_field = sort_map.get(sort, [('_id', -1)])

    total  = products_col.count_documents(query)
    docs   = list(products_col.find(query).sort(sort_field).skip((page-1)*limit).limit(limit))
    result = {'products': [serialize(d) for d in docs], 'total': total, 'page': page, 'limit': limit}
    cache_set(cache_key, result)
    return jsonify(result)

@app.route('/api/products/categories')
def categories():
    cats = products_col.distinct('category')
    return jsonify(cats)

@app.route('/api/products/<product_id>')
def get_product(product_id):
    cache_key = f"product:{product_id}"
    cached = cached_get(cache_key)
    if cached:
        return jsonify(cached)
    try:
        doc = products_col.find_one({'_id': ObjectId(product_id)})
    except Exception:
        doc = None
    if not doc:
        return jsonify({'error': 'Not found'}), 404
    result = serialize(doc)
    cache_set(cache_key, result)
    return jsonify(result)

@app.route('/api/products', methods=['POST'])
def create_product():
    data = request.get_json()
    if not data or 'name' not in data or 'price' not in data:
        return jsonify({'error': 'name and price required'}), 400
    data.setdefault('category', 'general')
    data.setdefault('stock', 0)
    data.setdefault('rating', 0)
    data.setdefault('review_count', 0)
    result = products_col.insert_one(data)
    data['id'] = str(result.inserted_id)
    data.pop('_id', None)
    return jsonify(data), 201

@app.route('/api/products/<product_id>', methods=['PATCH'])
def update_stock(product_id):
    data = request.get_json()
    try:
        products_col.update_one({'_id': ObjectId(product_id)}, {'$inc': {'stock': data.get('delta', 0)}})
        if cache: cache.delete(f"product:{product_id}")
    except Exception as e:
        return jsonify({'error': str(e)}), 400
    return jsonify({'message': 'Updated'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.getenv('PORT', 3002)))
