
/**
 * IndexedDB utility for the Hyperlink Extractor extension
 * Handles database creation, connection, and CRUD operations
 */

const DB_NAME = 'HyperlinkExtractorDB';
const DB_VERSION = 2;
const STORE_NAME = 'savedLinks'; // was 'clippedPages'

// Database connection
let db = null;

// Initialize the database
async function initDB() {
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  
  request.onupgradeneeded = (event) => {
    const db = event.target.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      store.createIndex('url', 'url', { unique: false });
      store.createIndex('timestamp', 'timestamp', { unique: false });
      console.log('Database schema created');
    }
  };

  db = await new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) => reject(event.target.error);
  });

  console.log('Database initialized successfully');
}

// Save a new link to the database
async function saveLink(linkData) {
  if (!db) throw new Error('Database not initialized');
  const data = { ...linkData, timestamp: linkData.timestamp || new Date().toISOString() };

  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  const request = store.add(data);

  return await new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

// Retrieve all saved links
async function getAllLinks() {
  if (!db) throw new Error('Database not initialized');

  const transaction = db.transaction([STORE_NAME], 'readonly');
  const store = transaction.objectStore(STORE_NAME);
  const request = store.getAll();

  return await new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

// Delete a link by its ID
async function deleteLinkById(id) {
  if (!db) throw new Error('Database not initialized');

  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  const request = store.delete(id);

  return await new Promise((resolve, reject) => {
    request.onsuccess = () => resolve();
    request.onerror = (event) => reject(event.target.error);
  });
}

// Clear all saved links
async function clearAllLinks() {
  if (!db) throw new Error('Database not initialized');

  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  const request = store.clear();

  return await new Promise((resolve, reject) => {
    request.onsuccess = () => resolve();
    request.onerror = (event) => reject(event.target.error);
  });
}

// Export the API
window.HyperlinkExtractorDB = {
  init: initDB,
  save: saveLink,
  getAll: getAllLinks,
  deleteById: deleteLinkById,
  clearAll: clearAllLinks
};
