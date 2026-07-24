document.addEventListener('DOMContentLoaded', () => {
  // Load blocked count
  chrome.storage.local.get(['blockedCount'], (result) => {
    document.getElementById('blockedCount').textContent = result.blockedCount || '0';
  });
  
  // Toggle aggressive mode
  const toggle = document.getElementById('aggressiveToggle');
  chrome.storage.local.get(['aggressiveMode'], (result) => {
    if (result.aggressiveMode === false) {
      toggle.classList.remove('active');
    }
  });
  
  toggle.addEventListener('click', () => {
    toggle.classList.toggle('active');
    const isActive = toggle.classList.contains('active');
    chrome.storage.local.set({ aggressiveMode: isActive });
  });
});
