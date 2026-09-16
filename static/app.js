// State Management
const state = {
    movies: [],
    selectedMovie: null,
    showtimes: [],
    selectedShowtime: null,
    selectedDate: null,
    selectedSeats: [],
    totalPrice: 0,
    currentGenre: 'all',
    searchQuery: '',
    sortBy: 'featured',
    favoritesOnly: false,
    favorites: JSON.parse(localStorage.getItem('cineverse-favorites') || '[]')
};

// DOM Elements
const moviesGrid = document.getElementById('moviesGrid');
const searchInput = document.getElementById('searchInput');
const genreFilters = document.getElementById('genreFilters');
const sortMovies = document.getElementById('sortMovies');
const favoritesFilterBtn = document.getElementById('favoritesFilterBtn');
const favoritesCount = document.getElementById('favoritesCount');

// Hero elements
const heroTitle = document.getElementById('heroTitle');
const heroRating = document.getElementById('heroRating');
const heroDuration = document.getElementById('heroDuration');
const heroGenre = document.getElementById('heroGenre');
const heroDesc = document.getElementById('heroDesc');
const heroBanner = document.getElementById('heroBanner');
const heroBookBtn = document.getElementById('heroBookBtn');

// Modals
const bookingModal = document.getElementById('bookingModal');
const closeBookingModal = document.getElementById('closeBookingModal');

const checkoutModal = document.getElementById('checkoutModal');
const closeCheckoutModal = document.getElementById('closeCheckoutModal');

const ticketModal = document.getElementById('ticketModal');
const closeTicketModal = document.getElementById('closeTicketModal');

const myBookingsModal = document.getElementById('myBookingsModal');
const openMyBookingsBtn = document.getElementById('openMyBookingsBtn');
const closeMyBookingsModal = document.getElementById('closeMyBookingsModal');

// Booking Modal elements
const modalMovieTitle = document.getElementById('modalMovieTitle');
const modalMovieMeta = document.getElementById('modalMovieMeta');
const datePills = document.getElementById('datePills');
const timePills = document.getElementById('timePills');
const seatMatrix = document.getElementById('seatMatrix');
const selectedSeatsList = document.getElementById('selectedSeatsList');
const totalPriceEl = document.getElementById('totalPrice');
const proceedToCheckoutBtn = document.getElementById('proceedToCheckoutBtn');

// Checkout Form
const checkoutForm = document.getElementById('checkoutForm');
const summaryMovie = document.getElementById('summaryMovie');
const summaryScreen = document.getElementById('summaryScreen');
const summaryDate = document.getElementById('summaryDate');
const summarySeats = document.getElementById('summarySeats');
const summaryTotal = document.getElementById('summaryTotal');

// Ticket Elements
const tktMovie = document.getElementById('tktMovie');
const tktCode = document.getElementById('tktCode');
const tktGuest = document.getElementById('tktGuest');
const tktDateTime = document.getElementById('tktDateTime');
const tktSeats = document.getElementById('tktSeats');
const tktAmount = document.getElementById('tktAmount');
const finishTicketBtn = document.getElementById('finishTicketBtn');

// Lookup Elements
const lookupInput = document.getElementById('lookupInput');
const searchLookupBtn = document.getElementById('searchLookupBtn');
const bookingsResultList = document.getElementById('bookingsResultList');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    fetchMovies();
    setupEventListeners();
});

