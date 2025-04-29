// Improved mock for Chrome API
global.chrome = {
    runtime: {
      sendMessage: jest.fn((message, callback) => {
        if (callback) {
          callback({ success: true });
        }
        return true;
      }),
      onMessage: {
        addListener: jest.fn()
      }
    },
    tabs: {
      sendMessage: jest.fn()
    },
    sidePanel: {
      setPanelBehavior: jest.fn()
    },
    contextMenus: {
      create: jest.fn(),
      onClicked: {
        addListener: jest.fn()
      }
    }
  };
  
  // Mock CSS.escape
  global.CSS = {
    escape: jest.fn(str => str)
  };
  
  // Mock implementation of URL if it doesn't exist in test environment
  if (typeof URL === 'undefined') {
    global.URL = class URL {
      constructor(url) {
        this.href = url;
        // Basic parsing of URL components
        const urlParts = url.split('//');
        const protocol = urlParts[0] || '';
        const rest = urlParts[1] || '';
        
        this.protocol = protocol.endsWith(':') ? protocol : protocol + ':';
        this.hostname = rest.split('/')[0] || '';
        this.pathname = '/' + (rest.indexOf('/') > -1 ? rest.substring(rest.indexOf('/') + 1) : '');
        this.host = this.hostname;
        this.origin = this.protocol + '//' + this.hostname;
      }
      
      toString() {
        return this.href;
      }
    };
  }
  
  // Implement document.createRange for JSDOM
  if (!document.createRange) {
    document.createRange = () => {
      const range = {
        setStart: jest.fn(),
        setEnd: jest.fn(),
        commonAncestorContainer: document,
        selectNodeContents: jest.fn(),
        cloneContents: () => {
          const fragment = document.createDocumentFragment();
          // You would need to implement actual copying of nodes here
          return fragment;
        }
      };
      return range;
    };
  }
  
  // Add mock for document.createDocumentFragment
  if (!document.createDocumentFragment) {
    document.createDocumentFragment = () => {
      return {
        querySelectorAll: selector => {
          return document.querySelectorAll(selector);
        },
        appendChild: jest.fn()
      };
    };
  }
  
  // Add local storage mock
  if (!global.localStorage) {
    global.localStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    };
  }
  
  // Mock console methods to avoid cluttering test output
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
  
  // Restore original console methods after tests
  afterAll(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });