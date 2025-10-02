// Movie Details Page JavaScript
document.addEventListener('DOMContentLoaded', async function() {
    await loadMovieDetails();
    setupSearchButton();
    loadGuideVideos();
    setupGuideVideosListeners();
    setupHamburgerMenu();
    loadNavigationSettings();
});

let currentMovie = null;
let watchlist = JSON.parse(localStorage.getItem('streamflix_watchlist') || '[]');
let guideVideos = {
    hindi: null,
    english: null
};
let selectedGuideVideo = null;
let guideVideoCompleted = false; // Track if guide video has been completed

// Setup search button functionality
function setupSearchButton() {
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            // Navigate back to homepage and switch directly to search tab
            window.location.href = 'index.html?tab=search&focus_search=true';
        });
    }
}

// Navigate to home function
function navigateToHome() {
    window.location.href = 'index.html';
}

// Load movie details from Firebase or localStorage
async function loadMovieDetails() {
    const movieId = localStorage.getItem('selectedMovieId');
    
    if (!movieId) {
        showError('No movie selected. Please go back to the homepage.');
        return;
    }
    
    console.log('Loading details for movie ID:', movieId);
    
    try {
        let movie = null;
        
        // Try Firebase first
        if (isFirebaseAvailable && database) {
            console.log('Fetching movie from Firebase');
            const snapshot = await database.ref(`movies/${movieId}`).once('value');
            if (snapshot.exists()) {
                movie = { id: movieId, ...snapshot.val() };
                console.log('Movie found in Firebase:', movie);
            }
        }
        
        // Fallback to localStorage
        if (!movie) {
            console.log('Movie not found in Firebase, checking localStorage');
            const movies = JSON.parse(localStorage.getItem('streamflix_movies') || '[]');
            movie = movies.find(m => m.id === movieId);
            if (movie) {
                console.log('Movie found in localStorage:', movie);
            }
        }
        
        if (movie) {
            currentMovie = movie;
            renderMovieDetails(movie);
        } else {
            showError('Movie not found. It may have been deleted.');
        }
        
    } catch (error) {
        console.error('Error loading movie details:', error);
        showError('Failed to load movie details. Please try again.');
    }
}