// Event Listeners Setup
function setupEventListeners() {
    // Search input
    searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        renderMovies();
    });

    // Genre filter pills
    genreFilters.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-pill')) {
            document.querySelectorAll('.filter-pill').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            state.currentGenre = e.target.dataset.genre;
            renderMovies();
        }
    });

    sortMovies.addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        renderMovies();
    });

    favoritesFilterBtn.addEventListener('click', () => {
        state.favoritesOnly = !state.favoritesOnly;
        favoritesFilterBtn.classList.toggle('active', state.favoritesOnly);
        renderMovies();
    });

    // Modal close triggers
    closeBookingModal.addEventListener('click', () => closeModal(bookingModal));
    closeCheckoutModal.addEventListener('click', () => closeModal(checkoutModal));
    closeTicketModal.addEventListener('click', () => closeModal(ticketModal));
    closeMyBookingsModal.addEventListener('click', () => closeModal(myBookingsModal));

    openMyBookingsBtn.addEventListener('click', () => openModal(myBookingsModal));

    // Hero Book Button
    heroBookBtn.addEventListener('click', () => {
        if (state.movies.length > 0) {
            openBookingModal(state.movies[0]);
        }
    });

    // Proceed to Checkout
    proceedToCheckoutBtn.addEventListener('click', () => {
        if (state.selectedSeats.length === 0) return;
        
        summaryMovie.textContent = state.selectedMovie.title;
        summaryScreen.textContent = `${state.selectedShowtime.screen_name} | ${state.selectedShowtime.show_time}`;
        summaryDate.textContent = state.selectedShowtime.show_date;
        summarySeats.textContent = state.selectedSeats.join(', ');
        summaryTotal.textContent = `₹${state.totalPrice}`;

        closeModal(bookingModal);
        openModal(checkoutModal);
    });

    // Checkout Form Submit
    checkoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const payload = {
            showtime_id: state.selectedShowtime.id,
            customer_name: document.getElementById('custName').value,
            customer_email: document.getElementById('custEmail').value,
            customer_phone: document.getElementById('custPhone').value,
            seats: state.selectedSeats,
            total_amount: state.totalPrice
        };

        const submitBtn = document.getElementById('payNowBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing Payment...';

        try {
            const response = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (result.status === 'success') {
                displayTicket(result.booking);
                closeModal(checkoutModal);
                openModal(ticketModal);
                checkoutForm.reset();
            } else {
                alert(result.message || 'Booking failed. Please try again.');
            }
        } catch (err) {
            alert('Server error while processing booking.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-shield-halved"></i> Pay & Book Now';
        }
    });

    finishTicketBtn.addEventListener('click', () => {
        closeModal(ticketModal);
    });

    // My Bookings Search Lookup
    searchLookupBtn.addEventListener('click', fetchMyBookings);
}

// Fetch Movies from Flask API
async function fetchMovies() {
    try {
        const response = await fetch('/api/movies');
        const res = await response.json();
        if (res.status === 'success') {
            state.movies = res.data;
            if (state.movies.length > 0) {
                updateHero(state.movies[0]);
            }
            renderMovies();
        }
    } catch (err) {
        moviesGrid.innerHTML = '<div class="empty-state"><p>Unable to load movies. Server offline.</p></div>';
    }
}

// Update Featured Hero Banner
function updateHero(movie) {
    heroTitle.textContent = movie.title;
    heroRating.innerHTML = `<i class="fa-solid fa-star text-gold"></i> ${movie.rating}/10`;
    heroDuration.textContent = movie.duration;
    heroGenre.textContent = movie.genre;
    heroDesc.textContent = movie.description;
    heroBanner.style.backgroundImage = `url('${movie.banner_url || movie.poster_url}')`;
}

