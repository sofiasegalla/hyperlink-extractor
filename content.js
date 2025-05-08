/**
 * Extract all <a> elements from a given root (Document or DocumentFragment)
 */
function extractHyperLinks(root) {
  const anchors = Array.from(root.querySelectorAll('a')).filter(a => {
    // Filter out links without href or with fragment-only hrefs
    if (!a.href || a.href === '#' || a.href.endsWith('/#')) return false;
    
    try {
      const url = new URL(a.href);
      // Check if it's just a fragment link to the same page
      if (url.hash && url.pathname === window.location.pathname && 
          url.origin === window.location.origin) {
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  });

  return anchors.map(a => ({
    href: a.href,
    text: (a.innerText || a.textContent || '').trim(),
  }));
}

/**
 * Build the standard pageData object from a list of links
 */
function buildPageData(links) {
  return {
    title: document.title,
    url: window.location.href,
    timestamp: new Date().toISOString(),
    links,
    linkCount: links.length,
    selected: true // Default to selected for new extractions
  };
}

/**
 * Send the extracted data to background, under the given action
 */
function sendLinkData(action, data) {
  chrome.runtime.sendMessage({ action, data }, resp => {
    if (resp?.success) console.log(`${action} sent successfully`);
    else console.error(`${action} failed to send`);
  });
}

/**
 * Extract from the entire document, copy to clipboard, then send.
 */
async function handleExtractAll() {
  const links = extractHyperLinks(document);

  // 1) Copy hrefs (one per line) into the clipboard
  const text = links.map(l => l.href).join('\n');
  try {
    await navigator.clipboard.writeText(text);
    console.log('✅ Links copied to clipboard');
  } catch (e) {
    console.warn('❌ Clipboard write failed:', e);
  }

  // 2) Now send into background/db
  sendLinkData('extractAllLinks', buildPageData(links));
}

/**
 * Extract only from the user's selection, copy to clipboard, then send.
 */
async function handleExtractSelection() {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const frag = sel.getRangeAt(0).cloneContents();
  const links = extractHyperLinks(frag);

  // Copy hrefs
  const text = links.map(l => l.href).join('\n');
  try {
    await navigator.clipboard.writeText(text);
    console.log('✅ Links copied to clipboard');
  } catch (e) {
    console.warn('❌ Clipboard write failed:', e);
  }

  // Send into background/db
  sendLinkData('extractLinksFromSelection', buildPageData(links));
}

// --- message listener ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'ping') {
    sendResponse({ success: true });
    return;
  }

  if (message.action === 'extractAllLinks') {
    handleExtractAll();
    sendResponse({ success: true });
    return;
  }

  if (message.action === 'extractLinksFromSelection') {
    handleExtractSelection();
    sendResponse({ success: true });
    return;
  }
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    extractHyperLinks,
    buildPageData,
    sendLinkData,
    handleExtractAll,
    handleExtractSelection
  };
}