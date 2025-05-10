/**
 * Sidebar script for the Webpage Clipper extension
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
    const pages = await WebpageClipperDB.getAllPages();
    const selectedCheckboxes = document.querySelectorAll('.page-checkbox:checked');
    
    if (!selectedCheckboxes.length) {
      alert('Please select at least one webpage to copy links from.');
      return;
    }
    
    // Get selected titles (each checkbox represents a website)
    const selectedTitles = Array.from(selectedCheckboxes).map(cb => cb.dataset.title);
    
    // Filter pages by selected titles
    const selectedPages = pages.filter(page => selectedTitles.includes(page.title));
    
    // Get copy mode
    const copyMode = document.getElementById('copyModeSelect').value;
    
    // Prepare text based on copy mode
    let clipboardText = '';
    
    // Group by title
    const groupedByTitle = {};
    selectedPages.forEach(page => {
      if (!groupedByTitle[page.title]) {
        groupedByTitle[page.title] = [];
      }
      groupedByTitle[page.title].push(page);
    });
    
    // Process each title (website)
    Object.keys(groupedByTitle).forEach(title => {
      const pagesForTitle = groupedByTitle[title];
      
      // Collect all links from all pages with this title
      let allLinks = [];
      pagesForTitle.forEach(page => {
        allLinks = allLinks.concat(page.links || []);
      });
      
      switch (copyMode) {
        case 'urls':
          // URLs only
          clipboardText += allLinks.map(link => link.href).join('\n');
          break;
        case 'labels':
          // [Text] URL format
          clipboardText += allLinks.map(link => `[${link.text || ''}] ${link.href}`).join('\n');
          break;
        case 'full':
          // Full text + links
          clipboardText += `Title: ${title}\n`;
          clipboardText += `URL: ${pagesForTitle[0].url}\n`;
          clipboardText += `Date: ${formatDate(new Date())}\n`;
          clipboardText += 'Links:\n';
          clipboardText += allLinks.map(link => `- ${link.text || link.href}: ${link.href}`).join('\n');
          clipboardText += '\n\n';
          break;
      }
      
      if (copyMode !== 'full' && Object.keys(groupedByTitle).length > 1) {
        clipboardText += '\n';
      }
    });
    
    // Copy to clipboard
    await navigator.clipboard.writeText(clipboardText);
    
    // Show confirmation
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
async function renderClippedPages() {
  try {
    const pages = await WebpageClipperDB.getAllPages();
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
      delBtn.title = 'Delete all clips for this group';
      delBtn.onclick = async () => {
        try {
          const pagesToDelete = groupPages;
          await Promise.all(pagesToDelete.map(p => WebpageClipperDB.deletePage(p.id)));
          await renderClippedPages();
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
        let preview = '';
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
          const words = text.split(' ').filter(Boolean);
          if (words.length <= 6) {
            preview = words.join(' ');
          } else {
            preview = words.slice(0, 3).join(' ') + ' ... ' + words.slice(-3).join(' ');
          }
        } else {
          preview = '';
        }
        const snipDiv = document.createElement('div');
        snipDiv.className = 'clip-snippet';
        snipDiv.textContent = preview;
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
          toggleBtn.textContent = 'Show more';
          contentDiv.insertBefore(toggleBtn, ul);
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
          await WebpageClipperDB.deletePage(id);
          await renderClippedPages();
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

        const isCollapsed = button.textContent === 'Show more';
        listElement.innerHTML = (isCollapsed ? fullList : fullList.slice(0, 10)).map(l => `
          <li><a href="${l.href}" target="_blank">${l.text || l.href}</a></li>
        `).join('');
        button.textContent = isCollapsed ? 'Show less' : 'Show more';
        contentDiv.insertBefore(button, listElement);
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
          await Promise.all(pagesToDelete.map(p => WebpageClipperDB.deletePage(p.id)));
          await renderClippedPages();
        } catch (err) {
          console.error('Error deleting group:', err);
        }
      });
    });

    // Update select all button text initially
    updateSelectAllButtonText();

  } catch (error) {
    console.error('Error rendering clipped pages:', error);
    clipContainer.innerHTML = `
      <div class="no-clips">
        <p>Error loading clipped pages</p>
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
      await WebpageClipperDB.addPage(clip);
    } catch (err) {
      console.error('Failed to add pending clip:', err);
    }
  }
  // clear the queue
  await chrome.storage.local.set({ pendingClips: [] });
}

// Initialize DB + render on load
async function initialize() {
  try {
    await WebpageClipperDB.init();
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
      const customPrompt = document.getElementById('customPrompt');

      // Load saved prompt from storage on startup
      const { savedPrompt = '' } = await chrome.storage.local.get({ savedPrompt: '' });

      if (savedPrompt) {
        if (savedPrompt !== 'summarize' && savedPrompt !== 'analyze' && savedPrompt !== 'compare') {
          // Treat as custom prompt
          promptSelector.value = 'custom';
          promptSelector.style.display = 'none';
          customPrompt.style.display = 'block';
          customPrompt.value = savedPrompt;
        } else {
          // Predefined prompt
          promptSelector.value = savedPrompt;
          customPrompt.style.display = 'none';
          promptSelector.style.display = 'inline-block';
        }
      }

      // Handle dropdown → custom input
      promptSelector.addEventListener('change', () => {
        if (promptSelector.value === 'custom') {
          promptSelector.style.display = 'none';
          customPrompt.style.display = 'block';
          customPrompt.focus();
        }
        chrome.storage.local.set({ savedPrompt: getSelectedPrompt() });
      });

      // Handle custom input → revert back to dropdown if blank
      customPrompt.addEventListener('blur', () => {
        if (customPrompt.value.trim() === '') {
          customPrompt.style.display = 'none';
          promptSelector.style.display = 'inline-block';
          promptSelector.value = '';
        }
        chrome.storage.local.set({ savedPrompt: getSelectedPrompt() });
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
        
    await renderClippedPages();
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
  if (promptSelector.value === 'custom') {
    return customPrompt.value.trim();
  }
  return promptSelector.value;
}

// Clear all pages
clearAllBtn.addEventListener('click', async () => {
  if (confirm('Are you sure you want to delete all clipped pages?')) {
    try {
      await WebpageClipperDB.clearAllPages();
      await renderClippedPages();
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
        await WebpageClipperDB.addPage(message.data);
        await renderClippedPages();
        await chrome.storage.local.set({ pendingClips: [] });
      } catch (error) {
        console.error('Error adding new clip:', error);
      }
    })();
  }
});


// Kick things off
document.addEventListener('DOMContentLoaded', initialize);