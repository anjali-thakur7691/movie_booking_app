import sqlite3
import json
import os

DB_FILE = os.path.join(os.path.dirname(__file__), 'movies.db')

def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Create Movies Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS movies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            genre TEXT NOT NULL,
            rating REAL,
            duration TEXT,
            language TEXT,
            format TEXT,
            poster_url TEXT,
            banner_url TEXT,
            description TEXT,
            price REAL,
            release_date TEXT,
            is_featured INTEGER DEFAULT 0
        )
    ''')

    # Create Showtimes Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS showtimes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            movie_id INTEGER,
            screen_name TEXT,
            show_date TEXT,
            show_time TEXT,
            standard_price REAL,
            prime_price REAL,
            vip_price REAL,
            booked_seats TEXT DEFAULT '[]',
            FOREIGN KEY (movie_id) REFERENCES movies (id)
        )
    ''')

    # Create Bookings Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            booking_code TEXT UNIQUE NOT NULL,
            movie_title TEXT NOT NULL,
            screen_name TEXT NOT NULL,
            show_date TEXT NOT NULL,
            show_time TEXT NOT NULL,
            customer_name TEXT NOT NULL,
            customer_email TEXT NOT NULL,
            customer_phone TEXT NOT NULL,
            seats TEXT NOT NULL,
            total_amount REAL NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    conn.commit()

    # Check if seeding is needed
    cursor.execute('SELECT COUNT(*) FROM movies')
    count = cursor.fetchone()[0]

    if count == 0:
        seed_data(cursor)
        conn.commit()

    conn.close()

def seed_data(cursor):
    movies = [
        (
            "Jawan: Extended Cut",
            "Action, Thriller",
            8.4,
            "2h 49m",
            "Hindi / Tamil / Telugu",
            "IMAX 4K, 2D",
            "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1600&q=80",
            "A high-octane action thriller highlighting the emotional journey of a man driven to rectify the wrongs in society.",
            250.0,
            "2024",
            1
        ),
        (
            "Interstellar: Special Screening",
            "Sci-Fi, Adventure",
            8.7,
            "2h 49m",
            "English, Hindi",
            "IMAX 70mm, 3D",
            "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1600&q=80",
            "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
            350.0,
            "2024",
            1
        ),
        (
            "Stree 2: Sarkate Ka Aatank",
            "Comedy, Horror",
            8.1,
            "2h 27m",
            "Hindi",
            "2D, Dolby Atmos",
            "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80",
            "The town of Chanderi is haunted once again, this time by a headless entity abducting women. Bikram and team return!",
            220.0,
            "2024",
            1
        ),
        (
            "Kalki 2898 AD",
            "Sci-Fi, Action, Epic",
            7.9,
            "3h 01m",
            "Hindi, Telugu, Tamil",
            "IMAX 3D, 4DX",
            "https://images.unsplash.com/photo-1514539079130-25950c84af65?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1600&q=80",
            "A modern avatar of Vishnu descends to Earth to protect the world from evil forces in a dystopian post-apocalyptic future.",
            300.0,
            "2024",
            0
        ),
        (
            "Oppenheimer",
            "Biography, Drama",
            8.9,
            "3h 00m",
            "English, Hindi",
            "IMAX 70mm",
            "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1600&q=80",
            "The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.",
            320.0,
            "2024",
            0
        ),
        (
            "Spider-Man: Across the Spider-Verse",
            "Animation, Action",
            8.7,
            "2h 20m",
            "English, Hindi, Tamil",
            "3D, 2D",
            "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1600&q=80",
            "Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People charged with protecting its existence.",
            240.0,
            "2024",
            0
        )
    ]

    cursor.executemany('''
        INSERT INTO movies (title, genre, rating, duration, language, format, poster_url, banner_url, description, price, release_date, is_featured)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', movies)

    # Seed showtimes for each movie
    cursor.execute('SELECT id, price FROM movies')
    movie_list = cursor.fetchall()

    dates = ["2026-09-07", "2026-09-08", "2026-09-09"]
    times = ["10:30 AM", "02:15 PM", "06:00 PM", "09:30 PM"]
    screens = ["Screen 1 - Dolby Atmos", "Screen 2 - IMAX 3D", "Screen 3 - VIP Luxe"]

    for m_id, base_price in movie_list:
        for idx, d in enumerate(dates):
            for t_idx, t in enumerate(times):
                screen = screens[(m_id + idx + t_idx) % len(screens)]
                std_price = base_price
                prm_price = base_price + 60
                vip_price = base_price + 150
                # Pre-book a couple of random seats for realistic experience
                booked = ["A3", "A4", "C5"] if idx == 0 and t_idx == 1 else []
                
                cursor.execute('''
                    INSERT INTO showtimes (movie_id, screen_name, show_date, show_time, standard_price, prime_price, vip_price, booked_seats)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (m_id, screen, d, t, std_price, prm_price, vip_price, json.dumps(booked)))

if __name__ == '__main__':
    init_db()
    print("Database initialized and seeded successfully!")
