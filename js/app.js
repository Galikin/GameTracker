// Supabase configuration
const SUPABASE_URL = 'https://mnbtdwksrwhboyfrkxqf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1uYnRkd2tzcndoYm95ZnJreHFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyMjAzNDAsImV4cCI6MjA2Mzc5NjM0MH0.kdKVhO7N3ecPgu4nOakQ98J2hMHi1lGgP9rcII4DCH8';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let games = [];
let filteredGames = [];

// Load games from database
async function loadGames() {
    try {
        const { data, error } = await supabase
            .from('games')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Error loading from Supabase:', error);
            throw error;
        }
        
        games = data || [];
        console.log('Loaded games from Supabase:', games.length);
        
        // Update display after loading
        updateDisplay();
    } catch (error) {
        console.error('Error in loadGames:', error);
        // Fallback to localStorage
        loadFromLocalStorage();
    }
}

// Fallback to localStorage
function loadFromLocalStorage() {
    const saved = localStorage.getItem('gamingCollection');
    games = saved ? JSON.parse(saved) : [];
    console.log('Loaded games from localStorage:', games.length);
}

// Save to localStorage as backup
function saveToLocalStorage() {
    localStorage.setItem('gamingCollection', JSON.stringify(games));
}

// Save game to collection
async function saveGame(gameData) {
    try {
        const newGame = {
            title: gameData.title,
            platform: gameData.platform,
            genre: gameData.genre,
            status: gameData.status,
            rating: gameData.rating || null,
            hours_played: gameData.hoursPlayed || 0,
            cover_url: gameData.cover_url || null,
            date_added: new Date().toLocaleDateString(),
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('games')
            .insert([newGame])
            .select();
        
        if (error) {
            console.error('Error saving to Supabase:', error);
            throw error;
        }
        
        if (data && data[0]) {
            games.unshift(data[0]);
            console.log('Game saved to Supabase:', data[0]);
        }
        
        // Update display after saving
        updateDisplay();
    } catch (error) {
        console.error('Error in saveGame:', error);
        // Fallback to local storage
        const localGame = {
            ...gameData,
            id: Date.now(),
            dateAdded: new Date().toLocaleDateString(),
            created_at: new Date().toISOString()
        };
        games.unshift(localGame);
        saveToLocalStorage();
        updateDisplay();
    }
}

// Update statistics
function updateStats() {
    const total = games.length;
    const completed = games.filter(g => g.status === 'completed').length;
    const playing = games.filter(g => g.status === 'playing').length;
    const owned = games.filter(g => g.status === 'owned').length;

    document.getElementById('totalGames').textContent = total;
    document.getElementById('completedGames').textContent = completed;
    document.getElementById('currentlyPlaying').textContent = playing;
    document.getElementById('backlogCount').textContent = backlog;
}

// Update platform filter options
function updatePlatformFilter() {
    const platforms = [...new Set(games.map(g => g.platform))];
    const filterSelect = document.getElementById('filterPlatform');
    
    // Clear existing options except "All Platforms"
    filterSelect.innerHTML = '<option value="">All Platforms</option>';
    
    platforms.forEach(platform => {
        const option = document.createElement('option');
        option.value = platform;
        option.textContent = platform;
        filterSelect.appendChild(option);
    });
}

// Filter and search games
function filterGames() {
    const platformFilter = document.getElementById('filterPlatform').value;
    const statusFilter = document.getElementById('filterStatus').value;
    const searchTerm = document.getElementById('searchGames').value.toLowerCase();

    filteredGames = games.filter(game => {
        const matchesPlatform = !platformFilter || game.platform === platformFilter;
        const matchesStatus = !statusFilter || game.status === statusFilter;
        const matchesSearch = !searchTerm || 
            game.title.toLowerCase().includes(searchTerm) ||
            game.genre.toLowerCase().includes(searchTerm);

        return matchesPlatform && matchesStatus && matchesSearch;
    });

    displayGames();
}

// Display games
function displayGames() {
    const container = document.getElementById('gamesContainer');
    const emptyState = document.getElementById('emptyState');

    if (filteredGames.length === 0) {
        container.style.display = 'none';
        emptyState.style.display = 'block';
        emptyState.innerHTML = games.length === 0 ? 
            '<p>No games in your collection yet. Add your first game above!</p>' :
            '<p>No games match your current filters.</p>';
        return;
    }

    container.style.display = 'grid';
    emptyState.style.display = 'none';

    container.innerHTML = filteredGames.map(game => `
        <div class="game-card">
            <div class="status-badge status-${game.status}">${game.status.charAt(0).toUpperCase() + game.status.slice(1)}</div>
            ${game.cover_url ? `<img src="${game.cover_url}" alt="${game.title}" class="game-cover">` : ''}
            <div class="platform-tag">${game.platform}</div>
            <div class="game-title">${game.title}</div>
            <div class="game-info">
                <div class="info-item">
                    <div class="info-label">Genre</div>
                    <div class="info-value">${game.genre || 'Not specified'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Rating</div>
                    <div class="info-value">${game.rating ? game.rating + '/10' : 'Not rated'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Hours Played</div>
                    <div class="info-value">${game.hoursPlayed || 0}h</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Date Added</div>
                    <div class="info-value">${game.dateAdded}</div>
                </div>
            </div>
            <button class="delete-btn" onclick="deleteGame(${game.id})">Delete</button>
        </div>
    `).join('');
}

// Delete game
async function deleteGame(id) {
    if (confirm('Are you sure you want to delete this game?')) {
        try {
            const { error } = await supabase
                .from('games')
                .delete()
                .eq('id', id);
            
            if (error) {
                console.error('Error deleting from Supabase:', error);
                throw error;
            }
            
            console.log('Game deleted from Supabase');
            games = games.filter(game => game.id !== id);
            updateDisplay();
        } catch (error) {
            console.error('Error in deleteGame:', error);
            alert('Failed to delete game. Please try again.');
        }
    }
}

// Update entire display
function updateDisplay() {
    updateStats();
    updatePlatformFilter();
    filterGames();
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Form submission
    document.getElementById('gameForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const gameData = {
            title: document.getElementById('gameTitle').value,
            platform: document.getElementById('platform').value,
            genre: document.getElementById('genre').value,
            status: document.getElementById('status').value,
            rating: document.getElementById('rating').value || null,
            hoursPlayed: document.getElementById('hoursPlayed').value || 0
        };

        saveGame(gameData);
        this.reset();
    });

    // Filter event listeners
    document.getElementById('filterPlatform').addEventListener('change', filterGames);
    document.getElementById('filterStatus').addEventListener('change', filterGames);
    document.getElementById('searchGames').addEventListener('input', filterGames);

    // Load initial data
    loadGames();
}); 