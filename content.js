/**
 * Content script for the Webpage Clipper extension
 * Extracts page content and sends it to the background script
 */

// Function to extract all Hyperlinks from the webpage
function extractAllHyperLinks() {
  const links = Array.from(document.querySelectorAll('a'))
    .filter(link => link.href)
    .map(link => ({
      href: link.href,
      text: link.innerText.trim()
    }));

  return {
    linkCount: links.length,
    links: links
  };
}


// Function to extract and send hyperlink data
function extractAndSendLinks() {
  const { links, linkCount } = extractAllHyperLinks();
  const pageData = {
    title: document.title,
    url: window.location.href,
    timestamp: new Date().toISOString(),
    links: links,
    linkCount: linkCount
  };
  
  chrome.runtime.sendMessage({
    action: 'extractAllLinks', // this must match the one your background listens for
    data: pageData
  }, response => {
    if (response && response.success) {
      console.log('Links extracted and sent successfully');
    } else {
      console.error('Failed to send link data');
    }
  });
}

// Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'ping') {
    sendResponse({ success: true });
    return;
  }

  if (message.action === 'extractAllLinks') {
    extractAndSendLinks();
    sendResponse({ success: true });
  }
});