import unittest
import json
from app import app

class MovieBookingTestCase(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_get_movies(self):
        response = self.app.get('/api/movies')
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['status'], 'success')
        self.assertTrue(len(data['data']) > 0)
        print("✓ Test GET /api/movies passed. Found", len(data['data']), "movies.")

    def test_get_showtimes(self):
        response = self.app.get('/api/showtimes/1')
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['status'], 'success')
        self.assertTrue(len(data['data']) > 0)
        print("✓ Test GET /api/showtimes/1 passed. Found", len(data['data']), "showtimes.")

    def test_booking_flow(self):
        showtime_res = self.app.get('/api/showtimes/1')
        showtime = json.loads(showtime_res.data)['data'][0]
        booked_seats = set(showtime['booked_seats'])
        all_seats = [f'{row}{number}' for row in 'ABCDEFGH' for number in range(1, 11)]
        seats = [seat for seat in all_seats if seat not in booked_seats][:2]
        booking_payload = {
            "showtime_id": 1,
            "customer_name": "Test User",
            "customer_email": "test@example.com",
            "customer_phone": "9998887770",
            "seats": seats,
            "total_amount": 500.0
        }
        response = self.app.post(
            '/api/bookings',
            data=json.dumps(booking_payload),
            content_type='application/json'
        )
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(data['status'], 'success')
        booking_code = data['booking']['booking_code']
        print("✓ Test POST /api/bookings passed. Created booking code:", booking_code)

        # Retrieve booking
        get_res = self.app.get(f'/api/bookings/{booking_code}')
        get_data = json.loads(get_res.data)
        self.assertEqual(get_res.status_code, 200)
        self.assertEqual(len(get_data['data']), 1)
        print("✓ Test GET /api/bookings/<code passed. Retrieved ticket successfully.")

if __name__ == '__main__':
    unittest.main()
