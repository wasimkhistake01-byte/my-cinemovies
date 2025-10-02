# StreamFlix - Movie Streaming Website

A complete production-ready movie streaming website with an admin panel for managing content.

## 🔥 Latest Updates

### Universal Thumbnail Link Support
- **No File Extension Restrictions**: Use any valid image URL, not just .jpg files
- **External Hosting Support**: Works with ibb.co, imgur.com, postimg.cc, and any image hosting service
- **Smart Fallback**: Automatic placeholder for broken or invalid image links
- **Enhanced Validation**: URL format validation without file extension requirements

### Live Image Preview
- **Real-time Preview**: See your images immediately as you paste URLs in admin forms
- **Instant Validation**: Get immediate feedback on image link validity
- **Error Handling**: Clear "Invalid Image Link" messages for broken URLs
- **Works Everywhere**: Available in movie forms, series forms, and guide video forms

## 🎬 Features

### Frontend (Homepage)
- **Responsive Design**: Mobile-first approach that works on all devices
- **Movie Categories**: Trending, Latest, and Popular movie sections
- **Movie Cards**: Each movie displays thumbnail, title, description, and action buttons
- **Search Functionality**: Search movies by title with real-time results
- **Modern UI**: Clean, user-friendly interface with smooth animations

### Admin Panel
- **Movie Management**: Add, view, and delete movies
- **Universal Image Support**: Accepts any valid image URL (no file extension restrictions)
- **Live Image Preview**: Real-time preview of thumbnails in admin forms
- **Enhanced Validation**: Smart URL validation with helpful error messages
- **Category Organization**: Organize movies into Trending, Latest, and Popular categories
- **Form Validation**: Ensures all required fields are properly filled
- **Real-time Updates**: Changes appear immediately on the homepage
- **Filter Options**: Filter movies by category in the admin view

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- Modern web browser

### Installation & Setup

1. **Clone or Download** the project files to your desired directory

2. **Start the Server**:
   ```bash
   cd "path-to-your-project-folder"
   node server.js
   ```
   
3. **Access the Website**:
   - Homepage: `http://localhost:8000`
   - Admin Panel: `http://localhost:8000/admin.html`

## 📖 How to Use

### Adding Movies (Admin Panel)

1. Navigate to `http://localhost:8000/admin.html`
2. Fill in the movie form:
   - **Movie Title**: Required - The name of the movie
   - **Movie URL**: Required - Where users will be redirected when clicking "Play"
   - **Thumbnail URL**: Required - Any valid image URL (supports all image hosting services)
   - **Description**: Optional - Brief description of the movie
   - **Category**: Required - Choose from Trending, Latest, or Popular
   - **Live Preview**: See a real-time preview of your thumbnail image as you type the URL

3. Click "Add Movie" to save

### Viewing Movies (Homepage)

1. Navigate to `http://localhost:8000`
2. Browse movies by category sections
3. Use the search bar in the top-right to find specific movies
4. For each movie:
   - **Cancel Button**: Red button (currently for future functionality)
   - **Play Button**: Green button that redirects to the movie URL

## 🛠 Technical Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js (Simple HTTP Server)
- **Database**: localStorage (with Firebase Realtime Database ready)
- **Styling**: Modern CSS with Flexbox/Grid, animations, and responsive design
- **Icons**: Font Awesome 6.0

## 🔧 Database Configuration

The website comes with localStorage as the default storage solution, but it's ready for Firebase integration:

### Using Firebase (Optional)
1. Create a Firebase project at https://console.firebase.google.com
2. Get your Firebase configuration
3. Replace the config in `firebase-config.js`:
   ```javascript
   const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "your-project.firebaseapp.com",
     databaseURL: "https://your-project.firebaseio.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "your-app-id"
   };
   ```

## 📱 Responsive Design

The website is fully responsive and optimized for:
- **Desktop**: Full feature set with optimal layout
- **Tablet**: Adjusted grid layouts and touch-friendly interface
- **Mobile**: Single-column layout with optimized search and navigation

## 🎨 Customization

### Styling
- Main styles: `styles.css` (Homepage)
- Admin styles: `admin-styles.css` (Admin Panel)
- Colors can be easily modified in the CSS variables

### Functionality
- Homepage logic: `script.js`
- Admin logic: `admin-script.js`
- Database operations: `firebase-config.js`

## 📋 File Structure

```
StreamFlix/
├── index.html              # Homepage
├── admin.html              # Admin Panel
├── styles.css              # Homepage styles
├── admin-styles.css        # Admin Panel styles
├── script.js               # Homepage functionality
├── admin-script.js         # Admin Panel functionality
├── firebase-config.js      # Database configuration
├── server.js               # Node.js server
└── README.md               # This file
```

## 🔍 Sample Data

The website comes with sample movies to demonstrate functionality:
- The Matrix (Trending)
- Inception (Popular)
- Avengers: Endgame (Latest)

## 🐛 Troubleshooting

### Server Issues
- Ensure Node.js is installed: `node --version`
- Check if port 8000 is available
- Restart the server if needed

### Movie Images Not Loading
- **Universal Image Support**: The website now supports any valid image URL from any hosting service
- **Supported Sources**: Works with ibb.co, imgur.com, postimg.cc, and any other image hosting service
- **No File Extension Restriction**: Images don't need to end with .jpg or .png
- **Automatic Fallback**: If an image fails to load, a placeholder will be shown
- **Real-time Preview**: Admin panel shows live preview of images as you paste URLs

### Search Not Working
- Ensure JavaScript is enabled in browser
- Check browser console for errors
- Verify movie data is loaded properly

## 🔮 Future Enhancements

- User authentication system
- Video player integration
- Movie ratings and reviews
- Advanced search filters
- User playlists/favorites
- Movie streaming analytics

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Feel free to fork this project and submit pull requests for any improvements!

---

**Happy Streaming! 🎬✨**