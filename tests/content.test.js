// tests/content.test.js

// Import the original functions for testing
const {
  extractHyperLinks,
  buildPageData,
  sendLinkData
} = require('../content.js');

// We don't need to mock the whole module for these tests
jest.mock('../content.js', () => jest.requireActual('../content.js'));

describe('extractHyperLinks', () => {
  beforeEach(() => {
    // Set up a simple HTML structure with links for testing
    document.body.innerHTML = `
      <div id="test-root">
        <a href="https://example.com/page1">Link 1</a>
        <a href="https://example.com/page2">Link 2</a>
        <a href="#">Empty Link</a>
        <a>No Href Link</a>
      </div>
    `;
  });

  it('should extract valid links and filter out invalid ones', () => {
    // Get the root element for testing
    const root = document.getElementById('test-root');
    
    // Call the function
    const links = extractHyperLinks(root);
    
    // Should only return links with valid hrefs (2 in this case)
    expect(links).toHaveLength(2);
    
    expect(links).toContainEqual({
      href: 'https://example.com/page1',
      text: 'Link 1'
    });
    
    expect(links).toContainEqual({
      href: 'https://example.com/page2',
      text: 'Link 2'
    });
    
    // Check that invalid links are filtered out
    const hrefs = links.map(link => link.href);
    expect(hrefs).not.toContain('#');
  });
});

describe('buildPageData', () => {
  beforeEach(() => {
    // Mock window.location
    delete window.location;
    window.location = new URL('https://example.com');
    
    // Mock document.title
    document.title = 'Test Page';
  });

  it('should build page data correctly', () => {
    const mockLinks = [
      { href: 'https://example.com/page1', text: 'Link 1' },
      { href: 'https://example.com/page2', text: 'Link 2' }
    ];
    
    const result = buildPageData(mockLinks);
    
    expect(result).toEqual({
      title: 'Test Page',
      url: 'https://example.com/',
      timestamp: expect.any(String),
      links: mockLinks,
      linkCount: 2
    });
  });
});

describe('sendLinkData', () => {
  beforeEach(() => {
    chrome.runtime.sendMessage.mockReset();
  });

  it('should send data to background script', () => {
    // Mock successful response
    chrome.runtime.sendMessage.mockImplementation((message, callback) => {
      callback({ success: true });
    });
    
    // Create spy for console.log
    console.log = jest.fn();
    console.error = jest.fn();
    
    const mockData = { 
      title: 'Test Page', 
      links: [{ href: 'https://example.com', text: 'Link' }] 
    };
    
    sendLinkData('testAction', mockData);
    
    // Verify sendMessage was called with correct parameters
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      { action: 'testAction', data: mockData },
      expect.any(Function)
    );
    
    // Verify console.log was called when successful
    expect(console.log).toHaveBeenCalledWith('testAction sent successfully');
    expect(console.error).not.toHaveBeenCalled();
  });

  it('should log error when sending fails', () => {
    // Mock failed response
    chrome.runtime.sendMessage.mockImplementation((message, callback) => {
      callback({ success: false });
    });
    
    // Create spy for console.log and console.error
    console.log = jest.fn();
    console.error = jest.fn();
    
    const mockData = { 
      title: 'Test Page', 
      links: [{ href: 'https://example.com', text: 'Link' }] 
    };
    
    sendLinkData('testAction', mockData);
    
    // Verify console.error was called when failed
    expect(console.error).toHaveBeenCalledWith('testAction failed to send');
    expect(console.log).not.toHaveBeenCalled();
  });
});