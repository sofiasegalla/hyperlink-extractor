# Hyperlink Extractor Chrome Extension

A Chrome extension that allows you to quickly copy all hyperlinks contained in a page or a selected section of a page with a right-click button option. It saves the hyperlinks to your clipboard, optionally with a preloaded prompt. There is a sidebar that showcases your history of copied content and allows you to tweak some settings.  

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the extension directory
5. The Webpage Clipper extension should now be installed and ready to use

## Usage

1. Click the extension icon in your toolbar to open the popup
2. Click "Clip Current Page" to save the current webpage
3. Click "Open Clipped Pages" to view your saved clips in the sidebar
4. In the sidebar, you can:
   - View all your clipped pages
   - Click on URLs to open the original pages
   - Delete individual clips using the × button
   - Clear all clips using the "Clear All" button

## Code Structure

- `manifest.json`: Extension configuration (Manifest V3)
- `popup.html/popup.js`: UI when clicking the extension icon
- `sidebar.html/sidebar.js`: The sidebar panel interface
- `content.js`: Script to extract webpage content
- `background.js`: Background service worker
- `utils/db.js`: IndexedDB utility functions

## Architecture and Separation of Concerns

The extension follows a clean separation of concerns pattern to make the codebase maintainable and the IndexedDB implementation clear:

1. **Data Layer (`utils/db.js`)**
   - Contains ALL IndexedDB-specific code
   - Manages database connection, schema definition, and migrations
   - Provides a clean API for CRUD operations through `window.WebpageClipperDB`
   - Handles all direct interactions with IndexedDB
   - Abstracts away IndexedDB complexity from the rest of the application

   ```javascript
   // This code at the end of db.js creates a global object called WebpageClipperDB
   window.WebpageClipperDB = {
     init: initDB,                     // Function to initialize the database
     addPage: addClippedPage,          // Function to add a new page to the database
     getAllPages: getAllClippedPages,  // Function to get all saved pages
     deletePage: deleteClippedPage,    // Function to delete a specific page
     clearAllPages: clearAllClippedPages // Function to delete all pages
   };
   ```

   **How This Works:**
   
   Imagine this as creating a "toolbox" named `WebpageClipperDB` that contains all the tools needed to work with our database. We:
   
   1. Create the toolbox on the `window` object so it's available everywhere in the extension
   2. Put specific tools (functions) inside with easy-to-understand names
   3. Each tool does one specific job (like "add a page" or "delete a page")
   4. Other parts of the extension can now use these tools without knowing the complicated details
   
   For example, when the sidebar needs to show all clipped pages, it simply calls:
   ```javascript
   WebpageClipperDB.getAllPages().then(pages => {
     // Now we can display the pages
   });
   ```
   The sidebar doesn't need to know HOW the data is fetched from IndexedDB, just that it will get the data.

2. **UI Layer (`sidebar.js`, `popup.js`)**
   - Never interacts directly with IndexedDB
   - Uses the API exposed by the data layer
   - Responsible for rendering data and handling user interactions
   - Example: `sidebar.js` calls `WebpageClipperDB.getAllPages()` without knowledge of how data is stored

3. **Content Script (`content.js`)**
   - Responsible for extracting page content
   - Prepares data to be stored but doesn't interact with IndexedDB
   - Sends data to background script for storage

4. **Coordination Layer (`background.js`)**
   - Coordinates communication between different components
   - Routes messages between content scripts and sidebar
   - Doesn't directly interact with IndexedDB

This architecture provides several benefits:
- **Maintainability**: Database changes only need to be made in one file
- **Clarity**: Clear separation between data storage and UI logic
- **Testability**: Components can be tested in isolation
- **Scalability**: Easy to add new features or modify existing ones

## IndexedDB Implementation

The extension uses IndexedDB for persistent client-side storage. Key aspects of the implementation:

- Database creation and schema definition in `utils/db.js`
- CRUD operations for managing clipped pages
- Asynchronous nature of IndexedDB with Promises
- Indexes for optimized queries