// Render movie details on the page
function renderMovieDetails(movie) {
    const container = document.getElementById('movieDetails');
    const isInWatchlist = watchlist.some(item => item.id === movie.id);
    const downloadUrl = movie.downloadLink || movie.url;
    
    // Format views count with real-time display
    const viewsCount = movie.views || 0;
    const formattedViews = formatViewsCount(viewsCount);
    
    // Check if movie has embed link for direct video playback
    const hasEmbedVideo = movie.embedLink && movie.embedLink.trim();
    
    const movieHtml = `
        <div class="movie-content">
            <div class="movie-poster">
                <img src="${movie.thumbnail}" alt="${movie.title}" 
                     onerror="this.src='https://via.placeholder.com/800x450/667eea/ffffff?text=Image+Not+Available'; this.onerror=null;">
            </div>
            <div class="movie-info-details">
                <h1 class="movie-title-large">${escapeHtml(movie.title)}</h1>
                <div class="movie-stats">
                    <span class="views-count" id="viewsCount">
                        <i class="fas fa-eye"></i> ${formattedViews} views
                    </span>
                    <span class="movie-type">
                        <i class="fas ${movie.type === 'series' ? 'fa-tv' : 'fa-film'}"></i> ${movie.type === 'series' ? 'Series' : 'Movie'}
                    </span>
                    ${movie.createdAt ? `
                    <span class="movie-date">
                        <i class="fas fa-calendar"></i> ${new Date(movie.createdAt).toLocaleDateString()}
                    </span>
                    ` : ''}
                </div>
                <p class="movie-description-full">${escapeHtml(movie.description || 'No description available.')}</p>
                
                <div class="main-actions">
                    ${hasEmbedVideo ? `
                    <button class="btn btn-play" onclick="playEmbeddedVideo()" id="playButton">
                        <i class="fas fa-play"></i> Watch Now
                    </button>
                    ` : movie.url ? `
                    <button class="btn btn-play" onclick="handlePlayClick()" id="playButton">
                        <i class="fas fa-play"></i> Play ${movie.type === 'series' ? 'Series' : 'Movie'}
                    </button>
                    ` : `
                    <button class="btn btn-play disabled" disabled>
                        <i class="fas fa-play"></i> No Playback Available
                    </button>
                    `}
                    <button class="btn btn-cancel" onclick="goBack()">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
                
                <div class="utility-actions">
                    ${movie.downloadLink ? `
                    <a href="${downloadUrl}" target="_blank" class="btn-utility">
                        <i class="fas fa-download"></i> Download
                    </a>
                    ` : ''}
                    <button class="btn-utility watchlist-btn ${isInWatchlist ? 'active' : ''}" onclick="toggleWatchlist('${movie.id}')">
                        <i class="fas fa-bookmark"></i> ${isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
                    </button>
                    <button class="btn-utility" onclick="shareMovie('${movie.id}')">
                        <i class="fas fa-share"></i> Share
                    </button>
                    <button class="btn-utility" onclick="rateMovie('${movie.id}')">
                        <i class="fas fa-star"></i> Rate
                    </button>
                    <button class="btn-utility" onclick="reportMovie('${movie.id}')">
                        <i class="fas fa-flag"></i> Report
                    </button>
                </div>
            </div>
        </div>
        
        ${hasEmbedVideo ? `
        <div class="video-player-section" id="videoPlayerSection" style="display: none;">
            <div class="video-header">
                <h2><i class="fas fa-play-circle"></i> Now Playing: ${escapeHtml(movie.title)}</h2>
                <button class="close-video-btn" onclick="closeEmbeddedVideo()">
                    <i class="fas fa-times"></i> Close Player
                </button>
            </div>
            <div class="video-container" id="videoContainer">
                ${movie.embedLink}
            </div>
        </div>
        ` : ''}
    `;
    
    container.innerHTML = movieHtml;
    
    // Set up real-time views listener
    setupRealTimeViewsListener(movie.id);
    
    console.log('Movie details rendered successfully with video embedding support');
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

// Handle play button click with views increment
function handlePlayClick() {
    if (!currentMovie) {
        console.error('No movie loaded');
        return;
    }
    
    console.log(`🎥 User clicked play for: ${currentMovie.title}`);
    
    // Increment views count immediately for better UX
    incrementMovieViews(currentMovie.id);
    
    // Check if movie has embed link
    if (currentMovie.embedLink && currentMovie.embedLink.trim()) {
        // Direct play embedded video
        playEmbeddedVideo();
    } else {
        // Show guide videos popup or redirect to external link
        showGuideVideosPopup();
    }
}

// Increment movie views in Firebase with real-time sync
async function incrementMovieViews(movieId) {
    try {
        console.log(`📈 Incrementing views for movie: ${movieId}`);
        
        // Get current movie data
        let currentViews = currentMovie.views || 0;
        const newViews = currentViews + 1;
        
        // Update local movie object immediately
        currentMovie.views = newViews;
        
        // Update views count display immediately
        updateViewsDisplay(newViews);
        
        // Update Firebase
        if (isFirebaseAvailable && database) {
            try {
                await database.ref(`movies/${movieId}/views`).set(newViews);
                console.log(`✅ Views updated in Firebase: ${newViews}`);
            } catch (error) {
                console.error('❌ Error updating views in Firebase:', error);
                // Fallback to localStorage
                updateViewsInLocalStorage(movieId, newViews);
            }
        } else {
            // Fallback to localStorage
            updateViewsInLocalStorage(movieId, newViews);
        }
        
        // Show subtle notification
        showViewsNotification();
        
    } catch (error) {
        console.error('Error incrementing views:', error);
    }
}

// Update views in localStorage fallback
function updateViewsInLocalStorage(movieId, newViews) {
    try {
        const movies = JSON.parse(localStorage.getItem('streamflix_movies') || '[]');
        const movieIndex = movies.findIndex(m => m.id === movieId);
        
        if (movieIndex !== -1) {
            movies[movieIndex].views = newViews;
            localStorage.setItem('streamflix_movies', JSON.stringify(movies));
            console.log(`💾 Views updated in localStorage: ${newViews}`);
        }
    } catch (error) {
        console.error('Error updating localStorage views:', error);
    }
}

// Update views display in real-time
function updateViewsDisplay(views) {
    const viewsElement = document.getElementById('viewsCount');
    if (viewsElement) {
        const formattedViews = formatViewsCount(views);
        viewsElement.innerHTML = `<i class="fas fa-eye"></i> ${formattedViews} views`;
        
        // Add animation to indicate update
        viewsElement.style.animation = 'none';
        setTimeout(() => {
            viewsElement.style.animation = 'pulse 0.5s ease';
        }, 10);
    }
}

// Setup real-time views listener for current movie
function setupRealTimeViewsListener(movieId) {
    if (isFirebaseAvailable && database) {
        // Listen for real-time views changes
        database.ref(`movies/${movieId}/views`).on('value', (snapshot) => {
            if (snapshot.exists()) {
                const views = snapshot.val();
                if (currentMovie && currentMovie.id === movieId) {
                    currentMovie.views = views;
                    updateViewsDisplay(views);
                    console.log(`🔄 Real-time views update: ${views}`);
                }
            }
        });
        
        console.log(`🔍 Real-time views listener setup for movie: ${movieId}`);
    }
}

// Show subtle views increment notification
function showViewsNotification() {
    // Create subtle notification
    const notification = document.createElement('div');
    notification.className = 'views-notification';
    notification.innerHTML = '<i class="fas fa-eye"></i> +1 view';
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: rgba(255, 107, 107, 0.9);
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 20px;
        font-size: 0.8rem;
        z-index: 10000;
        animation: slideInFadeOut 2s ease;
        pointer-events: none;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after animation
    setTimeout(() => {
        notification.remove();
    }, 2000);
}

// Play embedded video and increment views
function playEmbeddedVideo() {
    if (!currentMovie) {
        console.error('No movie loaded');
        return;
    }
    
    console.log(`🎬 Playing embedded video for: ${currentMovie.title}`);
    
    // Increment views count immediately
    incrementMovieViews(currentMovie.id);
    
    // Show video player section
    const videoSection = document.getElementById('videoPlayerSection');
    if (videoSection) {
        videoSection.style.display = 'block';
        
        // Smooth scroll to video
        videoSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
        
        // Update play button text
        const playButton = document.getElementById('playButton');
        if (playButton) {
            playButton.innerHTML = '<i class="fas fa-pause"></i> Video Playing';
            playButton.disabled = true;
            playButton.classList.add('playing');
        }
        
        console.log('✅ Embedded video player opened');
    }
}

// Close embedded video player
function closeEmbeddedVideo() {
    const videoSection = document.getElementById('videoPlayerSection');
    if (videoSection) {
        videoSection.style.display = 'none';
        
        // Reset play button
        const playButton = document.getElementById('playButton');
        if (playButton && currentMovie) {
            playButton.innerHTML = '<i class="fas fa-play"></i> Watch Now';
            playButton.disabled = false;
            playButton.classList.remove('playing');
        }
        
        // Scroll back to movie info
        const movieContent = document.querySelector('.movie-content');
        if (movieContent) {
            movieContent.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }
        
        console.log('📱 Embedded video player closed');
    }
}

// Utility functions for button actions
function goBack() {
    window.history.back();
}

// Global function declarations for HTML access
window.playEmbeddedVideo = playEmbeddedVideo;
window.closeEmbeddedVideo = closeEmbeddedVideo;
window.handlePlayClick = handlePlayClick;
window.goBack = goBack;

function downloadMovie(movieId) {
    console.log('Download movie:', movieId);
    alert('Download feature coming soon!');
}

function toggleWatchlist(movieId) {
    const isInWatchlist = watchlist.some(item => item.id === movieId);
    
    if (isInWatchlist) {
        // Remove from watchlist
        watchlist = watchlist.filter(item => item.id !== movieId);
        showNotification('Removed from watchlist', 'info');
    } else {
        // Add to watchlist
        if (currentMovie) {
            watchlist.push({
                id: currentMovie.id,
                title: currentMovie.title,
                thumbnail: currentMovie.thumbnail,
                url: currentMovie.url,
                description: currentMovie.description,
                category: currentMovie.category,
                type: currentMovie.type,
                addedAt: Date.now()
            });
            showNotification('Added to watchlist', 'success');
        }
    }
    
    // Save to localStorage
    localStorage.setItem('streamflix_watchlist', JSON.stringify(watchlist));
    
    // Update button state
    updateWatchlistButton(movieId, !isInWatchlist);
}

function updateWatchlistButton(movieId, isInWatchlist) {
    const watchlistBtn = document.querySelector('.watchlist-btn');
    if (watchlistBtn) {
        if (isInWatchlist) {
            watchlistBtn.classList.add('active');
            watchlistBtn.innerHTML = '<i class="fas fa-bookmark"></i> Remove from Watchlist';
        } else {
            watchlistBtn.classList.remove('active');
            watchlistBtn.innerHTML = '<i class="fas fa-bookmark"></i> Add to Watchlist';
        }
    }
}

// Legacy function for compatibility
function addToWatchlist(movieId) {
    toggleWatchlist(movieId);
}

function shareMovie(movieId) {
    console.log('Share movie:', movieId);
    if (navigator.share) {
        navigator.share({
            title: 'Check out this movie on StreamFlix',
            url: window.location.href
        });
    } else {
        // Fallback for browsers that don't support native sharing
        navigator.clipboard.writeText(window.location.href).then(() => {
            alert('Movie link copied to clipboard!');
        });
    }
}

function rateMovie(movieId) {
    console.log('Rate movie:', movieId);
    const rating = prompt('Rate this movie (1-5 stars):');
    if (rating && rating >= 1 && rating <= 5) {
        alert(`Thank you for rating this movie ${rating} stars!`);
    }
}

function reportMovie(movieId) {
    console.log('Report movie:', movieId);
    const reason = prompt('Please specify the reason for reporting this movie:');
    if (reason) {
        alert('Thank you for your report. We will review it shortly.');
    }
}

// Show notification function
function showNotification(message, type = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button class="close-notification" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 3000);
}

