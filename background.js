// Block Google AI Overviews at the network level
// and redirect to clean search if detected

const AI_OVERVIEW_PATTERNS = [
  'genai',
  'aioverview',
  'llm',
  'generativelanguage'
];

chrome.declarativeNetRequest.onRuleMatchedDebug?.addListener((info) => {
  console.log('[AI Blocker] Blocked request:', info.request.url);
});

// Listen for navigation to AI Overview URLs and strip them
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  const url = new URL(details.url);
  
  // If URL contains AI overview parameters, strip them
  if (url.searchParams.has('udm') && url.searchParams.get('udm') === '14') {
    url.searchParams.delete('udm');
    const cleanUrl = url.toString();
    chrome.tabs.update(details.tabId, { url: cleanUrl });
  }
  
  // Block any direct AI overview query parameters
  for (const param of ['genai', 'aioverview', 'llm']) {
    if (url.searchParams.has(param)) {
      url.searchParams.delete(param);
      chrome.tabs.update(details.tabId, { url: url.toString() });
    }
  }
}, {
  url: [{ hostContains: 'google' }]
});

// Badge update on block
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'BLOCKED_COUNT') {
    chrome.action.setBadgeText({
      text: message.count.toString(),
      tabId: sender.tab.id
    });
    chrome.action.setBadgeBackgroundColor({ color: '#dc2626' });
  }
});
