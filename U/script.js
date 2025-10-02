// Main script for StreamFlix homepage
document.addEventListener('DOMContentLoaded', async function() {
    // Initialize the app
    await initializeApp();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load movies
    await loadAllMovies();
    
    // Check if we should focus search (from movie details page)
    checkSearchFocus();
    
    // Setup bottom navigation
    setupBottomNavigation();
    
    // Setup advanced search
    setupAdvancedSearch();
    
    // Load categories from admin panel
    loadCategoriesFromAdmin();
    
    // Setup hamburger menu
    setupHamburgerMenu();
    
    // Load navigation settings
    loadNavigationSettings();
    
    // Initialize legal pages and request functionality
    initializeLegalAndRequest();
});

let currentTab = 'home';
let watchlist = JSON.parse(localStorage.getItem('streamflix_watchlist') || '[]');
let allMoviesData = []; // Store all movies for advanced search
let movieCategories = [];
let seriesCategories = [];

// Check if search should be focused
function checkSearchFocus() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Check if we should switch to search tab
    const targetTab = urlParams.get('tab');
    if (targetTab === 'search') {
        // Switch to search tab
        switchTab('search');
    }
    
    // Check if we should focus search input
    if (urlParams.get('focus_search') === 'true') {
        // Delay focus to ensure tab switch is complete
        setTimeout(() => {
            const advancedSearchInput = document.getElementById('advancedSearchInput');
            if (advancedSearchInput) {
                advancedSearchInput.focus();
            }
        }, 200);
    }
    
    // Clean up URL
    window.history.replaceState({}, document.title, window.location.pathname);
}

// Initialize application
async function initializeApp() {
    console.log('StreamFlix initialized');
}

// Set up all event listeners
function setupEventListeners() {
    // No longer using top-right search - only advanced search in tab
    // Advanced search will be set up in setupAdvancedSearch()
}

// Setup bottom navigation
function setupBottomNavigation() {
    const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
    
    bottomNavItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const tab = this.getAttribute('data-tab');
            switchTab(tab);
        });
    });
}

// Switch between tabs
function switchTab(tab) {
    // Update active nav item
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    
    // Hide all sections first
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Show sections for current tab
    if (tab === 'home') {
        document.querySelectorAll('section:not(#searchResults):not(#advancedSearchSection):not(#seriesSection):not(#watchlistSection)').forEach(section => {
            section.classList.remove('hidden');
        });
    } else if (tab === 'search') {
        document.getElementById('advancedSearchSection').classList.remove('hidden');
        // Focus on advanced search input
        setTimeout(() => {
            document.getElementById('advancedSearchInput').focus();
        }, 100);
    } else if (tab === 'watchlist') {
        loadWatchlist();
        document.getElementById('watchlistSection').classList.remove('hidden');
    } else if (tab === 'series') {
        loadSeries();
        document.getElementById('seriesSection').classList.remove('hidden');
    }
    
    currentTab = tab;
}

// Load all movies with real-time listener
async function loadAllMovies() {
    console.log('Setting up Firebase real-time listener for movies');
    
    // Ensure Firebase is initialized
    if (!isFirebaseAvailable || !database) {
        console.log('Firebase not available, using localStorage fallback');
        loadMoviesFromLocalStorage();
        return;
    }
    
    try {
        // Set up real-time listener
        database.ref('movies').on('value', (snapshot) => {
            console.log('Firebase snapshot received');
            
            // Hide loading indicators immediately
            hideLoadingIndicators();
            
            if (!snapshot.exists()) {
                console.log('No movies found in database');
                showNoMoviesMessage();
                return;
            }
            
            console.log('Movies data found, processing...');
            const movies = [];
            snapshot.forEach((child) => {
                movies.push({
                    id: child.key,
                    ...child.val()
                });
            });
            
            console.log(`Loaded ${movies.length} movies from Firebase`);
            renderMoviesByCategory(movies);
            
            // Setup real-time views listeners for all movies
            setupRealTimeViewsListeners(movies);
            
        }, (error) => {
            console.error('Firebase listener error:', error);
            hideLoadingIndicators();
            loadMoviesFromLocalStorage(); // Fallback to localStorage
        });
        
    } catch (error) {
        console.error('Error setting up Firebase listener:', error);
        hideLoadingIndicators();
        loadMoviesFromLocalStorage();
    }
}

// Fallback function for localStorage
function loadMoviesFromLocalStorage() {
    console.log('Loading movies from localStorage');
    const movies = JSON.parse(localStorage.getItem('streamflix_movies') || '[]');
    hideLoadingIndicators();
    
    if (movies.length === 0) {
        showNoMoviesMessage();
        return;
    }
    
    renderMoviesByCategory(movies);
}

// Helper function to categorize and render movies
function renderMoviesByCategory(movies) {
    // Store all movies for advanced search
    allMoviesData = movies;
    
    // Filter movies by type (exclude series) and visibility
    const movieData = movies.filter(movie => {
        // Exclude series
        if (movie.type === 'series') return false;
        
        // For category display, only show movies with 'category' visibility or no visibility (default)
        return !movie.visibility || movie.visibility === 'category';
    });
    
    // Get all unique categories from movie data
    const allCategories = [...new Set(movieData.map(movie => movie.category))].filter(cat => cat);
    
    // Update movieCategories with actual data categories
    const combinedMovieCategories = [...new Set([...movieCategories, ...allCategories])];
    movieCategories = combinedMovieCategories;
    
    // Render default categories
    const trendingMovies = movieData.filter(movie => movie.category === 'trending');
    const latestMovies = movieData.filter(movie => movie.category === 'latest');
    const popularMovies = movieData.filter(movie => movie.category === 'popular');
    
    renderMovies('trendingMovies', trendingMovies);
    renderMovies('latestMovies', latestMovies);
    renderMovies('popularMovies', popularMovies);
    
    // Render dynamic categories (excluding default ones)
    const dynamicCategories = allCategories.filter(cat => 
        !['trending', 'latest', 'popular'].includes(cat)
    );
    
    renderDynamicMovieCategories(dynamicCategories, movieData);
    
    // Display category pills for filtering
    displayMovieCategoryPills();
}

