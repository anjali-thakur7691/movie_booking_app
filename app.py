import os
import json
import random
import string
import re
from flask import Flask, request, jsonify, send_from_directory
import database

app = Flask(__name__, static_folder='static', static_url_path='')

# Initialize database on startup
with app.app_context():
    database.init_db()

def generate_booking_code():
    chars = string.ascii_uppercase + string.digits
    return 'TKT-' + ''.join(random.choices(chars, k=8))

def calculate_seat_total(seats, showtime):
    total = 0
    for seat in seats:
        row = seat[0]
        if row in ('A', 'B'):
            total += showtime['vip_price']
        elif row in ('C', 'D', 'E', 'F'):
            total += showtime['prime_price']
        else:
            total += showtime['standard_price']
    return round(total, 2)

@app.route('/')
def serve_index():
    return send_from_directory('static', 'index.html')

@app.route('/api/movies', methods=['GET'])
def get_movies():
    search = request.args.get('search', '').lower()
    genre = request.args.get('genre', '').lower()

    conn = database.get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM movies ORDER BY is_featured DESC, id ASC')
    rows = cursor.fetchall()
    conn.close()

    movies = []
    for r in rows:
        m = dict(r)
        # Apply optional filters
        if search and search not in m['title'].lower() and search not in m['genre'].lower():
            continue
        if genre and genre != 'all' and genre not in m['genre'].lower():
            continue
        movies.append(m)

    return jsonify({"status": "success", "data": movies})

@app.route('/api/movies/<int:movie_id>', methods=['GET'])
def get_movie_detail(movie_id):
    conn = database.get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM movies WHERE id = ?', (movie_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return jsonify({"status": "error", "message": "Movie not found"}), 404

    return jsonify({"status": "success", "data": dict(row)})

@app.route('/api/showtimes/<int:movie_id>', methods=['GET'])
def get_showtimes(movie_id):
    show_date = request.args.get('date', '')

    conn = database.get_db_connection()
    cursor = conn.cursor()
    
    if show_date:
        cursor.execute('SELECT * FROM showtimes WHERE movie_id = ? AND show_date = ?', (movie_id, show_date))
    else:
        cursor.execute('SELECT * FROM showtimes WHERE movie_id = ?', (movie_id,))
    
    rows = cursor.fetchall()
    conn.close()

    showtimes = []
    for r in rows:
        st = dict(r)
        st['booked_seats'] = json.loads(st['booked_seats'])
        showtimes.append(st)

    return jsonify({"status": "success", "data": showtimes})

@app.route('/api/bookings', methods=['POST'])
def create_booking():
    data = request.get_json()
    
    if not data:
        return jsonify({"status": "error", "message": "Invalid payload"}), 400

    showtime_id = data.get('showtime_id')
    customer_name = data.get('customer_name')
    customer_email = data.get('customer_email')
    customer_phone = data.get('customer_phone')
    seats = data.get('seats', []) # List of seat identifiers e.g. ["A1", "A2"]
    total_amount = data.get('total_amount')

    if not all([showtime_id, customer_name, customer_email, customer_phone, seats]):
        return jsonify({"status": "error", "message": "All fields are required"}), 400

    if not isinstance(seats, list) or len(seats) > 8 or len(set(seats)) != len(seats):
        return jsonify({"status": "error", "message": "Choose between 1 and 8 unique seats."}), 400

    if any(not isinstance(seat, str) or not re.fullmatch(r'[A-H](?:[1-9]|10)', seat) for seat in seats):
        return jsonify({"status": "error", "message": "One or more selected seats are invalid."}), 400

    if not re.fullmatch(r'[^@\s]+@[^@\s]+\.[^@\s]+', str(customer_email)):
        return jsonify({"status": "error", "message": "Please provide a valid email address."}), 400

    if not re.fullmatch(r'\d{10}', str(customer_phone)):
        return jsonify({"status": "error", "message": "Phone number must contain 10 digits."}), 400

    conn = database.get_db_connection()
    cursor = conn.cursor()

    # Fetch showtime & movie details
    cursor.execute('''
        SELECT s.*, m.title as movie_title 
        FROM showtimes s
        JOIN movies m ON s.movie_id = m.id
        WHERE s.id = ?
    ''', (showtime_id,))
    st_row = cursor.fetchone()

    if not st_row:
        conn.close()
        return jsonify({"status": "error", "message": "Showtime not found"}), 404

    st = dict(st_row)
    current_booked = json.loads(st['booked_seats'])

    # Check for seat overlaps
    overlapping = [s for s in seats if s in current_booked]
    if overlapping:
        conn.close()
        return jsonify({
            "status": "error", 
            "message": f"Seats {', '.join(overlapping)} are already booked. Please pick other seats."
        }), 409

    calculated_total = calculate_seat_total(seats, st)

    # Update booked seats
    updated_booked = current_booked + seats
    cursor.execute('UPDATE showtimes SET booked_seats = ? WHERE id = ?', (json.dumps(updated_booked), showtime_id))

    # Generate booking ticket
    booking_code = generate_booking_code()
    cursor.execute('''
        INSERT INTO bookings (booking_code, movie_title, screen_name, show_date, show_time, customer_name, customer_email, customer_phone, seats, total_amount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        booking_code,
        st['movie_title'],
        st['screen_name'],
        st['show_date'],
        st['show_time'],
        customer_name,
        customer_email,
        customer_phone,
        json.dumps(seats),
        calculated_total
    ))

    conn.commit()
    conn.close()

    return jsonify({
        "status": "success",
        "message": "Booking successful!",
        "booking": {
            "booking_code": booking_code,
            "movie_title": st['movie_title'],
            "screen_name": st['screen_name'],
            "show_date": st['show_date'],
            "show_time": st['show_time'],
            "customer_name": customer_name,
            "customer_email": customer_email,
            "seats": seats,
            "total_amount": calculated_total
        }
    }), 201

@app.route('/api/bookings/<query>', methods=['GET'])
def get_booking(query):
    conn = database.get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT * FROM bookings 
        WHERE booking_code = ? OR customer_email = ? OR customer_phone = ?
        ORDER BY id DESC
    ''', (query.upper(), query, query))
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        b = dict(r)
        b['seats'] = json.loads(b['seats'])
        results.append(b)

    return jsonify({"status": "success", "data": results})

if __name__ == '__main__':
    print("Starting Movie Booking Server at http://127.0.0.1:5000 ...")
    app.run(host='0.0.0.0', port=5000, debug=True)
