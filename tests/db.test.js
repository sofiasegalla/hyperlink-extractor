// tests/db.test.js
// This is a simplified test for your IndexedDB operations

describe('WebpageClipperDB', () => {
  // Mock the key IndexedDB objects
  let mockDB;
  let mockStore;
  let mockTransaction;
  
  beforeEach(() => {
    // Mock store operations
    mockStore = {
      add: jest.fn(),
      getAll: jest.fn()
    };
    
    // Mock transaction
    mockTransaction = {
      objectStore: jest.fn().mockReturnValue(mockStore)
    };
    
    // Mock database
    mockDB = {
      transaction: jest.fn().mockReturnValue(mockTransaction)
    };
    
    // Mock the global indexedDB
    global.indexedDB = {
      open: jest.fn()
    };
    
    // Set up the request mock with needed callbacks
    const mockRequest = {
      result: mockDB,
      onsuccess: null,
      onerror: null
    };
    
    // Configure the open request to return our mock
    global.indexedDB.open.mockReturnValue(mockRequest);
    
    // Import the module that defines window.WebpageClipperDB
    require('../utils/db.js');
  });
  
  it('should add a page to the database', async () => {
    // 1. Initialize the database
    const initPromise = window.WebpageClipperDB.init();
    
    // 2. Trigger success to complete initialization
    global.indexedDB.open().onsuccess();
    
    // 3. Wait for init to complete
    await initPromise;
    
    // 4. Set up the add response
    const addRequest = {
      result: 123, // This will be the ID of the added record
      onsuccess: null
    };
    mockStore.add.mockReturnValue(addRequest);
    
    // 5. Call the addPage method with test data
    const pageData = {
      title: 'Test Page',
      url: 'https://example.com',
      links: [{ href: 'https://example.com/page1', text: 'Link 1' }]
    };
    
    const addPromise = window.WebpageClipperDB.addPage(pageData);
    
    // 6. Simulate successful database add
    mockStore.add.mock.results[0].value.onsuccess();
    
    // 7. Wait for add to complete
    const result = await addPromise;
    
    // 8. Verify that the database operations were called correctly
    expect(mockDB.transaction).toHaveBeenCalledWith(['clippedPages'], 'readwrite');
    expect(mockTransaction.objectStore).toHaveBeenCalledWith('clippedPages');
    
    // 9. Verify data was added with expected format
    expect(mockStore.add).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Test Page',
      url: 'https://example.com',
      links: [{ href: 'https://example.com/page1', text: 'Link 1' }],
      timestamp: expect.any(String)
    }));
    
    // 10. Verify the returned ID
    expect(result).toBe(123);
  });
});