// Show error message
function showError(message) {
    const container = document.getElementById('movieDetails');
    container.innerHTML = `<div class="error-message">${message}</div>`;
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions globally available
window.goBack = goBack;
window.downloadMovie = downloadMovie;
window.addToWatchlist = addToWatchlist;
window.toggleWatchlist = toggleWatchlist;
window.shareMovie = shareMovie;
window.rateMovie = rateMovie;
window.reportMovie = reportMovie;
window.showGuideVideosPopup = showGuideVideosPopup;
window.closeGuideVideosPopup = closeGuideVideosPopup;
window.selectGuideVideo = selectGuideVideo;
window.playActualMovie = playActualMovie;
window.completeGuideVideo = completeGuideVideo;
window.navigateToHome = navigateToHome;

// Guide Videos Functions

// Load guide videos from storage
function loadGuideVideos() {
    try {
        const savedGuideVideos = localStorage.getItem('streamflix_guide_videos');
        if (savedGuideVideos) {
            guideVideos = JSON.parse(savedGuideVideos);
        }
        console.log('Guide videos loaded:', guideVideos);
    } catch (error) {
        console.error('Error loading guide videos:', error);
    }
}

// Setup guide videos event listeners
function setupGuideVideosListeners() {
    // Listen for guide videos updates from admin panel
    window.addEventListener('guideVideosUpdated', function(event) {
        console.log('Guide videos updated event received:', event.detail);
        guideVideos = event.detail;
        updateGuideVideosDisplay();
    });
    
    // Listen for storage changes (for real-time sync)
    window.addEventListener('storage', function(event) {
        if (event.key === 'streamflix_guide_videos') {
            console.log('Guide videos storage changed, reloading...');
            loadGuideVideos();
            updateGuideVideosDisplay();
        }
    });
    
    // Set up Firebase real-time listener if available
    if (isFirebaseAvailable && database) {
        database.ref('guideVideos').on('value', (snapshot) => {
            if (snapshot.exists()) {
                guideVideos = snapshot.val();
                updateGuideVideosDisplay();
                console.log('Guide videos updated from Firebase:', guideVideos);
            }
        });
    }
}

// Show guide videos popup
function showGuideVideosPopup() {
    const popup = document.getElementById('guideVideosPopup');
    updateGuideVideosDisplay();
    
    // Reset guide video completion state
    selectedGuideVideo = null;
    guideVideoCompleted = false;
    
    // Show popup with smooth animation
    popup.style.display = 'block';
    popup.style.opacity = '0';
    popup.style.transform = 'scale(0.9)';
    
    // Animate in
    setTimeout(() => {
        popup.style.opacity = '1';
        popup.style.transform = 'scale(1)';
    }, 10);
    
    // Play Movie button is always enabled - guide videos are optional
    updatePlayMovieButton();
}

// Close guide videos popup
function closeGuideVideosPopup() {
    const popup = document.getElementById('guideVideosPopup');
    
    // Animate out
    popup.style.opacity = '0';
    popup.style.transform = 'scale(0.9)';
    
    setTimeout(() => {
        popup.style.display = 'none';
    }, 300);
    
    selectedGuideVideo = null;
    guideVideoCompleted = false;
}

// Update guide videos display in popup
function updateGuideVideosDisplay() {
    updateGuideVideoCard('hindi');
    updateGuideVideoCard('english');
}

// Update individual guide video card
function updateGuideVideoCard(language) {
    const card = document.getElementById(`${language}GuideCard`);
    const video = guideVideos[language];
    
    if (video) {
        card.innerHTML = `
            <img src="${video.thumbnailLink}" alt="${video.title}" class="guide-video-thumbnail" 
                 onerror="this.src='https://via.placeholder.com/400x200/667eea/ffffff?text=Image+Not+Available'; this.onerror=null;">
            <div class="guide-video-info">
                <h3 class="guide-video-title">${escapeHtml(video.title)}</h3>
                <p class="guide-video-language">
                    <i class="fas fa-flag"></i>
                    ${language.charAt(0).toUpperCase() + language.slice(1)} Guide
                </p>
                <button class="guide-video-play-btn" onclick="selectGuideVideo('${language}')">
                    <i class="fas fa-play"></i> Watch Guide
                </button>
                <div class="guide-video-status" id="${language}Status">
                    <span class="status-text">Not watched</span>
                </div>
            </div>
        `;
        card.onclick = () => selectGuideVideo(language);
    } else {
        card.innerHTML = `
            <div class="guide-video-placeholder">
                <i class="fas fa-video"></i>
                <p>No ${language.charAt(0).toUpperCase() + language.slice(1)} guide video available</p>
            </div>
        `;
        card.onclick = null;
    }
}

// Select guide video
function selectGuideVideo(language) {
    const video = guideVideos[language];
    if (!video) return;
    
    selectedGuideVideo = language;
    
    // Update visual selection
    document.querySelectorAll('.guide-video-card').forEach(card => {
        card.classList.remove('selected');
    });
    document.getElementById(`${language}GuideCard`).classList.add('selected');
    
    // Update status to watching
    const statusElement = document.getElementById(`${language}Status`);
    if (statusElement) {
        statusElement.innerHTML = '<span class="status-text watching"><i class="fas fa-eye"></i> Watching...</span>';
    }
    
    // Open the guide video in a new window/tab
    const guideWindow = window.open(video.videoLink, '_blank');
    
    // Simulate guide video completion after a reasonable time (30 seconds)
    // In a real implementation, you would track actual video completion
    setTimeout(() => {
        if (selectedGuideVideo === language) {
            guideVideoCompleted = true;
            
            // Update status to completed
            const statusElement = document.getElementById(`${language}Status`);
            if (statusElement) {
                statusElement.innerHTML = '<span class="status-text completed"><i class="fas fa-check-circle"></i> Completed</span>';
            }
            
            // Enable the play movie button
            updatePlayMovieButton();
            
            showNotification(`${language.charAt(0).toUpperCase() + language.slice(1)} guide video completed! You can now play the movie.`, 'success');
        }
    }, 30000); // 30 seconds - adjust as needed
    
    // For demo purposes, also allow immediate completion by clicking again
    // Remove this in production
    setTimeout(() => {
        if (statusElement) {
            statusElement.innerHTML += '<br><small style="color: #6c757d; cursor: pointer;" onclick="completeGuideVideo(\''+language+'\')">(Click here to mark as completed for demo)</small>';
        }
    }, 2000);
    
    updatePlayMovieButton();
    
    showNotification(`${language.charAt(0).toUpperCase() + language.slice(1)} guide video opened in new tab`, 'info');
}

// Demo function to manually complete guide video (remove in production)
function completeGuideVideo(language) {
    if (selectedGuideVideo === language) {
        guideVideoCompleted = true;
        
        // Update status to completed
        const statusElement = document.getElementById(`${language}Status`);
        if (statusElement) {
            statusElement.innerHTML = '<span class="status-text completed"><i class="fas fa-check-circle"></i> Completed</span>';
        }
        
        updatePlayMovieButton();
        showNotification(`${language.charAt(0).toUpperCase() + language.slice(1)} guide video marked as completed!`, 'success');
    }
}

// Update play movie button state
function updatePlayMovieButton() {
    const playBtn = document.querySelector('.btn-play-movie');
    
    // Play Movie button is always enabled - guide videos are optional
    playBtn.disabled = false;
    playBtn.classList.add('ready');
    playBtn.innerHTML = '<i class="fas fa-play"></i> Play Movie';
    playBtn.style.animation = 'pulseReady 2s infinite';
    
    // Update styling for better visibility
    playBtn.style.background = 'linear-gradient(45deg, #4caf50, #8bc34a)';
    playBtn.style.borderColor = '#4caf50';
}

// Play actual movie - guide videos are optional
function playActualMovie() {
    if (!currentMovie) {
        showNotification('Movie not available', 'error');
        return;
    }
    
    // Close the popup with animation
    closeGuideVideosPopup();
    
    // Play the actual movie
    setTimeout(() => {
        window.open(currentMovie.url, '_blank');
        showNotification('Movie opened in new tab', 'success');
    }, 300);
}

// Hamburger Menu Functionality for Movie Details Page
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
            
            // Navigate to homepage with the selected tab
            if (tab === 'home') {
                window.location.href = 'index.html';
            } else {
                window.location.href = `index.html?tab=${tab}`;
            }
        });
    });
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

// Legal Pages Functionality (Same as index.html)
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

// Load legal pages from admin settings
function loadLegalPagesData() {
    try {
        // Try to load from Firebase first
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
                }
            });
        }
        
        // Fallback to localStorage
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
        showNotification('Please fill in all required fields.', 'error');
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
        showNotification(`Your ${requestData.type} request has been submitted successfully! We'll review it and get back to you soon.`, 'success');
        
        // Close modal
        closeRequestModal();
        
        // Reset form
        form.reset();
        
    } catch (error) {
        console.error('Error submitting request:', error);
        showNotification('An error occurred while submitting your request. Please try again.', 'error');
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

// Initialize legal pages and request functionality
function initializeLegalAndRequest() {
    loadLegalPagesData();
    setupRequestForm();
    setupModalClickHandlers();
}

// Global functions
window.openLegalPage = openLegalPage;
window.closeLegalModal = closeLegalModal;
window.openRequestModal = openRequestModal;
window.closeRequestModal = closeRequestModal;
window.submitRequest = submitRequest;

// Initialize on load
document.addEventListener('DOMContentLoaded', function() {
    initializeLegalAndRequest();
});