// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBZIVUBbguBrzQGAve6iZmvR6hsbnotTlk",
    authDomain: "movie-wab-3fb3d.firebaseapp.com",
    databaseURL: "https://movie-wab-3fb3d-default-rtdb.firebaseio.com",
    projectId: "movie-wab-3fb3d",
    storageBucket: "movie-wab-3fb3d.firebasestorage.app",
    messagingSenderId: "42647333952",
    appId: "1:42647333952:web:eb1c548cfa514873f143a5",
    measurementId: "G-ZLS3ML9T42"
  };

// Initialize Firebase
let database;
let isFirebaseAvailable = false;

try {
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        database = firebase.database();
        isFirebaseAvailable = true;
        console.log('Firebase initialized successfully');
    }
} catch (error) {
    console.warn('Firebase not available, using localStorage fallback:', error);
    isFirebaseAvailable = false;
}

// Database operations with localStorage fallback
const db = {
    // Add a movie
    addMovie: async (movieData) => {
        if (isFirebaseAvailable) {
            try {
                const newMovieRef = database.ref('movies').push();
                await newMovieRef.set({
                    ...movieData,
                    id: newMovieRef.key,
                    timestamp: Date.now()
                });
                return newMovieRef.key;
            } catch (error) {
                console.error('Firebase add error:', error);
                return db.addMovieLocal(movieData);
            }
        } else {
            return db.addMovieLocal(movieData);
        }
    },

    // Get all movies
    getMovies: async () => {
        if (isFirebaseAvailable) {
            try {
                const snapshot = await database.ref('movies').once('value');
                const movies = [];
                snapshot.forEach((child) => {
                    movies.push({
                        id: child.key,
                        ...child.val()
                    });
                });
                return movies;
            } catch (error) {
                console.error('Firebase get error:', error);
                return db.getMoviesLocal();
            }
        } else {
            return db.getMoviesLocal();
        }
    },

    // Delete a movie or series
    deleteMovie: async (movieId) => {
        if (isFirebaseAvailable) {
            try {
                await database.ref(`movies/${movieId}`).remove();
                return true;
            } catch (error) {
                console.error('Firebase delete error:', error);
                return db.deleteMovieLocal(movieId);
            }
        } else {
            return db.deleteMovieLocal(movieId);
        }
    },

    // Update a movie or series
    updateMovie: async (movieId, movieData) => {
        if (isFirebaseAvailable) {
            try {
                await database.ref(`movies/${movieId}`).update({
                    ...movieData,
                    timestamp: movieData.timestamp || Date.now()
                });
                return true;
            } catch (error) {
                console.error('Firebase update error:', error);
                return db.updateMovieLocal(movieId, movieData);
            }
        } else {
            return db.updateMovieLocal(movieId, movieData);
        }
    },

    // Update movie views specifically
    updateMovieViews: async (movieId, views) => {
        if (isFirebaseAvailable) {
            try {
                await database.ref(`movies/${movieId}/views`).set(views);
                console.log(`✅ Views updated in Firebase: ${movieId} -> ${views}`);
                return true;
            } catch (error) {
                console.error('Firebase views update error:', error);
                return db.updateMovieViewsLocal(movieId, views);
            }
        } else {
            return db.updateMovieViewsLocal(movieId, views);
        }
    },

    // localStorage fallback methods
    addMovieLocal: (movieData) => {
        const movies = JSON.parse(localStorage.getItem('streamflix_movies') || '[]');
        const id = 'movie_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const movie = {
            ...movieData,
            id,
            timestamp: Date.now()
        };
        movies.push(movie);
        localStorage.setItem('streamflix_movies', JSON.stringify(movies));
        return id;
    },

    getMoviesLocal: () => {
        return JSON.parse(localStorage.getItem('streamflix_movies') || '[]');
    },

    deleteMovieLocal: (movieId) => {
        const movies = JSON.parse(localStorage.getItem('streamflix_movies') || '[]');
        const filteredMovies = movies.filter(movie => movie.id !== movieId);
        localStorage.setItem('streamflix_movies', JSON.stringify(filteredMovies));
        return true;
    },

    updateMovieLocal: (movieId, movieData) => {
        const movies = JSON.parse(localStorage.getItem('streamflix_movies') || '[]');
        const index = movies.findIndex(movie => movie.id === movieId);
        
        if (index !== -1) {
            movies[index] = { ...movies[index], ...movieData };
            localStorage.setItem('streamflix_movies', JSON.stringify(movies));
            return true;
        }
        return false;
    },

    updateMovieViewsLocal: (movieId, views) => {
        const movies = JSON.parse(localStorage.getItem('streamflix_movies') || '[]');
        const index = movies.findIndex(movie => movie.id === movieId);
        
        if (index !== -1) {
            movies[index].views = views;
            localStorage.setItem('streamflix_movies', JSON.stringify(movies));
            console.log(`💾 Views updated in localStorage: ${movieId} -> ${views}`);
            return true;
        }
        return false;
    },

    // Guide Videos operations
    saveGuideVideos: async (guideVideosData) => {
        if (isFirebaseAvailable) {
            try {
                await database.ref('guideVideos').set(guideVideosData);
                return true;
            } catch (error) {
                console.error('Firebase save guide videos error:', error);
                return db.saveGuideVideosLocal(guideVideosData);
            }
        } else {
            return db.saveGuideVideosLocal(guideVideosData);
        }
    },

    getGuideVideos: async () => {
        if (isFirebaseAvailable) {
            try {
                const snapshot = await database.ref('guideVideos').once('value');
                if (snapshot.exists()) {
                    return snapshot.val();
                }
                return { hindi: null, english: null };
            } catch (error) {
                console.error('Firebase get guide videos error:', error);
                return db.getGuideVideosLocal();
            }
        } else {
            return db.getGuideVideosLocal();
        }
    },

    saveGuideVideosLocal: (guideVideosData) => {
        localStorage.setItem('streamflix_guide_videos', JSON.stringify(guideVideosData));
        return true;
    },

    getGuideVideosLocal: () => {
        return JSON.parse(localStorage.getItem('streamflix_guide_videos') || '{"hindi": null, "english": null}');
    },

    // User Requests operations
    addRequest: async (requestData) => {
        if (isFirebaseAvailable) {
            try {
                const newRequestRef = database.ref('requests').push();
                await newRequestRef.set({
                    ...requestData,
                    id: newRequestRef.key,
                    timestamp: Date.now(),
                    status: 'pending',
                    submittedAt: new Date().toLocaleString()
                });
                return newRequestRef.key;
            } catch (error) {
                console.error('Firebase add request error:', error);
                return db.addRequestLocal(requestData);
            }
        } else {
            return db.addRequestLocal(requestData);
        }
    },

    getRequests: async () => {
        if (isFirebaseAvailable) {
            try {
                const snapshot = await database.ref('requests').once('value');
                const requests = [];
                snapshot.forEach((child) => {
                    requests.push({
                        id: child.key,
                        ...child.val()
                    });
                });
                return requests;
            } catch (error) {
                console.error('Firebase get requests error:', error);
                return db.getRequestsLocal();
            }
        } else {
            return db.getRequestsLocal();
        }
    },

    updateRequest: async (requestId, requestData) => {
        if (isFirebaseAvailable) {
            try {
                await database.ref(`requests/${requestId}`).update({
                    ...requestData,
                    updatedAt: new Date().toLocaleString()
                });
                return true;
            } catch (error) {
                console.error('Firebase update request error:', error);
                return db.updateRequestLocal(requestId, requestData);
            }
        } else {
            return db.updateRequestLocal(requestId, requestData);
        }
    },

    deleteRequest: async (requestId) => {
        if (isFirebaseAvailable) {
            try {
                // Force immediate removal from Firebase
                await database.ref(`requests/${requestId}`).remove();
                console.log(`✅ Request ${requestId} permanently deleted from Firebase`);
                return true;
            } catch (error) {
                console.error('Firebase delete request error:', error);
                return db.deleteRequestLocal(requestId);
            }
        } else {
            return db.deleteRequestLocal(requestId);
        }
    },

    // localStorage fallback methods for requests
    addRequestLocal: (requestData) => {
        const requests = JSON.parse(localStorage.getItem('userRequests') || '[]');
        const id = 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const request = {
            ...requestData,
            id,
            timestamp: Date.now(),
            status: 'pending',
            submittedAt: new Date().toLocaleString()
        };
        requests.push(request);
        localStorage.setItem('userRequests', JSON.stringify(requests));
        return id;
    },

    getRequestsLocal: () => {
        return JSON.parse(localStorage.getItem('userRequests') || '[]');
    },

    updateRequestLocal: (requestId, requestData) => {
        const requests = JSON.parse(localStorage.getItem('userRequests') || '[]');
        const index = requests.findIndex(request => request.id === requestId);
        
        if (index !== -1) {
            requests[index] = { 
                ...requests[index], 
                ...requestData,
                updatedAt: new Date().toLocaleString()
            };
            localStorage.setItem('userRequests', JSON.stringify(requests));
            return true;
        }
        return false;
    },

    deleteRequestLocal: (requestId) => {
        const requests = JSON.parse(localStorage.getItem('userRequests') || '[]');
        const filteredRequests = requests.filter(request => request.id !== requestId);
        localStorage.setItem('userRequests', JSON.stringify(filteredRequests));
        return true;
    }
};

