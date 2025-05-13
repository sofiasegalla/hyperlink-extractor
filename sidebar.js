/**
 * Sidebar script for the Hyperlink Extractor 
 * Handles displaying and managing clipped pages using IndexedDB
 */

// Elements
const clipContainer = document.getElementById('clipContainer');
const clearAllBtn   = document.getElementById('clearAllBtn');
const copySelectedBtn = document.getElementById('copySelectedBtn');
const selectAllBtn = document.getElementById('selectAllBtn');

// Format ISO timestamp → human date/time
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function toggleSelectAll() {
  const checkboxes = document.querySelectorAll('.page-checkbox');
  
  // Check if all are selected (or if there are no checkboxes)
  const allSelected = checkboxes.length > 0 && 
    Array.from(checkboxes).every(cb => cb.checked);
  
  // Toggle selection
  checkboxes.forEach(cb => {
    cb.checked = !allSelected;
  });
  
  // Update button text
  updateSelectAllButtonText();
}

// Update the select all button text based on checkbox state
function updateSelectAllButtonText() {
  const checkboxes = document.querySelectorAll('.page-checkbox');
  
  // Check if all are selected
  const allSelected = checkboxes.length > 0 && 
    Array.from(checkboxes).every(cb => cb.checked);
  
  // Set text based on selection state
  selectAllBtn.textContent = allSelected ? 'Deselect All' : 'Select All';
}

// Copy selected links to clipboard
async function copySelectedLinks() {
  try {
    // Get currently selected prompt
    const promptText = getSelectedPrompt();

    // Fetch all saved links
    const pages = await HyperlinkExtractorDB.getAll();
    const selectedCheckboxes = document.querySelectorAll('.page-checkbox:checked');

    if (!selectedCheckboxes.length) {
      alert('Please select at least one webpage to copy links from.');
      return;
    }

    // Determine copy mode
    const copyMode = document.getElementById('copyModeSelect').value;
    let clipboardText = '';

    // If full mode, serialize each page's html with links
    if (copyMode === 'full') {
      // Helper to serialize nodes preserving link markdown
      function serializeWithLinks(node) {
        let out = '';
        node.childNodes.forEach(child => {
          if (child.nodeType === Node.TEXT_NODE) {
            out += child.textContent;
          } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName.toLowerCase() === 'a') {
            const text = child.textContent.trim();
            const href = child.getAttribute('href');
            out += text && href ? `[${text}](${href})` : text;
          } else if (child.nodeType === Node.ELEMENT_NODE) {
            out += serializeWithLinks(child);
          }
        });
        return out;
      }

      for (const cb of selectedCheckboxes) {
        const title = cb.dataset.title;
        // Find the latest page entry for this title
        const page = pages
          .filter(p => p.title === title)
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

        // Build header
        clipboardText += `Title: ${page.title}\n`;
        clipboardText += `URL: ${page.url}\n`;
        clipboardText += `Date: ${formatDate(page.timestamp)}\n\n`;

        // Serialize full content
        const container = document.createElement('div');
        container.innerHTML = page.html || '';
        const serialized = serializeWithLinks(container)
          .replace(/\s+/g, ' ')
          .trim();
        clipboardText += serialized + '\n\n';
      }

    } else {
      // For urls or labels modes, group by title and list link arrays
      const selectedTitles = Array.from(selectedCheckboxes).map(cb => cb.dataset.title);
      const selectedPages = pages.filter(page => selectedTitles.includes(page.title));
      const groupedByTitle = {};
      selectedPages.forEach(page => {
        if (!groupedByTitle[page.title]) groupedByTitle[page.title] = [];
        groupedByTitle[page.title].push(...(page.links || []));
      });

      Object.keys(groupedByTitle).forEach((title, i, all) => {
        const links = groupedByTitle[title];
        if (copyMode === 'urls') {
          clipboardText += links.map(l => l.href).join('\n');
        } else if (copyMode === 'labels') {
          clipboardText += links.map(l => `[${l.text || ''}] ${l.href}`).join('\n');
        }
        if (i < all.length - 1) clipboardText += '\n';
      });
    }

    // Prepend prompt if present
    if (promptText) {
      clipboardText = `${promptText}\n\n"""\n\n${clipboardText}\n\n"""`;
    }

    // Copy and feedback
    await navigator.clipboard.writeText(clipboardText);
    const originalText = copySelectedBtn.textContent;
    copySelectedBtn.textContent = 'Copied!';
    setTimeout(() => {
      copySelectedBtn.textContent = originalText;
    }, 2000);

  } catch (error) {
    console.error('Error copying selected links:', error);
    alert('Failed to copy selected links: ' + error.message);
  }
}


