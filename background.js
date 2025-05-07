/**
 * Background service worker for the Webpage Clipper extension
 * Initializes the database and handles side panel setup
 */

// Register the side panel
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Helper to append a clip to storage
async function queueClip(data) {
  const { pendingClips = [] } = await chrome.storage.local.get({ pendingClips: [] });
  pendingClips.push(data);
  await chrome.storage.local.set({ pendingClips });
}

// Relay extractor results into the sidebar *and* store them
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { action, data } = message;
  if (action === 'extractLinksFromSelection') {
    queueClip(data).catch(console.error);
    chrome.runtime.sendMessage({ action: 'newClip', data });
    sendResponse({ success: true });
  }
});

// Create context-menu item on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'extractLinksFromSelection',
    title: 'Extract links from selection',
    contexts: ['selection']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log('[Background] onClicked:', info, 'tab:', tab);
  if (!tab?.id) {
    console.warn('[Background] no valid tab ID—aborting');
    return;
  }

  if (info.menuItemId !== 'extractLinksFromSelection') {
    console.log('[Background] clicked menuItemId not recognized—ignoring');
    return;
  }

  const extractorAction = 'extractLinksFromSelection';

  const buildMessage = () => {
    const msg = { action: extractorAction, selectionText: info.selectionText };
    console.log('[Background] sending to content script:', msg);
    chrome.tabs.sendMessage(tab.id, msg);
  };

  // Ping to see if content.js is loaded
  console.log('[Background] pinging content script in tab', tab.id);
  chrome.tabs.sendMessage(tab.id, { action: 'ping' }, response => {
    if (chrome.runtime.lastError) {
      console.warn('[Background] ping failed:', chrome.runtime.lastError.message);
      console.log('[Background] injecting content.js into tab', tab.id);
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      }, () => {
        if (chrome.runtime.lastError) {
          console.error('[Background] injection failed:', chrome.runtime.lastError);
          return;
        }
        console.log('[Background] content.js injected successfully');
        setTimeout(() => {
          console.log('[Background] now sending extract message post-injection');
          buildMessage();
        }, 100);
      });
    } else {
      console.log('[Background] ping succeeded, content.js is ready');
      buildMessage();
    }
  });
});

console.log('[Background] Webpage Clipper (link-extractor) background script loaded');