// Helper function to hide loading indicators
function hideLoadingIndicators() {
    const containers = ['trendingMovies', 'latestMovies', 'popularMovies'];
    containers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) {
            const loadingElement = container.querySelector('.loading');
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
        }
    });
}

// Helper function to show "No movies found" message
function showNoMoviesMessage() {
    const containers = ['trendingMovies', 'latestMovies', 'popularMovies'];
    containers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '<div class="loading">No movies found</div>';
        }
    });
}

// Render movies in a specific container
function renderMovies(containerId, movies) {
    const container = document.getElementById(containerId);
    
    if (!container) {
        console.error(`Container ${containerId} not found`);
        return;
    }
    
    if (movies.length === 0) {
        container.innerHTML = '<div class="loading">No movies available in this category.</div>';
        return;
    }
    
    container.innerHTML = movies.map(movie => createMovieCard(movie)).join('');
}

// Create a movie card HTML
function createMovieCard(movie) {
    const description = movie.description || 'No description available.';
    const truncatedDescription = description.length > 150 
        ? description.substring(0, 150) + '...' 
        : description;
    
    // Format views count
    const viewsCount = movie.views || 0;
    const formattedViews = formatViewsCount(viewsCount);
    
    return `
        <div class="movie-card" data-movie-id="${movie.id}" onclick="openMovieDetails('${movie.id}')" style="cursor: pointer;">
            <div class="movie-thumbnail">
                <img src="${movie.thumbnail}" alt="${movie.title}" 
                     onerror="this.src='https://via.placeholder.com/400x225/667eea/ffffff?text=Image+Not+Available'; this.onerror=null;">
                <div class="movie-overlay">
                    <div class="play-button-overlay">
                        <i class="fas fa-play"></i>
                    </div>
                </div>
            </div>
            <div class="movie-info">
                <h3 class="movie-title">${escapeHtml(movie.title)}</h3>
                <div class="movie-meta">
                    <span class="views-count" data-movie-id="${movie.id}">
                        <i class="fas fa-eye"></i> ${formattedViews}
                    </span>
                    <span class="movie-type">
                        <i class="fas ${movie.type === 'series' ? 'fa-tv' : 'fa-film'}"></i>
                    </span>
                </div>
                <p class="movie-description">${escapeHtml(truncatedDescription)}</p>
            </div>
        </div>
    `;
}

// Perform search functionality
async function performSearch() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput.value.trim().toLowerCase();
    
    if (!query) {
        hideSearchResults();
        return;
    }
    
    try {
        const movies = await db.getMovies();
        const searchResults = movies.filter(movie => 
            movie.title.toLowerCase().includes(query) ||
            (movie.description && movie.description.toLowerCase().includes(query))
        );
        
        showSearchResults(searchResults, query);
        
        // Switch to search tab if not already there
        if (currentTab !== 'search') {
            switchTab('search');
        }
        
    } catch (error) {
        console.error('Error performing search:', error);
        showError('Search failed. Please try again.');
    }
}

// Show search results
function showSearchResults(results, query) {
    const searchSection = document.getElementById('searchResults');
    const searchGrid = document.getElementById('searchMoviesGrid');
    const noResults = document.getElementById('noResults');
    const sectionTitle = searchSection.querySelector('.section-title');
    
    // Update section title
    sectionTitle.textContent = `Search Results for "${query}"`;
    
    // Show search section
    searchSection.classList.remove('hidden');
    
    if (results.length === 0) {
        searchGrid.innerHTML = '';
        noResults.classList.remove('hidden');
    } else {
        noResults.classList.add('hidden');
        searchGrid.innerHTML = results.map(movie => createMovieCard(movie)).join('');
    }
    
    // Scroll to search results
    searchSection.scrollIntoView({ behavior: 'smooth' });
}

// Hide search results
function hideSearchResults() {
    const searchSection = document.getElementById('searchResults');
    searchSection.classList.add('hidden');
    
    // Switch back to home tab if we're on search tab
    if (currentTab === 'search') {
        switchTab('home');
    }
}

// Load watchlist
function loadWatchlist() {
    const container = document.getElementById('watchlistGrid');
    
    if (watchlist.length === 0) {
        container.innerHTML = '<div class="loading">Your watchlist is empty. Add some movies to see them here!</div>';
        return;
    }
    
    // Sort watchlist by added date (newest first)
    watchlist.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
    
    container.innerHTML = watchlist.map(movie => createMovieCard(movie)).join('');
}

// Load series
async function loadSeries() {
    const container = document.getElementById('seriesGrid');
    
    try {
        container.innerHTML = '<div class="loading">Loading series...</div>';
        
        const movies = await db.getMovies();
        // Filter for series with category visibility or no visibility (default)
        const series = movies.filter(movie => {
            if (movie.type !== 'series' && movie.category !== 'series') return false;
            
            // For category display, only show series with 'category' visibility or no visibility (default)
            return !movie.visibility || movie.visibility === 'category';
        });
        
        if (series.length === 0) {
            container.innerHTML = '<div class="loading">No series available yet.</div>';
            return;
        }
        
        // Sort series by timestamp (newest first)
        series.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        
        container.innerHTML = series.map(movie => createMovieCard(movie)).join('');
        
    } catch (error) {
        console.error('Error loading series:', error);
        container.innerHTML = '<div class="loading">Error loading series.</div>';
    }
}

// Open movie details page
function openMovieDetails(movieId) {
    // Store movie ID in localStorage for the details page
    localStorage.setItem('selectedMovieId', movieId);
    
    // Navigate to movie details page
    window.location.href = 'movie-details.html';
}