// Main render function
async function renderExtractedLinks() {
  try {
    const pages = await HyperlinkExtractorDB.getAll();
    clipContainer.innerHTML = '';

    if (!pages.length) {
      clipContainer.innerHTML = `
        <div class="no-clips">
          <p>No links extracted yet</p>
          <p>Click "Extract Hyperlinks" in the popup to save a link</p>
        </div>
      `;

      // Disable select all button when no pages
      selectAllBtn.disabled = true;
      return;
    }

    selectAllBtn.disabled = false;

    // Group pages by URL
    const groups = pages.reduce((acc, page) => {
      const key = page.title;
      (acc[key] = acc[key] || []).push(page);
      return acc;
    }, {});

    const sortedGroups = Object.values(groups)
      .map(group => {
        group.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        return group;
      })
      .sort((g1, g2) => new Date(g2[0].timestamp) - new Date(g1[0].timestamp));

    sortedGroups.forEach(groupPages => {
      const groupDiv = document.createElement('div');
      groupDiv.className = 'page-group';

      const entriesDiv = document.createElement('div');
      entriesDiv.className = 'group-entries';

      // Group header: checkbox, title, toggle, delete
      const delBtn = document.createElement('button');
      delBtn.className = 'delete-btn';
      delBtn.textContent = '×';
      delBtn.title = 'Delete all links for this group';
      delBtn.onclick = async () => {
        try {
          const pagesToDelete = groupPages;
          await Promise.all(pagesToDelete.map(p => HyperlinkExtractorDB.deleteById(p.id)));
          await renderExtractedLinks();
        } catch (err) {
          console.error('Error deleting group:', err);
        }
      };

      const headerDiv = document.createElement('div');
      headerDiv.className = 'group-header';
      headerDiv.style.display = 'flex';
      headerDiv.style.alignItems = 'center';
      headerDiv.style.justifyContent = 'space-between';


      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'page-checkbox';
      checkbox.dataset.title = groupPages[0].title;
      
      // Add change event listener to update select all button text
      checkbox.addEventListener('change', updateSelectAllButtonText);

      const titleSpan = document.createElement('span');
      titleSpan.textContent = groupPages[0].title;

      
      const titleWrapper = document.createElement('div');
      titleWrapper.className = 'group-title-wrapper';
      titleWrapper.addEventListener('click', (e) => {
        // Don't toggle when clicking the checkbox
        if (e.target === checkbox) return;

        const isHidden = entriesDiv.style.display === 'none';
        entriesDiv.style.display = isHidden ? 'block' : 'none';
        titleSpan.classList.toggle('collapsed', !isHidden);
      });

      titleWrapper.appendChild(checkbox);
      titleWrapper.appendChild(titleSpan);
      headerDiv.appendChild(titleWrapper);
      headerDiv.appendChild(delBtn);

      groupDiv.appendChild(headerDiv);
      groupDiv.appendChild(entriesDiv);
      clipContainer.appendChild(groupDiv);

      groupPages.forEach(page => {
        const entry = document.createElement('div');
        entry.className = 'extraction-item';

        
        const dateDiv = document.createElement('div');
        dateDiv.className = 'clip-date';
        dateDiv.textContent = formatDate(page.timestamp);
        entry.appendChild(dateDiv);

        // Generate preview from html field: first 3 and last 3 words of visible text (excluding links)
        function createSnippetWithHover(page) {
          // Generate preview from html field: first 3 and last 3 words of visible text (excluding links)
          let preview = '';
          let fullText = '';
          if (page.html) {
            // Parse HTML, remove all <a> tags and their contents, extract visible text
            const container = document.createElement('div');
            container.innerHTML = page.html;
            
            // Remove all <a> tags but keep their text content
            container.querySelectorAll('a').forEach(a => {
              // Replace the <a> with its text content
              const textNode = document.createTextNode(a.textContent || '');
              a.parentNode.replaceChild(textNode, a);
            });
            
            // Get the visible text
            const text = container.textContent.trim().replace(/\s+/g, ' ');
            fullText = text;
            const words = text.split(' ').filter(Boolean);
            
            if (words.length <= 6) {
              preview = words.join(' ');
            } else {
              preview = words.slice(0, 3).join(' ') + ' ... ' + words.slice(-3).join(' ');
            }
          } else {
            preview = '';
          }
          
          // Create the snippet div with hover capabilities
          const snipDiv = document.createElement('div');
          snipDiv.className = 'clip-snippet';
          snipDiv.textContent = preview;
          
          if (fullText) {
            // Add hover functionality
            const tooltipDiv = document.createElement('div');
            tooltipDiv.className = 'preview-tooltip';
            
            // Limit tooltip content length
            let tooltipText = fullText;
            if (tooltipText.length > 500) {
              tooltipText = tooltipText.substring(0, 500) + '...';
            }
            
            tooltipDiv.textContent = tooltipText;
            snipDiv.appendChild(tooltipDiv);
            
            // Add event listeners for hover
            let tooltipTimer;
            
            snipDiv.addEventListener('mouseenter', () => {
              tooltipTimer = setTimeout(() => {
                tooltipDiv.style.display = 'block';
                
                // Position tooltip to stay in viewport
                const rect = snipDiv.getBoundingClientRect();
                const tooltipRect = tooltipDiv.getBoundingClientRect();
                
                // Check if tooltip would go off-screen to the right
                if (rect.left + tooltipRect.width > window.innerWidth) {
                  tooltipDiv.style.left = 'auto';
                  tooltipDiv.style.right = '0';
                }
                
                // Check if tooltip would go off-screen to the bottom
                if (rect.bottom + tooltipRect.height > window.innerHeight) {
                  tooltipDiv.style.top = 'auto';
                  tooltipDiv.style.bottom = '110%';
                }
              }, 300); // Small delay to prevent flickering
            });
            
            snipDiv.addEventListener('mouseleave', () => {
              clearTimeout(tooltipTimer);
              tooltipDiv.style.display = 'none';
            });
            
            // Click to scroll to content in the page
            snipDiv.addEventListener('click', () => {
              // Find this content in the original page
              // debug
              console.log("Snippet clicked", page, fullText);
              scrollToContentInPage(page, fullText);
            });
          }
          
          return snipDiv;
        }
        
        // Function to scroll to text on the original page
        function scrollToContentInPage(page, text) {
          // Check if this page is currently open
          chrome.tabs.query({}, (tabs) => {
            const pageUrl = page.url;
            const matchingTab = tabs.find(tab => tab.url === pageUrl);
            
            if (matchingTab) {
              // Focus the tab
              chrome.tabs.update(matchingTab.id, { active: true }, () => {
                // Then scroll to content
                executeScrollToContent(matchingTab.id, text);
              });
            } else {
              // Tab is not open, open it and then scroll
              chrome.tabs.create({ url: pageUrl }, (newTab) => {
                // Create a one-time listener for this specific tab
                const listenerId = `scroll_listener_${newTab.id}`;
                
                // Store a function reference we can remove later
                chrome.storage.local.get('activeScrollListeners', (data) => {
                  const activeListeners = data.activeScrollListeners || {};
                  
                  // Clean up any previous listener for this tab (shouldn't exist but just in case)
                  if (activeListeners[listenerId]) {
                    chrome.tabs.onUpdated.removeListener(activeListeners[listenerId]);
                  }
                  
                  // Create new listener function
                  const listenerFn = function(tabId, changeInfo) {
                    if (tabId === newTab.id && changeInfo.status === 'complete') {
                      // Wait a bit extra for page to fully render
                      setTimeout(() => {
                        executeScrollToContent(newTab.id, text);
                        
                        // Clean up the listener - it's one-time use
                        chrome.tabs.onUpdated.removeListener(activeListeners[listenerId]);
                        delete activeListeners[listenerId];
                        chrome.storage.local.set({ activeScrollListeners: activeListeners });
                      }, 1000); // A little extra time to ensure the page is fully rendered
                    }
                  };
                  
                  // Save reference to the listener
                  activeListeners[listenerId] = listenerFn;
                  chrome.storage.local.set({ activeScrollListeners: activeListeners });
                  
                  // Add the listener
                  chrome.tabs.onUpdated.addListener(listenerFn);
                });
              });
            }
          });
        }
        
        // Extract the execution script to a reusable function
        function executeScrollToContent(tabId, text) {
          // debug
          console.log("Injecting script into tab", tabId, text);
          chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: findAndScrollToTextFunc,
            args: [text]
          });
        }
        
        // Function to be injected into the page
        function findAndScrollToTextFunc(fullText) {
          // debug
          console.log("Injected script running. Looking for:", fullText);
          return new Promise((resolve) => {
            // Create several search options from different portions of the text
            // to increase chance of finding a match
            const searchOptions = [
              fullText.substring(0, Math.min(100, fullText.length)), // First 100 chars
              fullText.substring(0, Math.min(50, fullText.length)),  // First 50 chars
              fullText.substring(0, Math.min(25, fullText.length))   // First 25 chars
            ];
            
            // Function to normalize text for better matching
            function normalizeText(text) {
              return text.trim().replace(/\s+/g, ' ').toLowerCase();
            }
            
            // Function to find and scroll to text
            function findAndScrollToText() {
              // Create a text node searcher to find all text in the document
              const textNodes = [];
              const walk = document.createTreeWalker(
                document.body, 
                NodeFilter.SHOW_TEXT,
                null,
                false
              );
              
              let currentNode;
              while (currentNode = walk.nextNode()) {
                if (currentNode.textContent.trim()) {
                  textNodes.push(currentNode);
                }
              }
              
              // Normalize all search options
              const normalizedOptions = searchOptions.map(opt => normalizeText(opt));
              
              // Try to find a match using each search option
              let bestMatch = null;
              let bestMatchScore = 0;
              let bestMatchNode = null;
              
              for (const node of textNodes) {
                const nodeText = normalizeText(node.textContent);
                
                for (let i = 0; i < normalizedOptions.length; i++) {
                  const searchOption = normalizedOptions[i];
                  
                  // Check for exact containment
                  if (nodeText.includes(searchOption)) {
                    // Calculate how good of a match this is
                    // (prefer longer matches and matches that are closer to the beginning)
                    const matchScore = searchOption.length * 10 - nodeText.indexOf(searchOption);
                    
                    if (matchScore > bestMatchScore) {
                      bestMatch = searchOption;
                      bestMatchScore = matchScore;
                      bestMatchNode = node;
                    }
                  }
                }
              }
              
              // If we found a match, scroll to it
              if (bestMatchNode) {
                // Get an appropriate element to scroll to
                // We'll walk up the DOM to find a good block element
                let elementToScroll = bestMatchNode.parentElement;
                
                // Keep walking up to find a block element that's big enough to be meaningful
                // But stop at certain levels to avoid going too high
                const stopElements = ['article', 'section', 'div', 'main', 'body'];
                while (elementToScroll && 
                       elementToScroll.offsetHeight < 30 && 
                       !stopElements.includes(elementToScroll.tagName.toLowerCase())) {
                  elementToScroll = elementToScroll.parentElement;
                }
                
                // Now scroll to this element
                elementToScroll.scrollIntoView({
                  behavior: 'smooth',
                  block: 'center'
                });
                
                // Add a clear visual indicator by creating a highlight overlay
                const highlightOverlay = document.createElement('div');
                highlightOverlay.style.position = 'absolute';
                highlightOverlay.style.zIndex = '9999';
                highlightOverlay.style.backgroundColor = 'rgba(255, 255, 0, 0.3)';
                highlightOverlay.style.border = '2px solid #ffa500';
                highlightOverlay.style.boxShadow = '0 0 10px rgba(255, 165, 0, 0.7)';
                highlightOverlay.style.pointerEvents = 'none'; // Allow clicking through
                
                // Position and size the overlay to match the element
                const rect = elementToScroll.getBoundingClientRect();
                highlightOverlay.style.left = (window.scrollX + rect.left) + 'px';
                highlightOverlay.style.top = (window.scrollY + rect.top) + 'px';
                highlightOverlay.style.width = rect.width + 'px';
                highlightOverlay.style.height = rect.height + 'px';
                
                // Add to document and set a timeout to remove
                document.body.appendChild(highlightOverlay);
                
                // Animate the highlight
                let opacity = 0.3;
                let fadeIn = true;
                const pulseAnimation = setInterval(() => {
                  if (fadeIn) {
                    opacity += 0.1;
                    if (opacity >= 0.6) fadeIn = false;
                  } else {
                    opacity -= 0.1;
                    if (opacity <= 0.3) fadeIn = true;
                  }
                  highlightOverlay.style.backgroundColor = `rgba(255, 255, 0, ${opacity})`;
                }, 100);
                
                // Remove after a few seconds
                setTimeout(() => {
                  clearInterval(pulseAnimation);
                  if (document.body.contains(highlightOverlay)) {
                    document.body.removeChild(highlightOverlay);
                  }
                }, 2000);
                
                return true;
              }
              
              return false;
            }
            
            // If document is still loading, wait a bit
            if (document.readyState !== 'complete') {
              window.addEventListener('load', () => {
                setTimeout(() => {
                  const found = findAndScrollToText();
                  resolve(found);
                }, 500);
              });
            } else {
              // Try immediately and then retry after a small delay if not found
              let found = findAndScrollToText();
              
              // If not found on first try, wait and try again
              // (sometimes page needs more time to fully render)
              if (!found) {
                setTimeout(() => {
                  found = findAndScrollToText();
                  resolve(found);
                }, 800);
              } else {
                resolve(found);
              }
            }
          });
        }    
        const snipDiv = createSnippetWithHover(page);
        entry.appendChild(snipDiv);

        const contentDiv = document.createElement('div');
        contentDiv.className = 'clip-content';
        contentDiv.id = `clip-content-${page.id}`;

        const ul = document.createElement('ul');
        ul.className = 'link-list';
        ul.style.cssText = 'padding-left:16px; margin-top:0; list-style:disc';
        (page.links || []).slice(0, 10).forEach(link => {
          const li = document.createElement('li');
          li.innerHTML = `<a href="${link.href}" target="_blank">${link.text || link.href}</a>`;
          ul.appendChild(li);
        });
        contentDiv.appendChild(ul);

        if ((page.links || []).length > 10) {
          const toggleBtn = document.createElement('button');
          toggleBtn.className = 'toggle-btn';
          toggleBtn.dataset.id = page.id;
          toggleBtn.setAttribute('aria-expanded', 'false');
          toggleBtn.textContent = '▼ Show more';
          contentDiv.appendChild(toggleBtn);
        }
        

        entry.appendChild(contentDiv);

        const hr = document.createElement('hr');
        hr.className = 'extraction-divider';
        entry.appendChild(hr);

        entriesDiv.appendChild(entry);
      });
    });

    // Delete single extraction
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async e => {
        const id = parseInt(e.currentTarget.dataset.id, 10);
        try {
          await HyperlinkExtractorDB.deleteById(id);
          await renderExtractedLinks();
        } catch (err) {
          console.error('Error deleting page:', err);
        }
      });
    });

    // Toggle full link list
    document.querySelectorAll('.toggle-btn').forEach(button => {
      button.addEventListener('click', () => {
        const id = button.dataset.id;
        const contentDiv = document.getElementById(`clip-content-${id}`);
        const listElement = contentDiv.querySelector('.link-list');
        const fullPage = pages.find(p => p.id == id);
        const fullList = fullPage?.links || [];
    
        const isCollapsed = button.getAttribute('aria-expanded') === 'false';
    
        listElement.innerHTML = (isCollapsed ? fullList : fullList.slice(0, 10)).map(l => `
          <li><a href="${l.href}" target="_blank">${l.text || l.href}</a></li>
        `).join('');
    
        button.textContent = isCollapsed ? '▲ Show less' : '▼ Show more';
        button.setAttribute('aria-expanded', isCollapsed ? 'true' : 'false');
      });
    });


    // Delete entire group
    document.querySelectorAll('.group-delete-btn').forEach(button => {
      button.addEventListener('click', async () => {
        const group = button.closest('.page-group');
        const title = group.querySelector('.group-header span').textContent;
        if (!confirm(`Delete all clips for "${title}"?`)) return;

        try {
          const pagesToDelete = pages.filter(p => p.title === title);
          await Promise.all(pagesToDelete.map(p => HyperlinkExtractorDB.deleteById(p.id)));
          await renderExtractedLinks();
        } catch (err) {
          console.error('Error deleting group:', err);
        }
      });
    });

    // Update select all button text initially
    updateSelectAllButtonText();

  } catch (error) {
    console.error('Error rendering extracted links:', error);
    clipContainer.innerHTML = `
      <div class="no-clips">
        <p>Error loading extracted links</p>
        <p>${error.message}</p>
      </div>
    `;
  }
}

