(function() {
  'use strict';
  
  // Configuration
  const CONFIG = {
    aggressiveMode: true,  // Remove entire containers, not just hide
    blockMutations: true,  // Watch for dynamic injection
    logBlocks: false
  };

  let blockedCount = 0;
  
  // Selectors that identify AI Overview containers
  const AI_OVERVIEW_SELECTORS = [
    // Main AI Overview container (varies by region/A/B test)
    '[data-attrid*="ai overview"]',
    '[data-attrid*="aiOverview"]',
    '[data-attrid*="genai"]',
    'div[data-init-vis="true"][data-ved*="AI"]',
    
    // Specific class patterns Google uses
    '.xpdopen',  // Often wraps AI overviews
    '.kp-blk',   // Knowledge panel blocks that contain AI
    'div[class*="ai-overview"]',
    'div[class*="AiOverview"]',
    'div[class*="genai"]',
    'div[class*="Generative"]',
    
    // Attribute-based detection
    'div[data-md*="AI Overview"]',
    'div[data-md*="Overview"]',
    'div[jsname][data-async-context*="ai"]',
    
    // Experimental / dynamic identifiers
    '#_aig',
    'div[jscontroller*="AI"]',
    'g-accordion-expander',  // Often contains AI generated content
    
    // Fallback: look for specific text patterns in children
    'div:has(> div > span:contains("AI Overview"))',
    'div:has(> h2:contains("AI Overview"))',
    'div:has(> div > h3:contains("AI Overview"))'
  ];

  // Function to check if element contains AI Overview indicators
  function isAIOverview(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
    
    const html = element.outerHTML.toLowerCase();
    const text = element.innerText?.toLowerCase() || '';
    
    const indicators = [
      'ai overview',
      'ai-generated',
      'generative ai',
      'overview powered by',
      'gemini',
      'search labs',
      'experimental'
    ];
    
    // Check for AI indicator text
    for (const indicator of indicators) {
      if (text.includes(indicator) && text.length < 5000) {
        return true;
      }
    }
    
    // Check data attributes
    const dataAttrs = JSON.stringify(element.dataset).toLowerCase();
    if (dataAttrs.includes('ai') && dataAttrs.includes('overview')) return true;
    if (dataAttrs.includes('genai')) return true;
    
    return false;
  }

  // Remove element completely from DOM
  function obliterate(element) {
    if (!element || !element.parentNode) return;
    
    blockedCount++;
    
    if (CONFIG.aggressiveMode) {
      element.remove();
    } else {
      element.style.display = 'none !important';
      element.style.visibility = 'hidden !important';
      element.style.height = '0 !important';
      element.style.overflow = 'hidden !important';
    }
    
    if (CONFIG.logBlocks) {
      console.log('[AI Blocker] Obliterated AI Overview element:', element);
    }
  }

  // Main scrubber function
  function scrub() {
    // Method 1: CSS selectors
    for (const selector of AI_OVERVIEW_SELECTORS) {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (isAIOverview(el) || selector.includes('ai-overview') || selector.includes('genai')) {
            obliterate(el);
          }
        });
      } catch (e) {
        // Invalid selector, skip
      }
    }
    
    // Method 2: Tree walker for dynamic content
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_ELEMENT,
      null,
      false
    );
    
    let node;
    while (node = walker.nextNode()) {
      if (isAIOverview(node)) {
        obliterate(node);
      }
    }
  }

  // Initial scrub before render
  if (document.documentElement) {
    scrub();
  }

  // MutationObserver to catch dynamically injected AI Overviews
  if (CONFIG.blockMutations && window.MutationObserver) {
    const observer = new MutationObserver((mutations) => {
      let shouldScrub = false;
      
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (isAIOverview(node) || 
                (node.querySelector && node.querySelector(AI_OVERVIEW_SELECTORS.join(',')))) {
              shouldScrub = true;
              break;
            }
          }
        }
        if (shouldScrub) break;
      }
      
      if (shouldScrub) {
        scrub();
      }
    });
    
    observer.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'data-attrid', 'jsname']
    });
  }

  // Intercept fetch/XHR to prevent AI overview data loading
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = args[0]?.toString() || '';
    if (url.includes('genai') || url.includes('aioverview') || url.includes('llm')) {
      console.log('[AI Blocker] Blocked fetch:', url);
      return Promise.reject(new Error('AI Overview request blocked'));
    }
    return originalFetch.apply(this, args);
  };

  const originalXHR = window.XMLHttpRequest;
  window.XMLHttpRequest = function() {
    const xhr = new originalXHR();
    const originalOpen = xhr.open;
    
    xhr.open = function(method, url, ...rest) {
      if (url.includes('genai') || url.includes('aioverview') || url.includes('llm')) {
        console.log('[AI Blocker] Blocked XHR:', url);
        throw new Error('AI Overview request blocked');
      }
      return originalOpen.call(this, method, url, ...rest);
    };
    
    return xhr;
  };

  // Report blocked count
  setInterval(() => {
    if (blockedCount > 0) {
      chrome.runtime?.sendMessage?.({
        type: 'BLOCKED_COUNT',
        count: blockedCount
      });
    }
  }, 1000);

})();