// Handle cancel button click (legacy function, no longer used on homepage)
function handleCancel(movieId) {
    console.log(`Cancel clicked for movie ${movieId}`);
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Format views count for display
function formatViewsCount(views) {
    if (views >= 1000000) {
        return (views / 1000000).toFixed(1) + 'M';
    } else if (views >= 1000) {
        return (views / 1000).toFixed(1) + 'K';
    }
    return views.toString();
}

// Setup real-time views listeners for all movies
function setupRealTimeViewsListeners(movies) {
    if (!isFirebaseAvailable || !database) {
        return;
    }
    
    movies.forEach(movie => {
        // Listen for views changes for each movie
        database.ref(`movies/${movie.id}/views`).on('value', (snapshot) => {
            if (snapshot.exists()) {
                const views = snapshot.val();
                updateMovieViewsInUI(movie.id, views);
            }
        });
    });
    
    console.log(`🔍 Real-time views listeners setup for ${movies.length} movies`);
}

// Update movie views in UI elements
function updateMovieViewsInUI(movieId, views) {
    const formattedViews = formatViewsCount(views);
    
    // Update views in movie cards
    const viewsElements = document.querySelectorAll(`[data-movie-id="${movieId}"] .views-count`);
    viewsElements.forEach(element => {
        element.innerHTML = `<i class="fas fa-eye"></i> ${formattedViews}`;
        
        // Add subtle animation
        element.style.animation = 'none';
        setTimeout(() => {
            element.style.animation = 'pulse 0.5s ease';
        }, 10);
    });
    
    // Update in allMoviesData for search functionality
    const movieIndex = allMoviesData.findIndex(m => m.id === movieId);
    if (movieIndex !== -1) {
        allMoviesData[movieIndex].views = views;
    }
}

// Show error message
function showError(message) {
    // Create a temporary error notification
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-notification';
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(244, 67, 54, 0.9);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        z-index: 1000;
        animation: slideInRight 0.3s ease;
    `;
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    // Remove after 5 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Add CSS animation for error notification
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

// Global functions for button handlers
window.handleCancel = handleCancel;
window.openMovieDetails = openMovieDetails;
window.switchTab = switchTab;
window.navigateToHome = navigateToHome;
window.selectSuggestion = selectSuggestion;
window.filterByCategory = filterByCategory;
window.openLegalPage = openLegalPage;
window.closeLegalModal = closeLegalModal;
window.openRequestModal = openRequestModal;
window.closeRequestModal = closeRequestModal;
window.submitRequest = submitRequest;

// Navigate to home function
function navigateToHome() {
    if (currentTab !== 'home') {
        switchTab('home');
    }
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Setup advanced search functionality
function setupAdvancedSearch() {
    const advancedSearchInput = document.getElementById('advancedSearchInput');
    const suggestionsDropdown = document.getElementById('suggestions');
    
    // Advanced search input with improved suggestions
    if (advancedSearchInput) {
        advancedSearchInput.addEventListener('input', function() {
            const query = this.value.trim();
            if (query.length > 0) {
                showImprovedSuggestions(query);
            } else {
                hideSuggestions();
                hideSearchResults();
            }
        });
        
        advancedSearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performAdvancedSearch();
            }
        });
        
        // Hide suggestions when clicking outside
        document.addEventListener('click', function(e) {
            if (!advancedSearchInput.contains(e.target) && !suggestionsDropdown.contains(e.target)) {
                hideSuggestions();
            }
        });
    }
}

// Show suggestions based on search query
function showSuggestions(query) {
    const suggestionsDropdown = document.getElementById('suggestions');
    const suggestions = generateSuggestions(query);
    
    if (suggestions.length === 0) {
        hideSuggestions();
        return;
    }
    
    suggestionsDropdown.innerHTML = suggestions.map(suggestion => 
        `<div class="suggestion-item" onclick="selectSuggestion('${escapeHtml(suggestion)}')">${escapeHtml(suggestion)}</div>`
    ).join('');
    
    suggestionsDropdown.classList.remove('hidden');
}

// Show improved suggestions based on search query
function showImprovedSuggestions(query) {
    const suggestionsDropdown = document.getElementById('suggestions');
    const suggestions = generateImprovedSuggestions(query);
    
    if (suggestions.length === 0) {
        hideSuggestions();
        // Still perform search even without suggestions
        performAdvancedSearch();
        return;
    }
    
    suggestionsDropdown.innerHTML = suggestions.map(suggestion => 
        `<div class="suggestion-item" onclick="selectSuggestion('${escapeHtml(suggestion.title)}')">
            <i class="${suggestion.icon} suggestion-icon"></i>
            <span class="suggestion-text">${escapeHtml(suggestion.title)}</span>
            <span class="suggestion-type">${suggestion.type}</span>
        </div>`
    ).join('');
    
    suggestionsDropdown.classList.remove('hidden');
}

// Generate improved suggestions with fuzzy matching
function generateImprovedSuggestions(query) {
    const suggestions = [];
    const queryLower = query.toLowerCase();
    
    // Score-based matching for better results
    const scoredSuggestions = [];
    
    allMoviesData.forEach(movie => {
        let score = 0;
        let matchType = '';
        
        // Title matching (highest priority)
        if (movie.title.toLowerCase().includes(queryLower)) {
            score += 10;
            if (movie.title.toLowerCase().startsWith(queryLower)) {
                score += 5; // Boost for starts-with matches
            }
            matchType = movie.type === 'series' ? 'Series' : 'Movie';
        }
        
        // Fuzzy matching for partial words (e.g., "Aveng" -> "Avengers")
        const titleWords = movie.title.toLowerCase().split(' ');
        titleWords.forEach(word => {
            if (word.startsWith(queryLower) && queryLower.length >= 2) {
                score += 7;
                matchType = movie.type === 'series' ? 'Series' : 'Movie';
            }
        });
        
        // Description matching (lower priority)
        if (movie.description && movie.description.toLowerCase().includes(queryLower)) {
            score += 3;
            if (!matchType) {
                matchType = movie.type === 'series' ? 'Series' : 'Movie';
            }
        }
        
        // Category matching
        if (movie.category && movie.category.toLowerCase().includes(queryLower)) {
            score += 2;
            if (!matchType) {
                matchType = 'Category';
            }
        }
        
        if (score > 0) {
            scoredSuggestions.push({
                title: movie.title,
                score: score,
                type: matchType,
                icon: movie.type === 'series' ? 'fas fa-tv' : 'fas fa-film'
            });
        }
    });
    
    // Sort by score (descending) and return top 8
    scoredSuggestions.sort((a, b) => b.score - a.score);
    return scoredSuggestions.slice(0, 8);
}

// Hide suggestions dropdown
function hideSuggestions() {
    const suggestionsDropdown = document.getElementById('suggestions');
    suggestionsDropdown.classList.add('hidden');
}

// Generate suggestions based on query
function generateSuggestions(query) {
    const suggestions = new Set();
    const queryLower = query.toLowerCase();
    
    allMoviesData.forEach(movie => {
        // Add movie title if it matches
        if (movie.title.toLowerCase().includes(queryLower)) {
            suggestions.add(movie.title);
        }
        
        // Add description words if they match
        if (movie.description) {
            const words = movie.description.toLowerCase().split(' ');
            words.forEach(word => {
                if (word.includes(queryLower) && word.length > 3) {
                    suggestions.add(word);
                }
            });
        }
        
        // Add category if it matches
        if (movie.category && movie.category.toLowerCase().includes(queryLower)) {
            suggestions.add(movie.category);
        }
    });
    
    return Array.from(suggestions).slice(0, 8); // Limit to 8 suggestions
}

// Select a suggestion
function selectSuggestion(suggestion) {
    const advancedSearchInput = document.getElementById('advancedSearchInput');
    advancedSearchInput.value = suggestion;
    hideSuggestions();
    performAdvancedSearch();
}

// Perform advanced search with improved matching
function performAdvancedSearch() {
    const query = document.getElementById('advancedSearchInput').value.trim().toLowerCase();
    
    let results = allMoviesData;
    
    // Apply search query filter with improved matching
    if (query) {
        results = results.filter(movie => {
            // Exact title match
            if (movie.title.toLowerCase().includes(query)) {
                return true;
            }
            
            // Fuzzy matching for partial words
            const titleWords = movie.title.toLowerCase().split(' ');
            const queryMatches = titleWords.some(word => 
                word.startsWith(query) || query.includes(word.substring(0, 3))
            );
            
            if (queryMatches) {
                return true;
            }
            
            // Description matching
            if (movie.description && movie.description.toLowerCase().includes(query)) {
                return true;
            }
            
            // Category matching
            if (movie.category && movie.category.toLowerCase().includes(query)) {
                return true;
            }
            
            return false;
        });
    }
    
    showAdvancedSearchResults(results, query);
}

// Show advanced search results
function showAdvancedSearchResults(results, query) {
    const resultsSection = document.getElementById('advancedSearchResults');
    const resultsGrid = document.getElementById('advancedSearchGrid');
    const resultsTitle = resultsSection.querySelector('.results-title');
    
    if (query) {
        resultsTitle.textContent = `Search Results for "${query}" (${results.length} found)`;
    } else {
        resultsTitle.textContent = `All Results (${results.length} found)`;
    }
    
    resultsSection.classList.remove('hidden');
    
    if (results.length === 0) {
        resultsGrid.innerHTML = '<div class="loading">No results found. Try a different search term.</div>';
    } else {
        resultsGrid.innerHTML = results.map(movie => createMovieCard(movie)).join('');
    }
    
    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth' });
    hideSuggestions();
}

// Hide search results
function hideSearchResults() {
    const resultsSection = document.getElementById('advancedSearchResults');
    resultsSection.classList.add('hidden');
}

// Load categories from admin panel for sync
function loadCategoriesFromAdmin() {
    // Get categories from localStorage (where admin stores categories)
    const categoryData = JSON.parse(localStorage.getItem('streamflix_categories') || '{}');
    
    if (categoryData.movieCategories) {
        movieCategories = categoryData.movieCategories;
    }
    
    if (categoryData.seriesCategories) {
        seriesCategories = categoryData.seriesCategories;
    }
    
    // Also get categories from movies data as fallback
    const movies = JSON.parse(localStorage.getItem('streamflix_movies') || '[]');
    const movieCategorySet = new Set(movieCategories);
    const seriesCategorySet = new Set(seriesCategories);
    
    movies.forEach(movie => {
        if (movie.category) {
            if (movie.type === 'series') {
                seriesCategorySet.add(movie.category);
            } else {
                movieCategorySet.add(movie.category);
            }
        }
    });
    
    movieCategories = Array.from(movieCategorySet);
    seriesCategories = Array.from(seriesCategorySet);
    
    displayCategoryPills();
    
    // Listen for category updates from admin panel with real-time sync
    window.addEventListener('categoriesUpdated', function(event) {
        console.log('Categories updated event received:', event.detail);
        movieCategories = event.detail.movieCategories || [];
        seriesCategories = event.detail.seriesCategories || [];
        displayCategoryPills();
        
        // Re-render movies to show new categories immediately
        if (allMoviesData.length > 0) {
            renderMoviesByCategory(allMoviesData);
        }
    });
    
    // Listen for storage changes (for real-time sync across tabs)
    window.addEventListener('storage', function(event) {
        if (event.key === 'streamflix_categories') {
            console.log('Categories storage changed, reloading...');
            loadCategoriesFromAdmin();
            
            // Re-render movies to show new categories immediately
            if (allMoviesData.length > 0) {
                renderMoviesByCategory(allMoviesData);
            }
        }
    });
    
    // Set up Firebase real-time listener for category changes if available
    if (isFirebaseAvailable && database) {
        database.ref('categories').on('value', (snapshot) => {
            if (snapshot.exists()) {
                const firebaseCategories = snapshot.val();
                if (firebaseCategories.movieCategories) {
                    movieCategories = firebaseCategories.movieCategories;
                }
                if (firebaseCategories.seriesCategories) {
                    seriesCategories = firebaseCategories.seriesCategories;
                }
                displayCategoryPills();
                
                // Re-render movies to show new categories immediately
                if (allMoviesData.length > 0) {
                    renderMoviesByCategory(allMoviesData);
                }
            }
        });
    }
}

// Display category pills in the UI
function displayCategoryPills() {
    displayMovieCategoryPills();
    displaySeriesCategoryPills();
}

// Display movie category pills for filtering
function displayMovieCategoryPills() {
    const movieContainer = document.getElementById('movieCategoriesContainer');
    if (movieContainer && movieCategories.length > 0) {
        movieContainer.innerHTML = `
            <h3 style="color: #ff6b6b; margin-bottom: 1rem; font-size: 1.2rem;">Filter Movies by Category</h3>
            <div class="category-pills">
                <div class="category-pill all-categories active" onclick="filterByCategory('all', 'movie')">
                    All Movies
                </div>
                ${movieCategories.map(category => 
                    `<div class="category-pill" onclick="filterByCategory('${category}', 'movie')">
                        ${category.charAt(0).toUpperCase() + category.slice(1)}
                    </div>`
                ).join('')}
            </div>
        `;
    }
}

// Display series category pills for filtering
function displaySeriesCategoryPills() {
    const seriesContainer = document.getElementById('seriesCategoriesContainer');
    if (seriesContainer && seriesCategories.length > 0) {
        seriesContainer.innerHTML = `
            <h3 style="color: #ff6b6b; margin-bottom: 1rem; font-size: 1.2rem;">Series Categories</h3>
            <div class="category-pills">
                <div class="category-pill all-categories active" onclick="filterByCategory('all', 'series')">
                    All Series
                </div>
                ${seriesCategories.map(category => 
                    `<div class="category-pill" onclick="filterByCategory('${category}', 'series')">
                        ${category.charAt(0).toUpperCase() + category.slice(1)}
                    </div>`
                ).join('')}
            </div>
        `;
    }
}

// Render dynamic movie categories
function renderDynamicMovieCategories(categories, movieData) {
    const dynamicContainer = document.getElementById('dynamicMovieCategoriesContainer');
    if (!dynamicContainer) return;
    
    if (categories.length === 0) {
        dynamicContainer.innerHTML = '';
        return;
    }
    
    const categorySections = categories.map(category => {
        const categoryMovies = movieData.filter(movie => movie.category === category);
        
        if (categoryMovies.length === 0) return '';
        
        return `
            <div class="category-section" id="${category}Section">
                <h3 class="category-title">${category.charAt(0).toUpperCase() + category.slice(1)}</h3>
                <div id="${category}Movies" class="movies-grid">
                    ${categoryMovies.map(movie => createMovieCard(movie)).join('')}
                </div>
            </div>
        `;
    }).filter(section => section !== '').join('');
    
    dynamicContainer.innerHTML = categorySections;
}

// Filter by category
function filterByCategory(category, type) {
    // Update active category pill
    const container = type === 'movie' ? 'movieCategoriesContainer' : 'seriesCategoriesContainer';
    const categoryContainer = document.getElementById(container);
    
    if (categoryContainer) {
        categoryContainer.querySelectorAll('.category-pill').forEach(pill => {
            pill.classList.remove('active');
        });
        
        // Find and activate the clicked pill
        const clickedPill = [...categoryContainer.querySelectorAll('.category-pill')]
            .find(pill => pill.textContent.toLowerCase().includes(category.toLowerCase()));
        
        if (clickedPill) {
            clickedPill.classList.add('active');
        }
    }
    
    // Filter and display content
    if (type === 'movie') {
        const movies = allMoviesData.filter(movie => movie.type !== 'series');
        
        if (category === 'all') {
            // Show all movie categories
            showAllMovieCategories(movies);
        } else {
            // Show only selected category
            hideAllMovieCategories();
            const categoryMovies = movies.filter(movie => movie.category === category);
            showSpecificMovieCategory(category, categoryMovies);
        }
    } else {
        // Filter series
        const series = allMoviesData.filter(movie => {
            if (category === 'all') {
                return movie.type === 'series';
            }
            return movie.category === category && movie.type === 'series';
        });
        
        renderMovies('seriesGrid', series);
    }
}

// Show all movie categories
function showAllMovieCategories(movies) {
    // Show default category sections
    document.getElementById('trendingSection').style.display = 'block';
    document.getElementById('latestSection').style.display = 'block';
    document.getElementById('popularSection').style.display = 'block';
    
    // Render default categories
    const trendingMovies = movies.filter(m => m.category === 'trending');
    const latestMovies = movies.filter(m => m.category === 'latest');
    const popularMovies = movies.filter(m => m.category === 'popular');
    
    renderMovies('trendingMovies', trendingMovies);
    renderMovies('latestMovies', latestMovies);
    renderMovies('popularMovies', popularMovies);
    
    // Show dynamic categories
    const dynamicCategories = [...new Set(movies.map(m => m.category))]
        .filter(cat => cat && !['trending', 'latest', 'popular'].includes(cat));
    
    renderDynamicMovieCategories(dynamicCategories, movies);
}

// Hide all movie categories
function hideAllMovieCategories() {
    // Hide default category sections
    document.getElementById('trendingSection').style.display = 'none';
    document.getElementById('latestSection').style.display = 'none';
    document.getElementById('popularSection').style.display = 'none';
    
    // Clear dynamic categories
    document.getElementById('dynamicMovieCategoriesContainer').innerHTML = '';
}

// Show specific movie category
function showSpecificMovieCategory(category, movies) {
    if (['trending', 'latest', 'popular'].includes(category)) {
        // Show the specific default category
        if (category === 'trending') {
            document.getElementById('trendingSection').style.display = 'block';
            renderMovies('trendingMovies', movies);
        } else if (category === 'latest') {
            document.getElementById('latestSection').style.display = 'block';
            renderMovies('latestMovies', movies);
        } else if (category === 'popular') {
            document.getElementById('popularSection').style.display = 'block';
            renderMovies('popularMovies', movies);
        }
    } else {
        // Show dynamic category
        renderDynamicMovieCategories([category], allMoviesData.filter(movie => movie.type !== 'series'));
    }
}

// Hamburger Menu Functionality
function setupHamburgerMenu() {
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const slideNav = document.getElementById('slideNav');
    const slideNavClose = document.getElementById('slideNavClose');
    const menuOverlay = document.getElementById('menuOverlay');
    const slideNavItems = document.querySelectorAll('.slide-nav-item');
    
    if (!hamburgerMenu || !slideNav) return;
    
    // Toggle menu
    hamburgerMenu.addEventListener('click', function() {
        toggleMenu();
    });
    
    // Close menu
    if (slideNavClose) {
        slideNavClose.addEventListener('click', function() {
            closeMenu();
        });
    }
    
    // Close menu when clicking overlay
    if (menuOverlay) {
        menuOverlay.addEventListener('click', function() {
            closeMenu();
        });
    }
    
    // Handle navigation item clicks
    slideNavItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const tab = this.getAttribute('data-tab');
            
            // Close menu
            closeMenu();
            
            // Switch to the selected tab
            switchTab(tab);
            
            // Update active state
            updateSlideNavActiveState(tab);
        });
    });
    
    // Update active state initially
    updateSlideNavActiveState(currentTab);
}

function toggleMenu() {
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const slideNav = document.getElementById('slideNav');
    const menuOverlay = document.getElementById('menuOverlay');
    
    if (slideNav.classList.contains('open')) {
        closeMenu();
    } else {
        openMenu();
    }
}

function openMenu() {
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const slideNav = document.getElementById('slideNav');
    const menuOverlay = document.getElementById('menuOverlay');
    
    hamburgerMenu.classList.add('active');
    slideNav.classList.add('open');
    menuOverlay.classList.add('active');
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
}

function closeMenu() {
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const slideNav = document.getElementById('slideNav');
    const menuOverlay = document.getElementById('menuOverlay');
    
    hamburgerMenu.classList.remove('active');
    slideNav.classList.remove('open');
    menuOverlay.classList.remove('active');
    
    // Restore body scroll
    document.body.style.overflow = '';
}

function updateSlideNavActiveState(activeTab) {
    const slideNavItems = document.querySelectorAll('.slide-nav-item');
    
    slideNavItems.forEach(item => {
        const tab = item.getAttribute('data-tab');
        if (tab === activeTab) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// Load navigation settings from Firebase or localStorage
function loadNavigationSettings() {
    const defaultSettings = {
        home: true,
        series: true,
        watchlist: true,
        search: true
    };
    
    // Try to load from Firebase first
    if (isFirebaseAvailable && database) {
        database.ref('navigationSettings').once('value')
            .then((snapshot) => {
                const settings = snapshot.val() || defaultSettings;
                applyNavigationSettings(settings);
            })
            .catch((error) => {
                console.log('Firebase not available, using localStorage');
                const settings = JSON.parse(localStorage.getItem('navigationSettings') || JSON.stringify(defaultSettings));
                applyNavigationSettings(settings);
            });
    } else {
        // Fallback to localStorage
        const settings = JSON.parse(localStorage.getItem('navigationSettings') || JSON.stringify(defaultSettings));
        applyNavigationSettings(settings);
    }
}

function applyNavigationSettings(settings) {
    const slideNavItems = document.querySelectorAll('.slide-nav-item');
    
    slideNavItems.forEach(item => {
        const tab = item.getAttribute('data-tab');
        if (settings[tab]) {
            item.classList.remove('hidden');
        } else {
            item.classList.add('hidden');
        }
    });
}

// Legal Pages Functionality
let legalPagesData = {
    privacy: {
        title: "Privacy Policy",
        content: `<h3>Information We Collect</h3>
<p>We collect information you provide directly to us, such as when you create an account, use our services, or contact us for support.</p>

<h3>How We Use Your Information</h3>
<p>We use the information we collect to provide, maintain, and improve our services, process transactions, and communicate with you.</p>

<h3>Information Sharing</h3>
<p>We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy.</p>

<h3>Data Security</h3>
<p>We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p>

<h3>Contact Us</h3>
<p>If you have any questions about this Privacy Policy, please contact us at <strong>cinemovies0011@gmail.com</strong></p>`
    },
    dmca: {
        title: "DMCA Policy",
        content: `<h3>Copyright Infringement Notice</h3>
<p>CineMovies respects the intellectual property rights of others and expects users to do the same.</p>

<h3>Filing a DMCA Notice</h3>
<p>If you believe that content on our platform infringes your copyright, please send a notice containing:</p>
<ul>
<li>Your physical or electronic signature</li>
<li>Identification of the copyrighted work claimed to have been infringed</li>
<li>Identification of the infringing material and its location</li>
<li>Your contact information</li>
<li>A statement of good faith belief that the use is not authorized</li>
<li>A statement of accuracy under penalty of perjury</li>
</ul>

<h3>Counter-Notification</h3>
<p>If you believe your content was removed in error, you may file a counter-notification.</p>

<h3>Contact for DMCA</h3>
<p>Send DMCA notices to: <strong>cinemovies0011@gmail.com</strong></p>`
    },
    disclaimer: {
        title: "Disclaimer",
        content: `<h3>Website Disclaimer</h3>
<p>The information on this website is provided on an "as is" basis. To the fullest extent permitted by law, this Company excludes all representations, warranties, conditions and other terms.</p>

<h3>Content Accuracy</h3>
<p>While we strive to ensure that the information on this website is correct, we do not warrant its completeness or accuracy.</p>

<h3>External Links</h3>
<p>Our website may contain links to external sites. We are not responsible for the content or availability of external websites.</p>

<h3>Service Availability</h3>
<p>We do not guarantee that our services will be available at all times or that they will be free from errors, viruses, or other harmful components.</p>

<h3>Limitation of Liability</h3>
<p>We shall not be liable for any direct, indirect, special, incidental, or consequential damages arising from your use of this website.</p>`
    },
    contact: {
        title: "Contact Us",
        content: `<h3>Get in Touch</h3>
<p>We'd love to hear from you! If you have any questions, suggestions, or need support, please don't hesitate to contact us.</p>

<h3>Email</h3>
<p><strong>cinemovies0011@gmail.com</strong></p>
<p>We typically respond to emails within 24-48 hours.</p>

<h3>Support Hours</h3>
<p>Monday - Friday: 9:00 AM - 6:00 PM (EST)<br>
Saturday - Sunday: 10:00 AM - 4:00 PM (EST)</p>

<h3>Feedback</h3>
<p>Your feedback helps us improve our services. Whether it's a bug report, feature request, or general suggestion, we appreciate your input.</p>

<h3>Business Inquiries</h3>
<p>For business partnerships, advertising opportunities, or other commercial inquiries, please contact us at the email above with "Business Inquiry" in the subject line.</p>`
    }
};

// Load legal pages from admin settings with real-time sync
function loadLegalPagesData() {
    try {
        // Set up Firebase real-time listener for legal pages
        if (isFirebaseAvailable && database) {
            database.ref('legalPages').on('value', (snapshot) => {
                if (snapshot.exists()) {
                    const adminLegalPages = snapshot.val();
                    // Merge with defaults, admin content takes precedence
                    Object.keys(legalPagesData).forEach(key => {
                        if (adminLegalPages[key]) {
                            legalPagesData[key] = {
                                title: adminLegalPages[key].title || legalPagesData[key].title,
                                content: adminLegalPages[key].content || legalPagesData[key].content
                            };
                        }
                    });
                    
                    console.log('Legal pages updated from Firebase');
                    // Update navigation menu with latest data
                    updateNavigationMenuItems();
                } else {
                    console.log('No legal pages found in Firebase, using defaults');
                }
            });
        }
        
        // Also listen for localStorage changes (for cross-tab sync)
        window.addEventListener('storage', function(event) {
            if (event.key === 'legalPagesData') {
                try {
                    const adminLegalPages = JSON.parse(event.newValue || '{}');
                    Object.keys(legalPagesData).forEach(key => {
                        if (adminLegalPages[key]) {
                            legalPagesData[key] = {
                                title: adminLegalPages[key].title || legalPagesData[key].title,
                                content: adminLegalPages[key].content || legalPagesData[key].content
                            };
                        }
                    });
                    
                    console.log('Legal pages updated from localStorage sync');
                    updateNavigationMenuItems();
                } catch (error) {
                    console.error('Error parsing legal pages from storage event:', error);
                }
            }
        });
        
        // Fallback to localStorage for initial load
        const adminLegalPages = JSON.parse(localStorage.getItem('legalPagesData') || '{}');
        Object.keys(legalPagesData).forEach(key => {
            if (adminLegalPages[key]) {
                legalPagesData[key] = {
                    title: adminLegalPages[key].title || legalPagesData[key].title,
                    content: adminLegalPages[key].content || legalPagesData[key].content
                };
            }
        });
        
    } catch (error) {
        console.error('Error loading legal pages data:', error);
    }
}

// Open legal page modal
function openLegalPage(pageType) {
    const modal = document.getElementById('legalModal');
    const titleElement = document.getElementById('legalModalTitle');
    const bodyElement = document.getElementById('legalModalBody');
    
    if (!legalPagesData[pageType]) {
        console.error('Legal page not found:', pageType);
        return;
    }
    
    titleElement.textContent = legalPagesData[pageType].title;
    bodyElement.innerHTML = legalPagesData[pageType].content;
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Close hamburger menu
    closeMenu();
}

// Close legal page modal
function closeLegalModal() {
    const modal = document.getElementById('legalModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Request Modal Functionality
function openRequestModal() {
    const modal = document.getElementById('requestModal');
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Reset form
    document.getElementById('requestForm').reset();
    
    // Close hamburger menu
    closeMenu();
    
    // Focus on first input
    setTimeout(() => {
        document.getElementById('requestType').focus();
    }, 300);
}

// Close request modal
function closeRequestModal() {
    const modal = document.getElementById('requestModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Submit request
function submitRequest(event) {
    if (event) {
        event.preventDefault();
    }
    
    const form = document.getElementById('requestForm');
    const formData = new FormData(form);
    
    const requestData = {
        type: formData.get('type'),
        title: formData.get('title'),
        year: formData.get('year') || '',
        description: formData.get('description') || '',
        status: 'pending',
        timestamp: Date.now(),
        submittedAt: new Date().toLocaleString()
    };
    
    // Validate required fields
    if (!requestData.type || !requestData.title) {
        showMessage('Please fill in all required fields.', 'error');
        return;
    }
    
    try {
        // Save to localStorage
        const existingRequests = JSON.parse(localStorage.getItem('userRequests') || '[]');
        requestData.id = Date.now().toString();
        existingRequests.push(requestData);
        localStorage.setItem('userRequests', JSON.stringify(existingRequests));
        
        // Try to save to Firebase
        if (isFirebaseAvailable && database) {
            database.ref('requests').push(requestData)
                .then(() => {
                    console.log('Request saved to Firebase');
                })
                .catch((error) => {
                    console.error('Error saving to Firebase:', error);
                });
        }
        
        // Show success message
        showMessage(`Your ${requestData.type} request has been submitted successfully! We'll review it and get back to you soon.`, 'success');
        
        // Close modal
        closeRequestModal();
        
        // Reset form
        form.reset();
        
    } catch (error) {
        console.error('Error submitting request:', error);
        showMessage('An error occurred while submitting your request. Please try again.', 'error');
    }
}