// Render Movies Grid
function renderMovies() {
    const filtered = state.movies.filter(m => {
        const matchSearch = m.title.toLowerCase().includes(state.searchQuery.toLowerCase()) || 
                            m.genre.toLowerCase().includes(state.searchQuery.toLowerCase());
        const matchGenre = state.currentGenre === 'all' || m.genre.toLowerCase().includes(state.currentGenre);
        const matchFavorite = !state.favoritesOnly || state.favorites.includes(m.id);
        return matchSearch && matchGenre && matchFavorite;
    }).sort((a, b) => {
        if (state.sortBy === 'rating') return b.rating - a.rating;
        if (state.sortBy === 'price-low') return a.price - b.price;
        if (state.sortBy === 'title') return a.title.localeCompare(b.title);
        return b.is_featured - a.is_featured || a.id - b.id;
    });

    favoritesCount.textContent = state.favorites.length;

    if (filtered.length === 0) {
        moviesGrid.innerHTML = '<div class="empty-state" style="grid-column: 1/-1; text-align:center; padding: 3rem;"><p>No movies found matching your criteria.</p></div>';
        return;
    }

    moviesGrid.innerHTML = filtered.map(movie => `
        <div class="movie-card">
            <div class="poster-wrapper">
                <img src="${movie.poster_url}" alt="${movie.title}">
                <span class="rating-badge"><i class="fa-solid fa-star"></i> ${movie.rating}</span>
                <button class="favorite-btn ${state.favorites.includes(movie.id) ? 'active' : ''}" onclick="toggleFavorite(${movie.id})" aria-label="${state.favorites.includes(movie.id) ? 'Remove from favorites' : 'Add to favorites'}">
                    <i class="fa-${state.favorites.includes(movie.id) ? 'solid' : 'regular'} fa-heart"></i>
                </button>
            </div>
            <div class="movie-content">
                <h3 class="movie-title" title="${movie.title}">${movie.title}</h3>
                <p class="movie-info-tags">${movie.language} • ${movie.duration}</p>
                <p class="movie-genre">${movie.genre}</p>
                <div class="movie-card-action">
                    <button class="btn btn-primary btn-block" onclick="openBookingModalById(${movie.id})">
                        <i class="fa-solid fa-ticket"></i> Book Tickets
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

window.toggleFavorite = function(movieId) {
    const index = state.favorites.indexOf(movieId);
    if (index === -1) state.favorites.push(movieId);
    else state.favorites.splice(index, 1);
    localStorage.setItem('cineverse-favorites', JSON.stringify(state.favorites));
    renderMovies();
};

// Open Booking Modal for a specific Movie
window.openBookingModalById = function(movieId) {
    const movie = state.movies.find(m => m.id === movieId);
    if (movie) openBookingModal(movie);
};

async function openBookingModal(movie) {
    state.selectedMovie = movie;
    state.selectedSeats = [];
    state.totalPrice = 0;

    modalMovieTitle.textContent = movie.title;
    modalMovieMeta.textContent = `${movie.language} | ${movie.format} | ${movie.duration}`;

    updateBookingSummary();
    openModal(bookingModal);

    // Fetch Showtimes for this Movie
    try {
        const res = await fetch(`/api/showtimes/${movie.id}`);
        const data = await res.json();
        if (data.status === 'success') {
            state.showtimes = data.data;
            setupShowtimeSelectors();
        }
    } catch (err) {
        console.error("Failed to load showtimes", err);
    }
}

// Setup Date & Time Pills
function setupShowtimeSelectors() {
    // Unique Dates
    const uniqueDates = [...new Set(state.showtimes.map(st => st.show_date))];
    state.selectedDate = uniqueDates[0];

    datePills.innerHTML = uniqueDates.map((d, idx) => `
        <button class="pill-btn ${idx === 0 ? 'active' : ''}" onclick="selectDate('${d}', this)">
            ${formatDateLabel(d)}
        </button>
    `).join('');

    renderTimePills();
}

window.selectDate = function(dateStr, btnElement) {
    document.querySelectorAll('#datePills .pill-btn').forEach(b => b.classList.remove('active'));
    btnElement.classList.add('active');
    state.selectedDate = dateStr;
    renderTimePills();
};

function renderTimePills() {
    const availableShowtimes = state.showtimes.filter(st => st.show_date === state.selectedDate);
    
    if (availableShowtimes.length === 0) {
        timePills.innerHTML = '<span class="text-muted">No shows available for selected date.</span>';
        return;
    }

    state.selectedShowtime = availableShowtimes[0];

    timePills.innerHTML = availableShowtimes.map((st, idx) => `
        <button class="pill-btn ${idx === 0 ? 'active' : ''}" onclick="selectShowtime(${st.id}, this)">
            ${st.show_time} (${st.screen_name.split(' - ')[0]})
        </button>
    `).join('');

    renderSeatMatrix();
}

window.selectShowtime = function(showtimeId, btnElement) {
    document.querySelectorAll('#timePills .pill-btn').forEach(b => b.classList.remove('active'));
    btnElement.classList.add('active');
    state.selectedShowtime = state.showtimes.find(st => st.id === showtimeId);
    state.selectedSeats = [];
    state.totalPrice = 0;
    updateBookingSummary();
    renderSeatMatrix();
};

// Render Seat Grid Matrix (Rows A to H, 10 Seats each)
function renderSeatMatrix() {
    if (!state.selectedShowtime) return;

    const bookedSeats = state.selectedShowtime.booked_seats || [];
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const seatsPerRow = 10;

    let html = '';

    rows.forEach(row => {
        const isVIP = (row === 'A' || row === 'B');
        const price = isVIP ? state.selectedShowtime.vip_price : 
                     (row === 'C' || row === 'D' || row === 'E' || row === 'F' ? state.selectedShowtime.prime_price : state.selectedShowtime.standard_price);

        html += `
            <div class="seat-row">
                <span class="row-label">${row}</span>
                <div class="seats-group">
        `;

        for (let i = 1; i <= seatsPerRow; i++) {
            const seatId = `${row}${i}`;
            const isBooked = bookedSeats.includes(seatId);
            const isSelected = state.selectedSeats.includes(seatId);

            let seatClass = 'seat-available';
            if (isVIP) seatClass += ' seat-vip';
            if (isBooked) seatClass = 'seat-booked';
            if (isSelected) seatClass += ' seat-selected';

            html += `
                <div class="seat-item ${seatClass}" 
                     data-seat="${seatId}" 
                     data-price="${price}"
                     ${isBooked ? '' : `onclick="toggleSeatSelection('${seatId}', ${price}, this)"`}>
                    ${i}
                </div>
            `;
        }

        html += `
                </div>
            </div>
        `;
    });

    seatMatrix.innerHTML = html;
}

// Toggle Seat Selection State
window.toggleSeatSelection = function(seatId, price, element) {
    const index = state.selectedSeats.indexOf(seatId);
    
    if (index > -1) {
        // Deselect
        state.selectedSeats.splice(index, 1);
        element.classList.remove('seat-selected');
    } else {
        // Select (Max 8 seats)
        if (state.selectedSeats.length >= 8) {
            alert('You can select a maximum of 8 seats per booking.');
            return;
        }
        state.selectedSeats.push(seatId);
        element.classList.add('seat-selected');
    }

    calculateTotal();
};

function calculateTotal() {
    let total = 0;
    if (state.selectedShowtime) {
        state.selectedSeats.forEach(seatId => {
            const row = seatId.charAt(0);
            if (row === 'A' || row === 'B') total += state.selectedShowtime.vip_price;
            else if (['C', 'D', 'E', 'F'].includes(row)) total += state.selectedShowtime.prime_price;
            else total += state.selectedShowtime.standard_price;
        });
    }
    state.totalPrice = total;
    updateBookingSummary();
}

function updateBookingSummary() {
    selectedSeatsList.textContent = state.selectedSeats.length > 0 ? state.selectedSeats.join(', ') : 'None';
    totalPriceEl.textContent = `₹${state.totalPrice}`;
    proceedToCheckoutBtn.disabled = state.selectedSeats.length === 0;
}

// Format Date Label
function formatDateLabel(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// Display Digital Ticket
function displayTicket(booking) {
    tktMovie.textContent = booking.movie_title;
    tktCode.textContent = booking.booking_code;
    tktGuest.textContent = booking.customer_name;
    tktDateTime.textContent = `${booking.show_date} • ${booking.show_time}`;
    tktSeats.textContent = `${booking.screen_name} | Seats: ${booking.seats.join(', ')}`;
    tktAmount.textContent = `Paid: ₹${booking.total_amount}`;
}

// Fetch My Bookings
async function fetchMyBookings() {
    const query = lookupInput.value.trim();
    if (!query) return;

    bookingsResultList.innerHTML = '<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> Searching...</div>';

    try {
        const res = await fetch(`/api/bookings/${encodeURIComponent(query)}`);
        const data = await res.json();

        if (data.status === 'success' && data.data.length > 0) {
            bookingsResultList.innerHTML = data.data.map(b => `
                <div class="booking-item-card">
                    <div>
                        <h4>${b.movie_title}</h4>
                        <p style="font-size: 0.85rem; color: #9ca3af;">Code: <strong style="color: #60a5fa;">${b.booking_code}</strong> | ${b.show_date} at ${b.show_time}</p>
                        <p style="font-size: 0.85rem; color: #d1d5db;">Seats: ${b.seats.join(', ')} (${b.screen_name})</p>
                    </div>
                    <div>
                        <button class="btn btn-secondary btn-sm" onclick="viewTicketFromHistory('${b.booking_code}')">
                            <i class="fa-solid fa-eye"></i> View Ticket
                        </button>
                    </div>
                </div>
            `).join('');
        } else {
            bookingsResultList.innerHTML = '<div class="empty-state"><p>No bookings found matching your search.</p></div>';
        }
    } catch (err) {
        bookingsResultList.innerHTML = '<div class="empty-state"><p>Error searching bookings.</p></div>';
    }
}

window.viewTicketFromHistory = async function(bookingCode) {
    try {
        const res = await fetch(`/api/bookings/${bookingCode}`);
        const data = await res.json();
        if (data.status === 'success' && data.data.length > 0) {
            displayTicket(data.data[0]);
            closeModal(myBookingsModal);
            openModal(ticketModal);
        }
    } catch (err) {
        alert('Could not retrieve ticket.');
    }
};

// Modal Helpers
function openModal(modalEl) {
    modalEl.classList.add('active');
}

function closeModal(modalEl) {
    modalEl.classList.remove('active');
}