async function drainPendingClips() {
  const { pendingClips = [] } = await chrome.storage.local.get({ pendingClips: [] });
  if (!pendingClips.length) return;
  for (const clip of pendingClips) {
    try {
      await HyperlinkExtractorDB.save(clip);
    } catch (err) {
      console.error('Failed to add link:', err);
    }
  }
  // clear the queue
  await chrome.storage.local.set({ pendingClips: [] });
}


function setupSearch() {
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  
  // Show/hide clear button based on input content
  searchInput.addEventListener('input', () => {
    const hasText = searchInput.value.trim() !== '';
    clearSearchBtn.style.display = hasText ? 'block' : 'none';
    filterLinksBySearch(searchInput.value);
  });
  
  // Clear search when button is clicked
  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    filterLinksBySearch('');
    searchInput.focus();
  });
  
  // Handle escape key to clear search
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchInput.value = '';
      clearSearchBtn.style.display = 'none';
      filterLinksBySearch('');
    }
  });
}

// Add this function to filter links based on search input
function filterLinksBySearch(searchTerm) {
  const normalizedTerm = searchTerm.toLowerCase().trim();
  const pageGroups = document.querySelectorAll('.page-group');
  
  if (!normalizedTerm) {
    // Show all if no search term
    pageGroups.forEach(group => group.style.display = 'block');
    return;
  }
  
  let hasVisibleGroups = false;
  
  pageGroups.forEach(group => {
    const title = group.querySelector('.group-title-wrapper span').textContent.toLowerCase();
    const linkElements = group.querySelectorAll('.link-list a');
    
    // Check if title or any link in this group matches search term
    const titleMatches = title.includes(normalizedTerm);
    let linkMatches = false;
    
    linkElements.forEach(link => {
      const linkText = link.textContent.toLowerCase();
      const linkHref = link.getAttribute('href').toLowerCase();
      
      if (linkText.includes(normalizedTerm) || linkHref.includes(normalizedTerm)) {
        linkMatches = true;
      }
    });
    
    const showGroup = titleMatches || linkMatches;
    group.style.display = showGroup ? 'block' : 'none';
    
    if (showGroup) {
      hasVisibleGroups = true;
    }
  });
  
  // Show "no results" message if nothing matches
  if (!hasVisibleGroups && normalizedTerm) {
    let noResults = document.getElementById('noSearchResults');
    if (!noResults) {
      noResults = document.createElement('div');
      noResults.id = 'noSearchResults';
      noResults.className = 'no-clips';
      noResults.innerHTML = `<p>No matches found for "${searchTerm}"</p>`;
      clipContainer.appendChild(noResults);
    } else {
      noResults.innerHTML = `<p>No matches found for "${searchTerm}"</p>`;
      noResults.style.display = 'block';
    }
  } else {
    const noResults = document.getElementById('noSearchResults');
    if (noResults) {
      noResults.style.display = 'none';
    }
  }
}

