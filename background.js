/**
 * Background service worker for the Webpage Clipper extension
 * Initializes the database and handles side panel setup
 */

// Register the side panel
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Set up message handling for content script communication
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'extractAllLinks') {
    // Forward the clip request to the sidebar
    chrome.runtime.sendMessage({
      action: 'newClip',
      data: message.data
    });
    
    // Always respond immediately, don't leave the promise hanging
    sendResponse({ success: true });
  }
  
  // Don't return true here, as we're not using asynchronous response
  // This resolves the "message channel closed" error
});

// Add a context menu item for clipping the current page
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'extractAllLinks',
    title: 'Extract All Hyperlinks',
    contexts: ['page']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'extractAllLinks') {
    // First check if content script is ready by sending a ping
    chrome.tabs.sendMessage(tab.id, { action: 'ping' }, (response) => {
      if (chrome.runtime.lastError) {
        // Content script isn't ready, inject it
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        }, () => {
          if (chrome.runtime.lastError) {
            console.error('Failed to inject content script:', chrome.runtime.lastError);
            return;
          }
          // Now try to clip the page
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, { action: 'extractAllLinks' });
          }, 100);
        });
      } else {
        // Content script is ready, clip the page
        chrome.tabs.sendMessage(tab.id, { action: 'extractAllLinks' });
      }
    });
  }
});

console.log('Webpage Clipper background script loaded');
