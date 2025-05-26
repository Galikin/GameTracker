// IGDB API configuration
const IGDB_CLIENT_ID = '3h4ewrzdst7vrv3ul4bfk5j3j6knej';
const IGDB_CLIENT_SECRET = '3blyx761rigtlqk9i1tmhjer5oh703';

// Function to get access token
async function getAccessToken() {
    try {
        const response = await fetch('https://id.twitch.tv/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                client_id: IGDB_CLIENT_ID,
                client_secret: IGDB_CLIENT_SECRET,
                grant_type: 'client_credentials'
            })
        });
        const data = await response.json();
        return data.access_token;
    } catch (error) {
        console.error('Error getting access token:', error);
        return null;
    }
}

// Initialize IGDB client with access token
async function initializeIGDB() {
    const accessToken = await getAccessToken();
    if (!accessToken) {
        console.error('Failed to get access token');
        return;
    }
    window.igdb = new IGDBClient(IGDB_CLIENT_ID, accessToken);
    initializeGameSearch();
}

// Search games function
async function searchGames(query) {
    try {
        const response = await window.igdb.games({
            search: query,
            fields: ['name', 'cover.url', 'genres.name', 'platforms.name'],
            limit: 5
        });
        return response;
    } catch (error) {
        console.error('Error searching IGDB:', error);
        return [];
    }
}

// Get game details function
async function getGameDetails(gameId) {
    try {
        const response = await window.igdb.games({
            ids: [gameId],
            fields: ['name', 'cover.url', 'genres.name', 'platforms.name', 'summary']
        });
        return response[0];
    } catch (error) {
        console.error('Error fetching game details:', error);
        return null;
    }
}

// Create autocomplete dropdown
function createAutocompleteDropdown() {
    const dropdown = document.createElement('div');
    dropdown.className = 'autocomplete-dropdown';
    dropdown.style.display = 'none';
    document.querySelector('.form-group').appendChild(dropdown);
    return dropdown;
}

// Initialize autocomplete
function initializeGameSearch() {
    const gameTitleInput = document.getElementById('gameTitle');
    const dropdown = createAutocompleteDropdown();
    let selectedGame = null;

    gameTitleInput.addEventListener('input', async (e) => {
        const query = e.target.value;
        if (query.length < 2) {
            dropdown.style.display = 'none';
            return;
        }

        const games = await searchGames(query);
        if (games.length === 0) {
            dropdown.style.display = 'none';
            return;
        }

        dropdown.innerHTML = games.map(game => `
            <div class="autocomplete-item" data-game-id="${game.id}">
                <img src="${game.cover ? `https:${game.cover.url.replace('thumb', 'cover_small')}` : 'placeholder.jpg'}" 
                     alt="${game.name}" 
                     style="width: 40px; height: 40px; object-fit: cover;">
                <span>${game.name}</span>
            </div>
        `).join('');
        dropdown.style.display = 'block';
    });

    dropdown.addEventListener('click', async (e) => {
        const item = e.target.closest('.autocomplete-item');
        if (!item) return;

        const gameId = item.dataset.gameId;
        const game = await getGameDetails(gameId);
        if (game) {
            selectedGame = game;
            gameTitleInput.value = game.name;
            dropdown.style.display = 'none';

            // Update genre field if available
            if (game.genres && game.genres.length > 0) {
                document.getElementById('genre').value = game.genres.map(g => g.name).join(', ');
            }

            // Store the cover URL in a data attribute
            gameTitleInput.dataset.coverUrl = game.cover ? `https:${game.cover.url.replace('thumb', 'cover_big')}` : null;
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.autocomplete-dropdown') && !e.target.closest('#gameTitle')) {
            dropdown.style.display = 'none';
        }
    });
}

// Add styles for autocomplete
const style = document.createElement('style');
style.textContent = `
    .autocomplete-dropdown {
        position: absolute;
        background: white;
        border: 1px solid #ddd;
        border-radius: 4px;
        max-height: 200px;
        overflow-y: auto;
        width: 100%;
        z-index: 1000;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .autocomplete-item {
        display: flex;
        align-items: center;
        padding: 8px;
        cursor: pointer;
        gap: 10px;
    }

    .autocomplete-item:hover {
        background: #f5f5f5;
    }

    .form-group {
        position: relative;
    }
`;
document.head.appendChild(style);

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeIGDB); 