// Initialize DB + render on load
async function initialize() {
  try {
    await HyperlinkExtractorDB.init();
    await drainPendingClips();
    
    //for settings related to copy type
    const sel = document.getElementById('copyModeSelect');
    const { copyMode = 'urls' } = await chrome.storage.local.get({ copyMode: 'urls' });
    sel.value = copyMode;
    sel.addEventListener('change', () => {
      chrome.storage.local.set({ copyMode: sel.value });
    });

    // for prompt selector functionality
    const promptSelector = document.getElementById('promptSelector');
    const customPromptContainer = document.getElementById('customPromptContainer');
    const customPrompt = document.getElementById('customPrompt');
    const clearPromptBtn = document.getElementById('clearPromptBtn');

    // Load saved prompt from storage on startup
    const { savedPrompt = '' } = await chrome.storage.local.get({ savedPrompt: '' });
    const defaultPrompts = [
      'Given the list of hyperlinks, convert each link into a properly formatted APA style citation.',
      'Generate a concise summary of the content found at these links. Please state the title and link followed by the summary for each page.',
      'Given the list of hyperlinks, identify the ones that are academically reliable and relevant to the current topic of my investigation. Be sure to give justification.'
    ];
    if (savedPrompt && !defaultPrompts.includes(savedPrompt)) {
      promptSelector.style.display = 'none';
      customPromptContainer.style.display = '';
      customPrompt.value = savedPrompt;
    } else {
      promptSelector.value = savedPrompt;
      promptSelector.style.display = '';
      customPromptContainer.style.display = 'none';
      customPrompt.value = '';
    }

    // Handle dropdown → custom input
    promptSelector.addEventListener('change', () => {
      if (promptSelector.value === 'custom') {
        promptSelector.style.display = 'none';
        customPromptContainer.style.display = '';
        customPrompt.focus();
      }
      chrome.storage.local.set({ savedPrompt: getSelectedPrompt() });
    });

    // Handle custom input → revert back to dropdown if blank (on blur)
    customPrompt.addEventListener('blur', () => {
      if (customPrompt.value.trim() === '') {
        customPromptContainer.style.display = 'none';
        promptSelector.style.display = '';
        promptSelector.value = '';
      }
      chrome.storage.local.set({ savedPrompt: getSelectedPrompt() });
    });

    // Handle Clear button
    clearPromptBtn.addEventListener('click', () => {
      customPrompt.value = '';
      customPromptContainer.style.display = 'none';
      promptSelector.value = '';
      promptSelector.style.display = '';
      chrome.storage.local.set({ savedPrompt: '' });
    });

      // for auto-copy toggle
      const autoCopyToggle = document.getElementById('autoCopyToggle');

      // Load saved state
      const { autoCopy = true } = await chrome.storage.local.get({ autoCopy: true });
      autoCopyToggle.checked = autoCopy;

      // Save when user toggles
      autoCopyToggle.addEventListener('change', () => {
        chrome.storage.local.set({ autoCopy: autoCopyToggle.checked });
      });

          // Add event listener for copy selected button
      copySelectedBtn.addEventListener('click', copySelectedLinks);
      
      // Add event listener for select all button
      selectAllBtn.addEventListener('click', toggleSelectAll);
        
    await renderExtractedLinks();
    setupSearch();
  } catch (error) {
    console.error('Error initializing database:', error);
    clipContainer.innerHTML = `
      <div class="no-clips">
        <p>Error initializing database</p>
        <p>${error.message}</p>
      </div>
    `;
  }
}

function getSelectedPrompt() {
  const sel = document.getElementById('promptSelector');
  const custom = document.getElementById('customPrompt');
  return sel.value === 'custom' ? custom.value.trim() : sel.value;
}

// Clear all pages
clearAllBtn.addEventListener('click', async () => {
  if (confirm('Are you sure you want to delete all extracted links?')) {
    try {
      await HyperlinkExtractorDB.clearAll();
      await renderExtractedLinks();
    } catch (error) {
      console.error('Error clearing pages:', error);
    }
  }
});

// Listen for new clips from the background
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.action === 'newClip' && message.data) {
    (async () => {
      try {
        await HyperlinkExtractorDB.save(message.data);
        await renderExtractedLinks();
        await chrome.storage.local.set({ pendingClips: [] });
      } catch (error) {
        console.error('Error adding new link:', error);
      }
    })();
  }
});


// Kick things off
document.addEventListener('DOMContentLoaded', initialize);