// Setup request form submission
function setupRequestForm() {
    const requestForm = document.getElementById('requestForm');
    if (requestForm) {
        requestForm.addEventListener('submit', submitRequest);
    }
}

// Close modals when clicking outside
function setupModalClickHandlers() {
    // Legal modal
    const legalModal = document.getElementById('legalModal');
    if (legalModal) {
        legalModal.addEventListener('click', function(event) {
            if (event.target === legalModal) {
                closeLegalModal();
            }
        });
    }
    
    // Request modal
    const requestModal = document.getElementById('requestModal');
    if (requestModal) {
        requestModal.addEventListener('click', function(event) {
            if (event.target === requestModal) {
                closeRequestModal();
            }
        });
    }
    
    // ESC key to close modals
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeLegalModal();
            closeRequestModal();
        }
    });
}

// Enhanced message display function
function showMessage(message, type = 'info') {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.message-notification');
    existingMessages.forEach(msg => msg.remove());
    
    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = `message-notification message-${type}`;
    
    const colors = {
        success: 'rgba(76, 175, 80, 0.9)',
        error: 'rgba(244, 67, 54, 0.9)',
        info: 'rgba(33, 150, 243, 0.9)',
        warning: 'rgba(255, 193, 7, 0.9)'
    };
    
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type] || colors.info};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        z-index: 10000;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        animation: slideInRight 0.3s ease;
        font-weight: 500;
    `;
    
    messageDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(messageDiv);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                messageDiv.remove();
            }, 300);
        }
    }, 5000);
}

// Initialize legal pages and request functionality
function initializeLegalAndRequest() {
    loadLegalPagesData();
    setupRequestForm();
    setupModalClickHandlers();
    setupRealTimeRequestSync();
    updateNavigationMenuItems();
}

// Update navigation menu items dynamically
function updateNavigationMenuItems() {
    const legalSection = document.querySelector('.nav-section:last-child .slide-nav-content > div:last-child');
    
    if (legalSection) {
        // Update legal page titles in navigation
        const privacyItem = legalSection.querySelector('[onclick*="privacy"]');
        const dmcaItem = legalSection.querySelector('[onclick*="dmca"]');
        const disclaimerItem = legalSection.querySelector('[onclick*="disclaimer"]');
        const contactItem = legalSection.querySelector('[onclick*="contact"]');
        
        if (privacyItem) {
            privacyItem.querySelector('span').textContent = legalPagesData.privacy.title || 'Privacy Policy';
        }
        if (dmcaItem) {
            dmcaItem.querySelector('span').textContent = legalPagesData.dmca.title || 'DMCA Policy';
        }
        if (disclaimerItem) {
            disclaimerItem.querySelector('span').textContent = legalPagesData.disclaimer.title || 'Disclaimer';
        }
        if (contactItem) {
            contactItem.querySelector('span').textContent = legalPagesData.contact.title || 'Contact Us';
        }
    }
    
    console.log('Navigation menu items updated');
}

// Setup real-time request status synchronization
function setupRealTimeRequestSync() {
    if (isFirebaseAvailable && database) {
        // Listen for request status changes from admin panel
        database.ref('requests').on('value', (snapshot) => {
            if (snapshot.exists()) {
                const requests = [];
                snapshot.forEach((child) => {
                    requests.push({
                        id: child.key,
                        ...child.val()
                    });
                });
                
                // Update localStorage for consistency
                localStorage.setItem('userRequests', JSON.stringify(requests));
                
                console.log('Request data synchronized from Firebase');
                
                // Show notification for status changes (optional)
                checkForRequestStatusUpdates(requests);
            }
        });
    }
    
    // Also listen for localStorage changes (for cross-tab sync)
    window.addEventListener('storage', function(event) {
        if (event.key === 'userRequests') {
            try {
                const requests = JSON.parse(event.newValue || '[]');
                console.log('Request data synchronized from localStorage');
                checkForRequestStatusUpdates(requests);
            } catch (error) {
                console.error('Error parsing requests from storage event:', error);
            }
        }
    });
}

// Track previous request statuses for notifications
let previousRequestStatuses = new Map();

// Check for request status updates and notify user
function checkForRequestStatusUpdates(requests) {
    requests.forEach(request => {
        const previousStatus = previousRequestStatuses.get(request.id);
        
        if (previousStatus && previousStatus !== request.status) {
            // Status changed, show notification
            let message = '';
            let type = 'info';
            
            switch (request.status) {
                case 'accepted':
                    message = `Your request "${request.title}" has been accepted!`;
                    type = 'success';
                    break;
                case 'completed':
                    message = `Your request "${request.title}" has been completed and is now available!`;
                    type = 'success';
                    break;
                case 'rejected':
                    message = `Your request "${request.title}" has been declined. Please try another request.`;
                    type = 'warning';
                    break;
            }
            
            if (message) {
                showMessage(message, type);
            }
        }
        
        // Update previous status
        previousRequestStatuses.set(request.id, request.status);
    });
}

// Add to main initialization
document.addEventListener('DOMContentLoaded', function() {
    // ... existing code ...
    initializeLegalAndRequest();
});