// Initialize sample data if no movies exist
const initializeSampleData = async () => {
    const movies = await db.getMovies();
    if (movies.length === 0) {
        const sampleMovies = [
            {
                title: "The Matrix",
                url: "https://example.com/matrix",
                thumbnail: "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
                description: "A computer programmer discovers that reality as he knows it does not exist.",
                category: "trending",
                embedLink: "<iframe width='100%' height='500' src='https://www.youtube.com/embed/vKQi3bIA1Bc' frameborder='0' allowfullscreen></iframe>",
                views: 0,
                createdAt: new Date().toISOString()
            },
            {
                title: "Inception",
                url: "https://example.com/inception",
                thumbnail: "https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg",
                description: "A thief who steals corporate secrets through dream-sharing technology.",
                category: "popular",
                embedLink: "<iframe width='100%' height='500' src='https://www.youtube.com/embed/YoHD9XEInc0' frameborder='0' allowfullscreen></iframe>",
                views: 0,
                createdAt: new Date().toISOString()
            },
            {
                title: "Avengers: Endgame",
                url: "https://example.com/endgame",
                thumbnail: "https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
                description: "The Avengers take a final stand against Thanos.",
                category: "latest",
                embedLink: "<iframe width='100%' height='500' src='https://www.youtube.com/embed/TcMBFSGVi1c' frameborder='0' allowfullscreen></iframe>",
                views: 0,
                createdAt: new Date().toISOString()
            },
            {
                title: "Example External Host Image",
                url: "https://example.com/external",
                thumbnail: "https://ibb.co/sample-image",
                description: "Demonstrating support for external image hosting services like ibb.co, imgur.com, postimg.cc, etc.",
                category: "trending",
                embedLink: "", // No embed link for this sample
                views: 0,
                createdAt: new Date().toISOString()
            }
        ];

        for (const movie of sampleMovies) {
            await db.addMovie(movie);
        }
        console.log('Sample data initialized with embed links');
    }
};

// Initialize sample data when the page loads
document.addEventListener('DOMContentLoaded', initializeSampleData);