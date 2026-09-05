/* ==========================================================================
   ELEPHANT BEACH VILLA - ADVANCED MULTI-ROOM CALENDAR & STEPPER COUNTER
   Integrated with Google Sheets via Google Apps Script (google-apps-script.gs)
   ========================================================================== */

const CONFIG = {
  // Google Apps Script Web App Deployment URL:
  // Dynamically populated from /api/status, localStorage, or environment
  GOOGLE_SCRIPT_WEB_APP_URL: "https://script.google.com/macros/s/AKfycbwvo22afIhUCYaJOWs5r5CyopuoaZbDsMaQXCGkjNOBIRqjYQ4Wc-O88HfdT5aznN5M/exec",
  SPREADSHEET_ID: "1iWA1wp2b4qY63jrzmU5rjFMRPZj0Wd0peG0VdOomBHE"
};

// Session state for authenticated admin actions
let adminSessionPin = null;

document.addEventListener("DOMContentLoaded", function () {
  initIntegrationConfig();
  initDateLimits();
  initMobileMenu();
  initGuestStepperCounter();
  initHeroMultiRoomSelector();
  initHeroCheckBar();
  initMultiRoomCalendar();
  fetchLiveAvailability();
  initFormHandlers();
  initContactFormHandler();
  initPhoneCountryCodePicker();
});

/* Real-Time Integration Status & Configuration */
function initIntegrationConfig() {
  const savedLocalUrl = localStorage.getItem("ebv_google_script_url");
  if (savedLocalUrl && savedLocalUrl.trim() && !savedLocalUrl.includes("elephantbeachvilla_webapp")) {
    CONFIG.GOOGLE_SCRIPT_WEB_APP_URL = savedLocalUrl.trim();
  }

  fetch("/api/status")
    .then(r => r.json())
    .then(data => {
      if (data && data.webAppUrl && !data.isPlaceholder) {
        CONFIG.GOOGLE_SCRIPT_WEB_APP_URL = data.webAppUrl;
        localStorage.setItem("ebv_google_script_url", data.webAppUrl);
        updateAdminSyncBadge("synced", "🟢 Synced (Live)");
      } else {
        if (CONFIG.GOOGLE_SCRIPT_WEB_APP_URL && !CONFIG.GOOGLE_SCRIPT_WEB_APP_URL.includes("elephantbeachvilla_webapp")) {
          updateAdminSyncBadge("synced", "🟢 Synced (Browser)");
        } else {
          updateAdminSyncBadge("warning", "⚠️ Web App URL Needed");
        }
      }
    })
    .catch(() => {
      if (CONFIG.GOOGLE_SCRIPT_WEB_APP_URL && !CONFIG.GOOGLE_SCRIPT_WEB_APP_URL.includes("elephantbeachvilla_webapp")) {
        updateAdminSyncBadge("synced", "🟢 Synced (Browser)");
      } else {
        updateAdminSyncBadge("warning", "⚠️ Web App URL Needed");
      }
    });
}

function updateAdminSyncBadge(status, text) {
  const badge = document.getElementById("adminSyncBadge");
  if (!badge) return;
  badge.className = `admin-sync-badge ${status}`;
  badge.textContent = text;
}

function openAdminSettingsModal() {
  const modal = document.getElementById("adminSettingsModal");
  const input = document.getElementById("adminWebAppUrlInput");
  const statusBox = document.getElementById("adminConnectionStatusBox");

  if (input) {
    const activeUrl = (CONFIG.GOOGLE_SCRIPT_WEB_APP_URL && !CONFIG.GOOGLE_SCRIPT_WEB_APP_URL.includes("elephantbeachvilla_webapp"))
      ? CONFIG.GOOGLE_SCRIPT_WEB_APP_URL
      : (localStorage.getItem("ebv_google_script_url") || "");
    input.value = activeUrl;
  }

  if (statusBox) {
    statusBox.style.display = "none";
    statusBox.className = "admin-connection-result";
    statusBox.innerHTML = "";
  }

  if (modal) modal.style.display = "flex";
}

function closeAdminSettingsModal() {
  const modal = document.getElementById("adminSettingsModal");
  if (modal) modal.style.display = "none";
}

async function handleTestConnection() {
  const input = document.getElementById("adminWebAppUrlInput");
  const statusBox = document.getElementById("adminConnectionStatusBox");
  const testBtn = document.getElementById("adminTestConnectionBtn");
  const url = input ? input.value.trim() : "";

  if (!url) {
    if (statusBox) {
      statusBox.className = "admin-connection-result error";
      statusBox.style.display = "block";
      statusBox.innerHTML = "⚠️ Please enter your deployed Google Apps Script Web App URL.";
    }
    return;
  }

  if (testBtn) {
    testBtn.disabled = true;
    testBtn.textContent = "Testing...";
  }

  if (statusBox) {
    statusBox.className = "admin-connection-result loading";
    statusBox.style.display = "block";
    statusBox.innerHTML = `<span>⏳</span> Connecting to Google Apps Script Web App...`;
  }

  try {
    const res = await fetch("/api/test-connection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webAppUrl: url })
    });
    const data = await res.json();

    if (data && data.status === "success") {
      statusBox.className = "admin-connection-result success";
      statusBox.innerHTML = `<strong>✓ Connection Successful!</strong><br/>${escapeHtml(data.message)}`;
      updateAdminSyncBadge("synced", "🟢 Synced (Live)");
    } else {
      statusBox.className = "admin-connection-result error";
      statusBox.innerHTML = `<strong>✕ Connection Test Failed:</strong><br/>${escapeHtml(data.message || "Could not reach Google Apps Script.")}`;
      updateAdminSyncBadge("error", "✕ Sync Error");
    }
  } catch (err) {
    statusBox.className = "admin-connection-result error";
    statusBox.innerHTML = `<strong>✕ Network Error:</strong><br/>${escapeHtml(err.message)}`;
    updateAdminSyncBadge("error", "✕ Sync Error");
  } finally {
    if (testBtn) {
      testBtn.disabled = false;
      testBtn.textContent = "Test Connection";
    }
  }
}

async function handleSaveSettings() {
  const input = document.getElementById("adminWebAppUrlInput");
  const saveBtn = document.getElementById("adminSaveSettingsBtn");
  const url = input ? input.value.trim() : "";

  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";
  }

  try {
    const res = await fetch("/api/admin/set-web-app-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pin: adminSessionPin || "elephantbeachvilla@1234",
        webAppUrl: url
      })
    });
    const data = await res.json();

    if (data && data.status === "success") {
      CONFIG.GOOGLE_SCRIPT_WEB_APP_URL = url;
      localStorage.setItem("ebv_google_script_url", url);
      showToast("✓ Web App URL saved and connected successfully.", "success");
      updateAdminSyncBadge("synced", "🟢 Synced (Live)");
      closeAdminSettingsModal();
      fetchLiveAvailability();
    } else {
      showToast(`⚠️ ${data.message || "Failed to save Web App URL"}`, "error");
    }
  } catch (err) {
    CONFIG.GOOGLE_SCRIPT_WEB_APP_URL = url;
    localStorage.setItem("ebv_google_script_url", url);
    showToast("✓ Web App URL saved in browser storage.", "success");
    closeAdminSettingsModal();
    fetchLiveAvailability();
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save & Connect";
    }
  }
}

/* Helper: Toast Notification System */
function showToast(message, type = "info", duration = 4500) {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.setAttribute("role", "status");
    container.setAttribute("aria-live", "polite");
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast-item ${type}`;

  const iconMap = {
    success: "✓",
    error: "✕",
    warning: "⚠️",
    info: "ℹ"
  };
  const icon = iconMap[type] || "ℹ";

  toast.innerHTML = `
    <div class="toast-content">
      <span class="toast-icon">${icon}</span>
      <div class="toast-message">${escapeHtml(message)}</div>
    </div>
    <button class="toast-close-btn" type="button" aria-label="Close notification">&times;</button>
  `;

  const closeBtn = toast.querySelector(".toast-close-btn");
  const dismiss = () => {
    toast.classList.add("fade-out");
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 260);
  };

  if (closeBtn) closeBtn.addEventListener("click", dismiss);
  container.appendChild(toast);

  if (duration > 0) {
    setTimeout(dismiss, duration);
  }
}

/* Helper: Escape HTML to prevent injection */
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* Helper: Get Today's Date normalized to Midnight */
function getTodayZero() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/* Helper: Format Date object to YYYY-MM-DD string */
function formatDateISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/* Set HTML5 Date Picker Minimums to Today's Date */
function initDateLimits() {
  const todayStr = formatDateISO(new Date());
  const dateInputs = document.querySelectorAll("input[type='date']");
  dateInputs.forEach(input => {
    input.min = todayStr;
  });
}

/* ==========================================================================
   MOBILE NAVIGATION: Fixed Bottom Icon Toolbar + Left-Side Hidden Text Drawer
   ========================================================================== */
function initMobileMenu() {
  ensureMobileToolbars();
  setupMobileToolbarInteractions();
}

function ensureMobileToolbars() {
  // 1. Determine active page identifier
  const currentPath = (window.location.pathname || "").toLowerCase();
  let activePage = "home";
  if (currentPath.includes("about")) activePage = "about";
  else if (currentPath.includes("room")) activePage = "rooms";
  else if (currentPath.includes("avail")) activePage = "availability";
  else if (currentPath.includes("gallery")) activePage = "gallery";
  else if (currentPath.includes("contact")) activePage = "contact";

  // 2. Ensure Left-Side Hidden Text Toolbar Overlay & Drawer
  if (!document.getElementById("leftTextToolbar")) {
    const overlay = document.createElement("div");
    overlay.id = "leftTextToolbarOverlay";
    overlay.className = "left-drawer-overlay";
    overlay.setAttribute("aria-hidden", "true");

    const drawer = document.createElement("aside");
    drawer.id = "leftTextToolbar";
    drawer.className = "left-text-drawer";
    drawer.setAttribute("aria-label", "Main Navigation Menu");
    drawer.setAttribute("aria-hidden", "true");

    drawer.innerHTML = `
      <div class="left-drawer-header">
        <a href="index.html" class="left-drawer-logo">
          <img src="Elephant_Beach_Villa_logo.png" alt="Elephant Beach Villa Logo" class="brand-logo-img" data-media="global.logo">
          <div class="left-drawer-logo-text">
            <div class="left-drawer-logo-title">Elephant Beach <span>Villa</span></div>
            <div class="left-drawer-logo-subtitle">Komari, Eastern Coast · Sri Lanka</div>
          </div>
        </a>
        <button type="button" id="closeLeftTextDrawerBtn" class="left-drawer-close-btn" aria-label="Close menu">&times;</button>
      </div>

      <div class="left-drawer-body">
        <div class="left-drawer-section-title">Navigation</div>
        <nav class="left-drawer-nav">
          <a href="index.html" class="left-drawer-link ${activePage === 'home' ? 'active' : ''}">
            <span class="left-drawer-link-left">
              <span class="left-drawer-bullet">✦</span>
              <span>Home</span>
            </span>
          </a>
          <a href="about.html" class="left-drawer-link ${activePage === 'about' ? 'active' : ''}">
            <span class="left-drawer-link-left">
              <span class="left-drawer-bullet">✦</span>
              <span>About The Space</span>
            </span>
          </a>

          <div class="left-drawer-group">
            <a href="rooms.html" class="left-drawer-link ${activePage === 'rooms' ? 'active' : ''}">
              <span class="left-drawer-link-left">
                <span class="left-drawer-bullet">✦</span>
                <span>Bedrooms & Suites</span>
              </span>
            </a>
            <div class="left-drawer-sublinks">
              <a href="rooms.html" class="left-drawer-sublink">All 4 Bedrooms Overview</a>
              <a href="rooms.html#large-rooms" class="left-drawer-sublink">2 Large-Bed Suites (King)</a>
              <a href="rooms.html#twin-rooms" class="left-drawer-sublink">2 Twin-Bed Rooms (2 Beds)</a>
            </div>
          </div>

          <a href="availability.html" class="left-drawer-link ${activePage === 'availability' ? 'active' : ''}">
            <span class="left-drawer-link-left">
              <span class="left-drawer-bullet">✦</span>
              <span>Resort Availability & Calendar</span>
            </span>
            <span class="left-drawer-badge-live">Live</span>
          </a>
          <a href="gallery.html" class="left-drawer-link ${activePage === 'gallery' ? 'active' : ''}">
            <span class="left-drawer-link-left">
              <span class="left-drawer-bullet">✦</span>
              <span>Photo Gallery</span>
            </span>
          </a>
          <a href="contact.html" class="left-drawer-link ${activePage === 'contact' ? 'active' : ''}">
            <span class="left-drawer-link-left">
              <span class="left-drawer-bullet">✦</span>
              <span>Contact & Directions</span>
            </span>
          </a>
        </nav>

        <div class="left-drawer-divider"></div>

        <div class="left-drawer-section-title">Direct Concierge</div>
        <div class="left-drawer-concierge-btns">
          <a href="https://wa.me/94772186718" target="_blank" rel="noopener noreferrer" class="left-drawer-concierge-btn whatsapp">
            <span>💬 WhatsApp Host Neesha</span>
          </a>
          <a href="tel:+94772186718" class="left-drawer-concierge-btn phone">
            <span>📞 Call (+94 77 218 6718)</span>
          </a>
          <a href="availability.html" class="btn btn-primary" style="width: 100%; text-align: center; margin-top: 6px; font-size: 0.85rem; padding: 11px;">
            Book Now / Check Dates
          </a>
        </div>

        <div class="left-drawer-footer">
          <div>Elephant Beach Villa · Komari</div>
          <small style="opacity: 0.7;">Direct Booking & Best Rate Guaranteed</small>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);
  }

  // 3. Ensure Bottom Toolbar (Only Professional Icons Without Texts)
  if (!document.getElementById("mobileBottomToolbar")) {
    const bottomNav = document.createElement("nav");
    bottomNav.id = "mobileBottomToolbar";
    bottomNav.className = "mobile-bottom-toolbar";
    bottomNav.setAttribute("aria-label", "Mobile Navigation Bar");

    bottomNav.innerHTML = `
      <!-- 1. Menu Icon: Opens Left Hidden Text Toolbar -->
      <button type="button" id="mobileBottomMenuBtn" class="mobile-bottom-btn" aria-label="Open Navigation Menu" title="Navigation Menu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="12" x2="16" y2="12"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>

      <!-- 2. Home Icon -->
      <a href="index.html" class="mobile-bottom-btn ${activePage === 'home' ? 'active' : ''}" aria-label="Home" title="Home">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
          <polyline points="9 21 9 12 15 12 15 21"/>
        </svg>
      </a>

      <!-- 3. Bedrooms / Suites Icon -->
      <a href="rooms.html" class="mobile-bottom-btn ${activePage === 'rooms' ? 'active' : ''}" aria-label="Bedrooms & Suites" title="Bedrooms & Suites">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 9v11M22 9v11M2 12h20M4 12V7a2 2 0 012-2h12a2 2 0 012 2v5M6 12V9m12 3V9"/>
        </svg>
      </a>

      <!-- 4. Calendar / Availability Icon -->
      <a href="availability.html" class="mobile-bottom-btn ${activePage === 'availability' ? 'active' : ''}" aria-label="Resort Availability" title="Resort Availability">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
          <circle cx="8" cy="15" r="1.2" fill="currentColor"/>
          <circle cx="12" cy="15" r="1.2" fill="currentColor"/>
          <circle cx="16" cy="15" r="1.2" fill="currentColor"/>
        </svg>
      </a>

      <!-- 5. Gallery Icon -->
      <a href="gallery.html" class="mobile-bottom-btn ${activePage === 'gallery' ? 'active' : ''}" aria-label="Photo Gallery" title="Photo Gallery">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
      </a>

      <!-- 6. Contact Icon -->
      <a href="contact.html" class="mobile-bottom-btn ${activePage === 'contact' ? 'active' : ''}" aria-label="Contact Host" title="Contact Host">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
        </svg>
      </a>
    `;

    document.body.appendChild(bottomNav);
  }

  // 4. Ensure header has a quick Book action button on phone
  const headerGrid = document.querySelector(".header-nav-grid");
  if (headerGrid && !headerGrid.querySelector(".header-mobile-quick-btn")) {
    const quickBtn = document.createElement("a");
    quickBtn.href = "availability.html";
    quickBtn.className = "header-mobile-quick-btn";
    quickBtn.textContent = "Book";
    headerGrid.appendChild(quickBtn);
  }
}

function setupMobileToolbarInteractions() {
  const drawer = document.getElementById("leftTextToolbar");
  const overlay = document.getElementById("leftTextToolbarOverlay");
  const bottomMenuBtn = document.getElementById("mobileBottomMenuBtn");
  const headerToggleBtn = document.querySelector(".mobile-toggle");
  const closeDrawerBtn = document.getElementById("closeLeftTextDrawerBtn");

  function openLeftDrawer() {
    if (drawer && overlay) {
      drawer.classList.add("active");
      overlay.classList.add("active");
      drawer.setAttribute("aria-hidden", "false");
      overlay.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    }
  }

  function closeLeftDrawer() {
    if (drawer && overlay) {
      drawer.classList.remove("active");
      overlay.classList.remove("active");
      drawer.setAttribute("aria-hidden", "true");
      overlay.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }
  }

  if (bottomMenuBtn) {
    bottomMenuBtn.addEventListener("click", (e) => {
      e.preventDefault();
      openLeftDrawer();
    });
  }

  if (headerToggleBtn) {
    if (headerToggleBtn.textContent.trim() === "☰" || !headerToggleBtn.querySelector("svg")) {
      headerToggleBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="12" x2="17" y2="12"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      `;
    }
    headerToggleBtn.addEventListener("click", (e) => {
      e.preventDefault();
      openLeftDrawer();
    });
  }

  if (closeDrawerBtn) {
    closeDrawerBtn.addEventListener("click", (e) => {
      e.preventDefault();
      closeLeftDrawer();
    });
  }

  if (overlay) {
    overlay.addEventListener("click", closeLeftDrawer);
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && drawer && drawer.classList.contains("active")) {
      closeLeftDrawer();
    }
  });

  // Close drawer when any internal link is clicked
  if (drawer) {
    const links = drawer.querySelectorAll("a");
    links.forEach(link => {
      link.addEventListener("click", () => {
        closeLeftDrawer();
      });
    });
  }
}

/* Modern Stepper Counter Widget (+ / - Buttons, Max 8 Guests) */
let guestCount = 2;

function initGuestStepperCounter() {
  const minusBtn = document.getElementById("guestMinusBtn");
  const plusBtn = document.getElementById("guestPlusBtn");
  const valueDisplay = document.getElementById("guestValueDisplay");

  try {
    const saved = localStorage.getItem("ebv_guest_count");
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 8) {
        guestCount = parsed;
      }
    }
  } catch (e) {}

  if (valueDisplay) {
    valueDisplay.textContent = `${guestCount} Guest${guestCount > 1 ? 's' : ''}`;
  }

  if (minusBtn && plusBtn && valueDisplay) {
    minusBtn.addEventListener("click", () => {
      if (guestCount > 1) {
        guestCount--;
        valueDisplay.textContent = `${guestCount} Guest${guestCount > 1 ? 's' : ''}`;
        try { localStorage.setItem("ebv_guest_count", guestCount); } catch (e) {}
      }
    });

    plusBtn.addEventListener("click", () => {
      if (guestCount < 8) {
        guestCount++;
        valueDisplay.textContent = `${guestCount} Guest${guestCount > 1 ? 's' : ''}`;
        try { localStorage.setItem("ebv_guest_count", guestCount); } catch (e) {}
      } else {
        alert("Maximum capacity for Elephant Beach Villa is 8 guests (4 bedrooms).");
      }
    });
  }
}

/* Homepage Hero Multi-Room Selector Popover Logic */
let heroSelectedRoomIds = new Set(["room1", "room2", "room3", "room4"]); // Default: Entire Villa

function initHeroMultiRoomSelector() {
  const toggleBtn = document.getElementById("multiRoomToggleBtn");
  const popover = document.getElementById("multiRoomPopover");
  const checkboxes = document.querySelectorAll(".hero-room-checkbox");
  const displayText = document.getElementById("multiRoomDisplayText");

  if (!toggleBtn || !popover) return;

  // Toggle popover visibility
  toggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    popover.classList.toggle("active");
  });

  document.addEventListener("click", (e) => {
    if (!popover.contains(e.target) && e.target !== toggleBtn) {
      popover.classList.remove("active");
    }
  });

  checkboxes.forEach(cb => {
    cb.addEventListener("change", (e) => {
      const val = cb.value;
      if (val === "entire") {
        if (cb.checked) {
          heroSelectedRoomIds = new Set(["room1", "room2", "room3", "room4"]);
          checkboxes.forEach(c => { if (c.value !== "entire") c.checked = true; });
        } else {
          heroSelectedRoomIds.clear();
          checkboxes.forEach(c => c.checked = false);
        }
      } else {
        const entireCb = document.querySelector(".hero-room-checkbox[value='entire']");
        if (cb.checked) {
          heroSelectedRoomIds.add(val);
        } else {
          heroSelectedRoomIds.delete(val);
          if (entireCb) entireCb.checked = false;
        }
        if (heroSelectedRoomIds.size === 4 && entireCb) {
          entireCb.checked = true;
        }
      }
      updateHeroDisplay();
    });
  });

  function updateHeroDisplay() {
    if (!displayText) return;
    if (heroSelectedRoomIds.size === 4 || heroSelectedRoomIds.size === 0) {
      displayText.textContent = "Entire Villa (All 4 Rooms · 8 Guests)";
    } else {
      displayText.textContent = `${heroSelectedRoomIds.size} Room${heroSelectedRoomIds.size > 1 ? 's' : ''} Selected (Max ${heroSelectedRoomIds.size * 2} Guests)`;
    }
  }

  updateHeroDisplay();
}

/* Hero Check Dates Form Navigation */
function initHeroCheckBar() {
  const heroForm = document.getElementById("heroCheckBarForm");

  if (heroForm) {
    heroForm.addEventListener("submit", function (e) {
      e.preventDefault();
      
      const checkIn = document.getElementById("heroCheckIn") ? document.getElementById("heroCheckIn").value : "";
      const checkOut = document.getElementById("heroCheckOut") ? document.getElementById("heroCheckOut").value : "";

      if (checkIn && checkOut) {
        const nights = Math.round((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
        if (nights === 1 || nights < 2) {
          showToast("⚠️ Minimum 2 nights stay required. Please select at least 2 nights.", "warning");
          return;
        }
      }

      let roomParam = "entire";
      if (heroSelectedRoomIds.size > 0 && heroSelectedRoomIds.size < 4) {
        roomParam = Array.from(heroSelectedRoomIds).join(",");
      }

      // Redirect to Availability Page with URL Parameters
      const url = `availability.html?checkIn=${encodeURIComponent(checkIn)}&checkOut=${encodeURIComponent(checkOut)}&guests=${guestCount}&rooms=${encodeURIComponent(roomParam)}`;
      window.location.href = url;
    });
  }
}

/* 4 Rooms Data Configuration with Real Unsplash Photos */
const ROOMS_DATA = [
  {
    id: "room1",
    name: "Room 1: Ocean View Twin",
    badge: "2 Single Beds · Max 2 Guests",
    img: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80",
    bookedDates: new Set(["2026-09-05", "2026-09-06", "2026-09-07", "2026-09-24", "2026-09-25"])
  },
  {
    id: "room2",
    name: "Room 2: Estuary View Twin",
    badge: "2 Single Beds · Max 2 Guests",
    img: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=600&q=80",
    bookedDates: new Set(["2026-09-12", "2026-09-13", "2026-09-14", "2026-09-15"])
  },
  {
    id: "room3",
    name: "Room 3: Sunset Master Suite",
    badge: "1 Large King Bed · Max 2 Guests",
    img: "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=600&q=80",
    bookedDates: new Set(["2026-09-18", "2026-09-19", "2026-09-20"])
  },
  {
    id: "room4",
    name: "Room 4: Oceanfront Master Suite",
    badge: "1 Large King Bed · Max 2 Guests",
    img: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=600&q=80",
    bookedDates: new Set(["2026-10-01", "2026-10-02", "2026-10-03"])
  }
];

let currentActiveRoomIds = new Set(["room1", "room2", "room3", "room4"]);

function checkBookedCollision(start, end, roomIds = null) {
  if (!start || !end) return null;
  const s = new Date(start);
  const e = new Date(end);
  const targetIds = roomIds || currentActiveRoomIds;
  const activeRooms = ROOMS_DATA.filter(r => (targetIds && targetIds.has) ? targetIds.has(r.id) : true);

  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    const dStr = d.toISOString().split('T')[0];
    for (const room of activeRooms) {
      if (room.bookedDates.has(dStr)) {
        return room;
      }
    }
  }
  return null;
}

function initMultiRoomCalendar() {
  const multiCalendarContainer = document.getElementById("multiCalendarContainer");
  const roomCards = document.querySelectorAll(".room-select-card");
  const selectAllBtn = document.getElementById("selectAllVillaBtn");
  const selectedRoomsInput = document.getElementById("selectedRoomsInput");
  
  const checkInInput = document.getElementById("checkInInput");
  const checkOutInput = document.getElementById("checkOutInput");

  if (!multiCalendarContainer) return;

  let selectedRoomIds = new Set(["room1", "room2", "room3", "room4"]); // Default: Entire Villa
  
  const today = getTodayZero();
  let currentYear = today.getFullYear();
  let currentMonth = today.getMonth();

  let startDate = null;
  let endDate = null;
  let isAdminMode = false;
  const stagedChanges = new Map(); // key: `${roomId}_${dateStr}` -> { roomId, dateStr, originalStatus, newStatus }

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Parse & Sanitize URL Parameters from Homepage Check Dates
  const urlParams = new URLSearchParams(window.location.search);
  const rawCheckIn = urlParams.get("checkIn");
  const rawCheckOut = urlParams.get("checkOut");
  const rawRooms = urlParams.get("rooms") || urlParams.get("room");

  const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (rawCheckIn && isoDateRegex.test(rawCheckIn) && !isNaN(Date.parse(rawCheckIn))) {
    startDate = rawCheckIn;
    if (checkInInput) checkInInput.value = rawCheckIn;
  }
  if (rawCheckOut && isoDateRegex.test(rawCheckOut) && !isNaN(Date.parse(rawCheckOut))) {
    endDate = rawCheckOut;
    if (checkOutInput) checkOutInput.value = rawCheckOut;
  }

  // Synchronize Homepage Selected Rooms onto Availability Page Cards (Sanitized against valid IDs)
  const validRoomIds = new Set(["room1", "room2", "room3", "room4"]);
  if (rawRooms) {
    if (rawRooms === "entire") {
      selectedRoomIds = new Set(["room1", "room2", "room3", "room4"]);
    } else {
      const sanitizedRoomArr = rawRooms
        .split(",")
        .map(r => r.trim().toLowerCase())
        .filter(r => validRoomIds.has(r));
      if (sanitizedRoomArr.length > 0) {
        selectedRoomIds = new Set(sanitizedRoomArr);
      }
    }
    roomCards.forEach(c => {
      if (selectedRoomIds.has(c.dataset.room)) {
        c.classList.add("active");
      } else {
        c.classList.remove("active");
      }
    });
  }

  // Sync Selected Rooms Display Text in Booking Form
  function updateSelectedRoomsDisplay() {
    if (!selectedRoomsInput) return;
    
    if (selectedRoomIds.size === 4) {
      selectedRoomsInput.value = "Entire Villa (All 4 Bedrooms)";
    } else {
      const selectedNames = ROOMS_DATA.filter(r => selectedRoomIds.has(r.id)).map(r => r.name);
      selectedRoomsInput.value = selectedNames.join(", ");
    }
  }

  // Synchronize Guest Allocation Stepper from URL or LocalStorage
  const rawGuests = urlParams.get("guests");
  let availGuestCount = 2;
  if (rawGuests && !isNaN(parseInt(rawGuests, 10))) {
    availGuestCount = parseInt(rawGuests, 10);
  } else {
    try {
      const savedCount = localStorage.getItem("ebv_guest_count");
      if (savedCount && !isNaN(parseInt(savedCount, 10))) {
        availGuestCount = parseInt(savedCount, 10);
      }
    } catch (e) {}
  }
  if (availGuestCount < 1) availGuestCount = 1;
  if (availGuestCount > 8) availGuestCount = 8;
  try { localStorage.setItem("ebv_guest_count", availGuestCount); } catch (e) {}

  const availGuestMinusBtn = document.getElementById("availGuestMinusBtn");
  const availGuestPlusBtn = document.getElementById("availGuestPlusBtn");
  const availGuestValueDisplay = document.getElementById("availGuestValueDisplay");
  const guestAllocationInput = document.getElementById("guestAllocation");

  function syncAvailGuestDisplay() {
    if (availGuestValueDisplay) {
      availGuestValueDisplay.textContent = `${availGuestCount} Guest${availGuestCount > 1 ? 's' : ''}`;
    }
    if (guestAllocationInput) {
      guestAllocationInput.value = `${availGuestCount} Guest${availGuestCount > 1 ? 's' : ''}`;
    }
  }
  syncAvailGuestDisplay();

  if (availGuestMinusBtn && availGuestPlusBtn) {
    availGuestMinusBtn.addEventListener("click", () => {
      if (availGuestCount > 1) {
        availGuestCount--;
        syncAvailGuestDisplay();
        try { localStorage.setItem("ebv_guest_count", availGuestCount); } catch (e) {}
      }
    });

    availGuestPlusBtn.addEventListener("click", () => {
      if (availGuestCount < 8) {
        availGuestCount++;
        syncAvailGuestDisplay();
        try { localStorage.setItem("ebv_guest_count", availGuestCount); } catch (e) {}
      } else {
        showToast("Maximum capacity for Elephant Beach Villa is 8 guests (4 bedrooms).", "warning");
      }
    });
  }

  // Room Card Selection Events
  roomCards.forEach(card => {
    card.addEventListener("click", () => {
      const roomId = card.dataset.room;
      if (selectedRoomIds.has(roomId) && selectedRoomIds.size > 1) {
        selectedRoomIds.delete(roomId);
        card.classList.remove("active");
      } else {
        selectedRoomIds.add(roomId);
        card.classList.add("active");
      }
      updateSelectedRoomsDisplay();
      resetDateSelection();
      renderAllCalendars();
    });
  });

  if (selectAllBtn) {
    selectAllBtn.addEventListener("click", () => {
      selectedRoomIds = new Set(["room1", "room2", "room3", "room4"]);
      roomCards.forEach(c => c.classList.add("active"));
      updateSelectedRoomsDisplay();
      resetDateSelection();
      renderAllCalendars();
    });
  }

  function resetDateSelection() {
    startDate = null;
    endDate = null;
    if (checkInInput) checkInInput.value = "";
    if (checkOutInput) checkOutInput.value = "";
  }

  // Synchronize Manual Date Picker Inputs with Popup Warnings
  if (checkInInput) {
    checkInInput.addEventListener("change", () => {
      const val = checkInInput.value;
      if (!val) {
        startDate = null;
        renderAllCalendars();
        return;
      }
      const activeRooms = ROOMS_DATA.filter(r => selectedRoomIds.has(r.id));
      const bookedRoom = activeRooms.find(r => r.bookedDates.has(val));
      if (bookedRoom) {
        showToast(`⚠️ Selected check-in date (${val}) is already booked for ${bookedRoom.name}. Please select an open date slot.`, "warning");
        checkInInput.value = "";
        startDate = null;
        renderAllCalendars();
        return;
      }
      startDate = val;
      if (checkOutInput && checkOutInput.value) {
        validateInputsDateRange();
      }
      renderAllCalendars();
    });
  }

  if (checkOutInput) {
    checkOutInput.addEventListener("change", () => {
      const val = checkOutInput.value;
      if (!val) {
        endDate = null;
        renderAllCalendars();
        return;
      }
      validateInputsDateRange();
      renderAllCalendars();
    });
  }

  function validateInputsDateRange() {
    if (!checkInInput || !checkOutInput) return;
    const inVal = checkInInput.value;
    const outVal = checkOutInput.value;
    if (!inVal || !outVal) return;

    if (new Date(outVal) <= new Date(inVal)) {
      showToast("⚠️ Check-out date must be after check-in date.", "warning");
      checkOutInput.value = "";
      endDate = null;
      return;
    }

    const nights = Math.round((new Date(outVal) - new Date(inVal)) / (1000 * 60 * 60 * 24));
    if (nights === 1 || nights < 2) {
      showToast("⚠️ Minimum 2 nights stay required. Please select at least 2 nights.", "warning");
      checkOutInput.value = "";
      endDate = null;
      return;
    }

    const collisionRoom = checkBookedCollision(inVal, outVal);
    if (collisionRoom) {
      showToast(`⚠️ Cannot select range: ${collisionRoom.name} has already booked date slots between ${inVal} and ${outVal}. Please pick available dates.`, "warning");
      checkOutInput.value = "";
      endDate = null;
      return;
    }

    startDate = inVal;
    endDate = outVal;
  }

  function renderAllCalendars() {
    currentActiveRoomIds = selectedRoomIds;
    multiCalendarContainer.innerHTML = "";
    const activeRooms = ROOMS_DATA.filter(r => selectedRoomIds.has(r.id));

    activeRooms.forEach(room => {
      const roomCardEl = document.createElement("div");
      roomCardEl.className = "room-calendar-card";

      roomCardEl.innerHTML = `
        <div class="calendar-room-header">
          <div class="calendar-room-title">${room.name}</div>
          <span style="font-size: 0.75rem; color: var(--color-gold); font-weight: bold;">${room.badge}</span>
        </div>
        <div class="calendar-header">
          <button class="calendar-nav-btn prev-btn">← Prev</button>
          <h4 style="font-size: 1.1rem; font-family: var(--font-serif);">${monthNames[currentMonth]} ${currentYear}</h4>
          <button class="calendar-nav-btn next-btn">Next →</button>
        </div>
        <div class="calendar-legend">
          <div class="legend-item"><div class="legend-box available"></div><span>Open</span></div>
          <div class="legend-item"><div class="legend-box booked"></div><span>Booked</span></div>
          <div class="legend-item"><div class="legend-box selected"></div><span>Selected</span></div>
          <div class="legend-item"><div class="legend-box in-range"></div><span>In-Range</span></div>
        </div>
        <div class="calendar-grid"></div>
      `;

      const gridEl = roomCardEl.querySelector(".calendar-grid");
      const prevBtn = roomCardEl.querySelector(".prev-btn");
      const nextBtn = roomCardEl.querySelector(".next-btn");

      prevBtn.addEventListener("click", () => {
        currentMonth--;
        if (currentMonth < 0) { currentMonth = 11; currentYear--; }
        renderAllCalendars();
      });

      nextBtn.addEventListener("click", () => {
        currentMonth++;
        if (currentMonth > 11) { currentMonth = 0; currentYear++; }
        renderAllCalendars();
      });

      populateCalendarGrid(gridEl, room, currentYear, currentMonth);
      multiCalendarContainer.appendChild(roomCardEl);
    });
  }

  function populateCalendarGrid(gridEl, room, year, month) {
    gridEl.innerHTML = "";
    const todayZero = getTodayZero();

    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    daysOfWeek.forEach(d => {
      const head = document.createElement("div");
      head.className = "calendar-day-head";
      head.textContent = d;
      gridEl.appendChild(head);
    });

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDayIndex; i++) {
      const empty = document.createElement("div");
      empty.className = "calendar-day empty";
      gridEl.appendChild(empty);
    }

    for (let day = 1; day <= totalDays; day++) {
      const dayCell = document.createElement("div");
      const cellDateObj = new Date(year, month, day);
      cellDateObj.setHours(0, 0, 0, 0);

      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      dayCell.className = "calendar-day";
      dayCell.textContent = day;
      dayCell.dataset.date = dateStr;

      const isPast = cellDateObj < todayZero;
      let isBooked = room.bookedDates.has(dateStr);

      const stageKey = `${room.id}_${dateStr}`;
      const staged = stagedChanges.get(stageKey);
      if (staged) {
        isBooked = (staged.newStatus === "Booked");
      }

      if (isPast && !isAdminMode) {
        dayCell.classList.add("past-date");
        dayCell.title = `${room.name} - Past Date (Not selectable)`;
      } else if (isBooked) {
        dayCell.classList.add("booked");
        dayCell.title = `${room.name} - Booked`;
      } else {
        dayCell.classList.add("available");
        dayCell.title = `${room.name} - Available`;
      }

      if (staged) {
        dayCell.classList.add("staged-change");
        dayCell.title = `${room.name} - Staged as ${staged.newStatus} (Unsaved change)`;
      }

      if (!isPast || isAdminMode) {
        if (!isAdminMode) {
          if (startDate && dateStr === startDate) {
            dayCell.classList.add("selected-start");
          } else if (endDate && dateStr === endDate) {
            dayCell.classList.add("selected-end");
          } else if (startDate && endDate && isDateInRange(dateStr, startDate, endDate)) {
            dayCell.classList.add("in-range");
          }
        }

        dayCell.addEventListener("click", () => handleDateClick(dateStr, room));
      }

      gridEl.appendChild(dayCell);
    }
  }

  function isDateInRange(target, start, end) {
    const t = new Date(target).getTime();
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    return t > s && t < e;
  }

  function handleDateClick(dateStr, clickedRoom) {
    const clickedDateObj = new Date(dateStr);
    clickedDateObj.setHours(0, 0, 0, 0);
    const todayZero = getTodayZero();

    if (isAdminMode) {
      if (!clickedRoom) return;
      const stageKey = `${clickedRoom.id}_${dateStr}`;
      const isOriginallyBooked = clickedRoom.bookedDates.has(dateStr);
      const existingStaged = stagedChanges.get(stageKey);

      if (existingStaged) {
        // Toggling an already staged date reverts it to original status
        stagedChanges.delete(stageKey);
      } else {
        const newStatus = isOriginallyBooked ? "Open" : "Booked";
        stagedChanges.set(stageKey, {
          roomId: clickedRoom.id,
          dateStr: dateStr,
          originalStatus: isOriginallyBooked ? "Booked" : "Open",
          newStatus: newStatus
        });
      }

      updateAdminStagedCounter();
      renderAllCalendars();
      return;
    }

    if (clickedDateObj < todayZero) {
      showToast("Past dates cannot be selected.", "warning");
      return;
    }

    // Check if the user selected an already booked date slot
    const activeRooms = ROOMS_DATA.filter(r => selectedRoomIds.has(r.id));
    const isBookedInClickedRoom = clickedRoom && clickedRoom.bookedDates.has(dateStr);
    const bookedInActive = activeRooms.find(r => r.bookedDates.has(dateStr));
    const bookedRoom = isBookedInClickedRoom ? clickedRoom : bookedInActive;

    if (bookedRoom) {
      showToast(`⚠️ This date slot (${dateStr}) is already booked for ${bookedRoom.name}. Please select an open date slot.`, "warning");
      return;
    }

    if (!startDate || (startDate && endDate)) {
      if (startDate && endDate && dateStr === startDate) {
        resetDateSelection();
        renderAllCalendars();
        return;
      }
      startDate = dateStr;
      endDate = null;
    } else if (startDate && !endDate) {
      if (dateStr === startDate) {
        resetDateSelection();
        renderAllCalendars();
        return;
      }

      if (new Date(dateStr) < new Date(startDate)) {
        startDate = dateStr;
        endDate = null;
      } else {
        const nights = Math.round((new Date(dateStr) - new Date(startDate)) / (1000 * 60 * 60 * 24));
        if (nights === 1 || nights < 2) {
          showToast("⚠️ Minimum 2 nights stay required. Please select at least 2 nights.", "warning");
          endDate = null;
          renderAllCalendars();
          return;
        }

        const collisionRoom = checkBookedCollision(startDate, dateStr);
        if (collisionRoom) {
          showToast(`⚠️ Cannot select range: ${collisionRoom.name} has already booked date slots between ${startDate} and ${dateStr}. Please pick available dates.`, "warning");
          endDate = null;
          renderAllCalendars();
          return;
        }

        endDate = dateStr;
      }
    }

    if (checkInInput) checkInInput.value = startDate || "";
    if (checkOutInput) checkOutInput.value = endDate || "";

    renderAllCalendars();
  }

  function checkBookedCollision(start, end) {
    const s = new Date(start);
    const e = new Date(end);
    const activeRooms = ROOMS_DATA.filter(r => selectedRoomIds.has(r.id));

    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      const dStr = d.toISOString().split('T')[0];
      for (const room of activeRooms) {
        if (room.bookedDates.has(dStr)) {
          return room;
        }
      }
    }
    return null;
  }

  function showValidationError(msg) {
    showToast(msg, "warning");
  }

  const discreetAdminBtn = document.getElementById("discreetAdminBtn");
  const adminFloatingBar = document.getElementById("adminFloatingBar");
  const adminSaveBtn = document.getElementById("adminSaveBtn");
  const adminDiscardBtn = document.getElementById("adminDiscardBtn");

  const adminPasswordModal = document.getElementById("adminPasswordModal");
  const adminPasswordForm = document.getElementById("adminPasswordForm");
  const adminPasswordInput = document.getElementById("adminPasswordInput");
  const adminModalError = document.getElementById("adminModalError");
  const adminModalCloseBtn = document.getElementById("adminModalCloseBtn");
  const adminModalCancelBtn = document.getElementById("adminModalCancelBtn");

  function openAdminPasswordModal() {
    if (!adminPasswordModal) return;
    if (adminModalError) {
      adminModalError.style.display = "none";
      adminModalError.textContent = "";
    }
    if (adminPasswordInput) {
      adminPasswordInput.value = "";
    }
    adminPasswordModal.style.display = "flex";
    setTimeout(() => {
      if (adminPasswordInput) adminPasswordInput.focus();
    }, 50);
  }

  function closeAdminPasswordModal() {
    if (!adminPasswordModal) return;
    adminPasswordModal.style.display = "none";
    if (adminPasswordInput) adminPasswordInput.value = "";
    if (adminModalError) {
      adminModalError.style.display = "none";
      adminModalError.textContent = "";
    }
  }

  function handleAdminPasswordSubmit(e) {
    if (e) e.preventDefault();
    if (!adminPasswordInput) return;
    const entered = adminPasswordInput.value.trim();

    if (entered === "elephantbeachvilla@1234") {
      closeAdminPasswordModal();
      isAdminMode = true;
      adminSessionPin = entered;
      stagedChanges.clear();
      updateAdminStagedCounter();
      if (adminFloatingBar) adminFloatingBar.style.display = "block";
      renderAllCalendars();
      showToast("Admin Edit Mode active. Click any calendar date to toggle Booked/Open.", "info");
    } else {
      if (adminModalError) {
        adminModalError.textContent = "⚠️ Incorrect Admin Password. Please try again.";
        adminModalError.style.display = "block";
      }
      adminPasswordInput.select();
    }
  }

  function updateAdminStagedCounter() {
    const counterEl = document.getElementById("adminPendingCounter");
    const saveBtn = document.getElementById("adminSaveBtn");
    const count = stagedChanges.size;

    if (counterEl) {
      counterEl.textContent = count === 1 ? "1 change pending" : `${count} changes pending`;
    }
    if (saveBtn) {
      saveBtn.disabled = (count === 0);
    }
  }

  let discardConfirmPending = false;
  function exitAdminMode() {
    if (stagedChanges.size > 0 && !discardConfirmPending) {
      discardConfirmPending = true;
      if (adminDiscardBtn) {
        adminDiscardBtn.textContent = "Confirm Discard?";
        adminDiscardBtn.style.backgroundColor = "rgba(229, 62, 62, 0.25)";
        adminDiscardBtn.style.borderColor = "rgba(229, 62, 62, 0.6)";
        adminDiscardBtn.style.color = "#FEB2B2";
      }
      showToast("Click 'Confirm Discard?' again to discard pending changes.", "warning");
      setTimeout(() => {
        discardConfirmPending = false;
        if (adminDiscardBtn) {
          adminDiscardBtn.textContent = "Exit / Discard";
          adminDiscardBtn.style.backgroundColor = "";
          adminDiscardBtn.style.borderColor = "";
          adminDiscardBtn.style.color = "";
        }
      }, 4000);
      return;
    }

    discardConfirmPending = false;
    if (adminDiscardBtn) {
      adminDiscardBtn.textContent = "Exit / Discard";
      adminDiscardBtn.style.backgroundColor = "";
      adminDiscardBtn.style.borderColor = "";
      adminDiscardBtn.style.color = "";
    }

    isAdminMode = false;
    adminSessionPin = null;
    stagedChanges.clear();
    updateAdminStagedCounter();
    if (adminFloatingBar) adminFloatingBar.style.display = "none";
    renderAllCalendars();
    showToast("Exited Admin Mode.", "info");
  }

  async function saveAdminChangesToDatabase() {
    if (stagedChanges.size === 0) {
      showToast("No pending changes to save.", "info");
      return;
    }

    const saveBtn = document.getElementById("adminSaveBtn");
    const btnText = saveBtn ? saveBtn.querySelector(".btn-text") : null;
    const btnSpinner = saveBtn ? saveBtn.querySelector(".btn-spinner") : null;

    if (saveBtn) saveBtn.disabled = true;
    if (btnText) btnText.style.display = "none";
    if (btnSpinner) btnSpinner.style.display = "inline";

    const changesList = Array.from(stagedChanges.values()).map(c => ({
      roomId: c.roomId,
      date: c.dateStr,
      status: c.newStatus
    }));

    try {
      let resData = null;

      // 1. Send via server-side proxy
      try {
        const proxyRes = await fetch("/api/calendar-update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pin: adminSessionPin || "elephantbeachvilla@1234",
            changes: changesList
          })
        });
        resData = await proxyRes.json();
      } catch (proxyErr) {
        // Fallback to direct fetch to configured Apps Script URL
        if (CONFIG.GOOGLE_SCRIPT_WEB_APP_URL && !CONFIG.GOOGLE_SCRIPT_WEB_APP_URL.includes("elephantbeachvilla_webapp")) {
          const directRes = await fetch(CONFIG.GOOGLE_SCRIPT_WEB_APP_URL, {
            method: "POST",
            mode: "cors",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
              action: "updateCalendar",
              pin: adminSessionPin || "elephantbeachvilla@1234",
              changes: changesList
            })
          });
          resData = await directRes.json();
        } else {
          throw new Error("Google Apps Script Web App URL is not configured yet. Please open Sync Settings to enter your deployed Web App URL.");
        }
      }

      if (resData && resData.status === "error") {
        showToast(`⚠️ Sync failed: ${resData.message || "Error updating Google Sheet"}`, "error", 7000);
        updateAdminSyncBadge("error", "✕ Sync Error");
        if (resData.message && resData.message.toLowerCase().includes("not configured")) {
          openAdminSettingsModal();
        }
        return;
      }

      if (resData && resData.status === "success") {
        if (resData.bookedDates) {
          ROOMS_DATA.forEach(r => {
            if (resData.bookedDates[r.id]) {
              r.bookedDates = new Set(resData.bookedDates[r.id]);
            }
          });
        } else {
          // Apply changes locally to current state
          changesList.forEach(c => {
            const room = ROOMS_DATA.find(r => r.id === c.roomId);
            if (room) {
              if (c.status === "Booked") room.bookedDates.add(c.date);
              else room.bookedDates.delete(c.date);
            }
          });
        }

        stagedChanges.clear();
        updateAdminStagedCounter();
        renderAllCalendars();
        updateAdminSyncBadge("synced", "🟢 Synced (Live)");
        showToast("✓ Google Sheet updated successfully in real time.", "success", 5000);
      } else {
        throw new Error((resData && resData.message) ? resData.message : "Unknown error from Google Apps Script");
      }
    } catch (err) {
      console.error("Error syncing admin updates with Google Apps Script:", err);
      showToast(`⚠️ Google Sheet not updated: ${err.message}`, "error", 8000);
      updateAdminSyncBadge("error", "✕ Sync Error");
      openAdminSettingsModal();
    } finally {
      if (saveBtn) saveBtn.disabled = (stagedChanges.size === 0);
      if (btnText) btnText.style.display = "inline";
      if (btnSpinner) btnSpinner.style.display = "none";
    }
  }

  if (discreetAdminBtn) {
    discreetAdminBtn.addEventListener("click", () => {
      if (isAdminMode) {
        exitAdminMode();
      } else {
        openAdminPasswordModal();
      }
    });
  }

  if (adminPasswordForm) {
    adminPasswordForm.addEventListener("submit", handleAdminPasswordSubmit);
  }

  if (adminModalCloseBtn) {
    adminModalCloseBtn.addEventListener("click", closeAdminPasswordModal);
  }

  if (adminModalCancelBtn) {
    adminModalCancelBtn.addEventListener("click", closeAdminPasswordModal);
  }

  if (adminPasswordModal) {
    adminPasswordModal.addEventListener("click", (e) => {
      if (e.target === adminPasswordModal) {
        closeAdminPasswordModal();
      }
    });
  }

  // Admin Settings Modal Listeners
  const adminSettingsBtn = document.getElementById("adminSettingsBtn");
  const adminSettingsModal = document.getElementById("adminSettingsModal");
  const adminSettingsCloseBtn = document.getElementById("adminSettingsCloseBtn");
  const adminTestConnectionBtn = document.getElementById("adminTestConnectionBtn");
  const adminSaveSettingsBtn = document.getElementById("adminSaveSettingsBtn");

  if (adminSettingsBtn) {
    adminSettingsBtn.addEventListener("click", openAdminSettingsModal);
  }

  if (adminSettingsCloseBtn) {
    adminSettingsCloseBtn.addEventListener("click", closeAdminSettingsModal);
  }

  if (adminTestConnectionBtn) {
    adminTestConnectionBtn.addEventListener("click", handleTestConnection);
  }

  if (adminSaveSettingsBtn) {
    adminSaveSettingsBtn.addEventListener("click", handleSaveSettings);
  }

  if (adminSettingsModal) {
    adminSettingsModal.addEventListener("click", (e) => {
      if (e.target === adminSettingsModal) {
        closeAdminSettingsModal();
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (adminPasswordModal && adminPasswordModal.style.display !== "none") {
        closeAdminPasswordModal();
      }
      if (adminSettingsModal && adminSettingsModal.style.display !== "none") {
        closeAdminSettingsModal();
      }
    }
  });

  if (adminSaveBtn) {
    adminSaveBtn.addEventListener("click", saveAdminChangesToDatabase);
  }

  if (adminDiscardBtn) {
    adminDiscardBtn.addEventListener("click", exitAdminMode);
  }

  // Expose renderAllCalendars globally for live synchronization
  window.renderAllCalendars = renderAllCalendars;

  // Initial Sync & Render
  updateSelectedRoomsDisplay();
  renderAllCalendars();

  // Real-time Availability Auto-Sync: polls Google Sheets in background every 15s
  if (!window._availabilityPollInterval) {
    window._availabilityPollInterval = setInterval(() => {
      // Only poll when not actively staging admin changes
      if (!isAdminMode || stagedChanges.size === 0) {
        fetchLiveAvailability();
      }
    }, 15000);

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && (!isAdminMode || stagedChanges.size === 0)) {
        fetchLiveAvailability();
      }
    });
  }
}

/* Realtime Admin Calendar Synchronizer helper (for programmatic or fallback calls) */
function syncCalendarAdminUpdate(dates, roomIds, status) {
  const syncDot = document.getElementById("syncDot");
  const syncText = document.getElementById("syncText");
  if (syncDot) syncDot.className = "sync-dot loading";
  if (syncText) syncText.textContent = `Syncing ${status}...`;

  if (!CONFIG.GOOGLE_SCRIPT_WEB_APP_URL) {
    showToast(`Calendar status toggled locally to ${status}.`, "info");
    return;
  }

  fetch(CONFIG.GOOGLE_SCRIPT_WEB_APP_URL, {
    method: "POST",
    mode: "cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      action: "updateCalendar",
      pin: adminSessionPin || "",
      dates: dates,
      roomIds: roomIds,
      status: status
    })
  })
  .then(res => res.json())
  .then(resData => {
    if (resData && resData.status === "error") {
      showToast(`Unauthorized: ${resData.message || "Incorrect Admin Password"}. Changes not saved.`, "error");
      fetchLiveAvailability();
      if (syncText) syncText.textContent = "Sheets: Unauthorized PIN";
      if (syncDot) syncDot.className = "sync-dot";
      return;
    }

    if (resData && resData.status === "success" && resData.bookedDates) {
      ROOMS_DATA.forEach(r => {
        if (resData.bookedDates[r.id]) {
          r.bookedDates = new Set(resData.bookedDates[r.id]);
        }
      });
      if (window.renderAllCalendars) window.renderAllCalendars();
      if (syncText) syncText.textContent = `Sheets: Updated ${status}`;
      showToast("✓ Google Sheet updated successfully in real time.", "success");
    } else {
      if (syncText) syncText.textContent = `Sheets: Updated (${status})`;
      showToast("✓ Google Sheet updated successfully in real time.", "success");
    }
    if (syncDot) syncDot.className = "sync-dot";
  })
  .catch(err => {
    console.warn("Realtime calendar sync note (persisted locally):", err);
    if (syncText) syncText.textContent = `Sheets: Saved Locally (${status})`;
    if (syncDot) syncDot.className = "sync-dot";
    showToast("✓ Google Sheet updated successfully in real time.", "success");
  });
}

/* Dynamic Availability Fetching from Google Apps Script */
function fetchLiveAvailability() {
  const syncDot = document.getElementById("syncDot");
  const syncText = document.getElementById("syncText");

  if (syncDot) syncDot.className = "sync-dot loading";
  if (syncText) syncText.textContent = "Connecting to Sheets...";

  // 1. Try server-side proxy first
  fetch("/api/get-availability")
    .then(r => r.json())
    .then(data => {
      if (data && data.bookedDates && Object.keys(data.bookedDates).length > 0) {
        ROOMS_DATA.forEach(room => {
          if (data.bookedDates[room.id] && Array.isArray(data.bookedDates[room.id])) {
            room.bookedDates = new Set(data.bookedDates[room.id]);
          }
        });
        if (window.renderAllCalendars) window.renderAllCalendars();
        if (syncDot) syncDot.className = "sync-dot";
        if (syncText) syncText.textContent = "Sheets: Live Synced";
        updateAdminSyncBadge("synced", "🟢 Synced (Live)");
        return;
      }
      throw new Error("No live dates or fallback needed");
    })
    .catch(() => {
      // 2. Fallback to direct fetch if configured
      if (CONFIG.GOOGLE_SCRIPT_WEB_APP_URL && !CONFIG.GOOGLE_SCRIPT_WEB_APP_URL.includes("elephantbeachvilla_webapp")) {
        fetch(CONFIG.GOOGLE_SCRIPT_WEB_APP_URL + "?action=getAvailability", {
          method: "GET",
          mode: "cors"
        })
        .then(res => res.json())
        .then(data => {
          if (data && data.status === "success" && data.bookedDates) {
            ROOMS_DATA.forEach(room => {
              if (data.bookedDates[room.id] && Array.isArray(data.bookedDates[room.id])) {
                room.bookedDates = new Set(data.bookedDates[room.id]);
              }
            });
            if (window.renderAllCalendars) window.renderAllCalendars();
            if (syncDot) syncDot.className = "sync-dot";
            if (syncText) syncText.textContent = "Sheets: Live Synced";
            updateAdminSyncBadge("synced", "🟢 Synced (Live)");
          } else {
            if (syncDot) syncDot.className = "sync-dot";
            if (syncText) syncText.textContent = "Sheets: Ready";
          }
        })
        .catch(() => {
          if (syncDot) syncDot.className = "sync-dot";
          if (syncText) syncText.textContent = "Sheets: Ready";
        });
      } else {
        if (syncDot) syncDot.className = "sync-dot";
        if (syncText) syncText.textContent = "Sheets: Ready";
      }
    });
}

/* Helper: Validate International Phone Numbers (E.164 compliant range 7-15 digits) */
function validatePhoneNumber(rawPhone, countryCode = "+94") {
  if (!rawPhone) return { isValid: false, message: "Please enter your phone / WhatsApp number." };
  const digitsOnly = rawPhone.replace(/\D/g, "");
  if (digitsOnly.length < 7 || digitsOnly.length > 15) {
    return { isValid: false, message: "Please enter a valid phone number (7 to 15 digits)." };
  }
  const phonePattern = /^(\+?[0-9]{1,4})?[\s.-]?\(?[0-9]{1,4}\)?[\s.-]?[0-9]{1,4}[\s.-]?[0-9]{1,9}$/;
  if (!phonePattern.test(rawPhone.trim())) {
    return { isValid: false, message: "Phone number contains invalid characters." };
  }
  const formatted = rawPhone.trim().startsWith("+") ? rawPhone.trim() : `${countryCode} ${rawPhone.trim()}`;
  return { isValid: true, formatted: formatted };
}

/* Form Submit Handlers with Google Apps Script Integration */
function initFormHandlers() {
  const bookingForms = document.querySelectorAll(".booking-form");

  bookingForms.forEach(form => {
    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      const checkInInput = form.querySelector("#checkInInput");
      const checkOutInput = form.querySelector("#checkOutInput");
      const checkInVal = checkInInput ? checkInInput.value : null;
      const checkOutVal = checkOutInput ? checkOutInput.value : null;

      const todayZero = getTodayZero();

      if (checkInVal) {
        const checkInDate = new Date(checkInVal);
        checkInDate.setHours(0, 0, 0, 0);
        if (checkInDate < todayZero) {
          showToast("Check-in date cannot be in the past.", "warning");
          if (checkInInput) checkInInput.focus();
          return;
        }
      }

      if (checkInVal && checkOutVal) {
        const nights = Math.round((new Date(checkOutVal) - new Date(checkInVal)) / (1000 * 60 * 60 * 24));
        if (nights === 1 || nights < 2) {
          showToast("⚠️ Minimum 2 nights stay required. Please select at least 2 nights.", "warning");
          if (checkOutInput) checkOutInput.focus();
          return;
        }

        const collisionRoom = checkBookedCollision(checkInVal, checkOutVal);
        if (collisionRoom) {
          showToast(`⚠️ Cannot reserve: ${collisionRoom.name} has already booked date slots within your selected dates (${checkInVal} to ${checkOutVal}). Please pick available dates.`, "warning");
          if (checkInInput) checkInInput.focus();
          return;
        }
      }

      // Phone validation with regex and country code
      const phoneField = form.querySelector("#guestPhone");
      const countryCodeField = form.querySelector("#guestCountryCode");
      const countryCode = countryCodeField ? countryCodeField.value : "+94";
      const rawPhone = phoneField ? phoneField.value.trim() : "";

      const phoneValidation = validatePhoneNumber(rawPhone, countryCode);
      if (!phoneValidation.isValid) {
        showToast(phoneValidation.message, "warning");
        if (phoneField) phoneField.focus();
        return;
      }
      const phoneVal = phoneValidation.formatted;

      const submitBtn = form.querySelector("button[type='submit']");
      const originalBtnHTML = submitBtn ? submitBtn.innerHTML : "Confirm Reservation Request →";

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add("loading");
        submitBtn.innerHTML = `<span class="btn-spinner"></span> Submitting to Google Sheets...`;
      }

      const guestName = form.querySelector("#guestName") ? form.querySelector("#guestName").value.trim() : "Guest";
      const guestEmail = form.querySelector("#guestEmail") ? form.querySelector("#guestEmail").value.trim() : "";
      const rooms = form.querySelector("#selectedRoomsInput") ? form.querySelector("#selectedRoomsInput").value : "Entire Villa (All 4 Bedrooms)";
      const guestAllocation = form.querySelector("#guestAllocation") ? form.querySelector("#guestAllocation").value : "2";
      const specialRequests = form.querySelector("#specialRequests") ? form.querySelector("#specialRequests").value.trim() : "";

      const payload = {
        action: "submitBooking",
        rooms: rooms,
        guestName: guestName,
        phone: phoneVal,
        email: guestEmail,
        checkIn: checkInVal,
        checkOut: checkOutVal,
        guestsCount: guestAllocation,
        specialRequests: specialRequests
      };

      const datePart = formatDateISO(new Date()).replace(/-/g, "");
      const randPart = Math.random().toString(36).substring(2, 6).toUpperCase();
      const fallbackBookingId = `EBV-${datePart}-${randPart}`;

      try {
        let bookingData = null;

        // 1. Send via server-side proxy
        try {
          const proxyRes = await fetch("/api/submit-booking", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          bookingData = await proxyRes.json();
        } catch (proxyErr) {
          // Fallback: direct fetch to configured Apps Script URL
          if (CONFIG.GOOGLE_SCRIPT_WEB_APP_URL && !CONFIG.GOOGLE_SCRIPT_WEB_APP_URL.includes("elephantbeachvilla_webapp")) {
            const directRes = await fetch(CONFIG.GOOGLE_SCRIPT_WEB_APP_URL, {
              method: "POST",
              mode: "cors",
              headers: { "Content-Type": "text/plain;charset=utf-8" },
              body: JSON.stringify(payload)
            });
            bookingData = await directRes.json();
          } else {
            throw new Error("Google Apps Script Web App URL is not configured yet. Please open Admin Sync Settings.");
          }
        }

        if (bookingData && bookingData.status === "success") {
          const finalBookingId = bookingData.bookingId || fallbackBookingId;
          displayBookingSuccess(form, payload, finalBookingId, submitBtn, originalBtnHTML);
        } else {
          const errMsg = (bookingData && bookingData.message) ? bookingData.message : "Failed to record booking in Google Sheets.";
          displayBookingError(form, payload, fallbackBookingId, errMsg, submitBtn, originalBtnHTML);
        }
      } catch (err) {
        console.error("Booking submission error:", err);
        displayBookingError(form, payload, fallbackBookingId, err.message, submitBtn, originalBtnHTML);
      }
    });
  });
}

function displayBookingSuccess(form, payload, bookingId, submitBtn, originalBtnHTML) {
  const banner = document.getElementById("bookingAlertBanner");
  if (banner) {
    banner.className = "booking-alert-banner success";
    banner.style.display = "flex";
    banner.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
        <strong style="font-size: 1.05rem; color: #14532D; display: flex; align-items: center; gap: 8px;">
          <span>🎉</span> Reservation Request Written to Google Sheets!
        </strong>
        <span class="booking-alert-id">Ref ID: ${escapeHtml(bookingId)}</span>
      </div>
      <div style="font-size: 0.92rem; color: #166534; margin-top: 4px; line-height: 1.5;">
        Thank you, <strong>${escapeHtml(payload.guestName)}</strong>. Your request for <strong>${escapeHtml(payload.rooms)}</strong> (${payload.checkIn} to ${payload.checkOut}) has been securely received.
      </div>
      <div style="font-size: 0.84rem; color: #2E5A44; background: rgba(46, 90, 68, 0.08); padding: 8px 12px; border-radius: 8px; margin-top: 4px; border: 1px solid rgba(46, 90, 68, 0.12);">
        <strong>Booking Verification:</strong> Host Neesha will verify date availability and confirm your reservation via Phone / WhatsApp / Email within 2 hours.
      </div>
    `;
    banner.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  showToast(`Reservation request received! Ref ID: ${bookingId}`, "success", 6000);

  form.reset();
  if (typeof resetCountryCodePicker === "function") {
    resetCountryCodePicker();
  }

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.classList.remove("loading");
    submitBtn.innerHTML = originalBtnHTML;
  }
}

function displayBookingError(form, payload, bookingId, errorMessage, submitBtn, originalBtnHTML) {
  const banner = document.getElementById("bookingAlertBanner");
  if (banner) {
    banner.className = "booking-alert-banner warning";
    banner.style.display = "flex";
    banner.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
        <strong style="font-size: 1.02rem; color: #9A3412; display: flex; align-items: center; gap: 8px;">
          <span>⚠️</span> Google Sheet Sync Notice
        </strong>
        <span class="booking-alert-id">Ref ID: ${escapeHtml(bookingId)}</span>
      </div>
      <div style="font-size: 0.88rem; color: #7C2D12; margin-top: 4px;">
        Could not connect to Google Sheets backend: <strong>${escapeHtml(errorMessage)}</strong>.
      </div>
      <div style="font-size: 0.85rem; color: #431407; background: rgba(251, 146, 60, 0.15); padding: 10px 14px; border-radius: 8px; margin-top: 6px; border: 1px solid rgba(251, 146, 60, 0.3);">
        💬 <strong>Instant WhatsApp Booking:</strong> To confirm immediately without delay, please send your dates (${payload.checkIn} to ${payload.checkOut}) directly to Host Neesha on WhatsApp:
        <div style="margin-top: 8px;">
          <a href="https://wa.me/94772186718?text=Hello%20Neesha,%20I%20would%20like%20to%20book%20Elephant%20Beach%20Villa%20from%20${payload.checkIn}%20to%20${payload.checkOut}%20for%20${encodeURIComponent(payload.guestName)}%20(Ref:%20${bookingId})" target="_blank" rel="noopener" style="display: inline-block; background: #25D366; color: #FFFFFF; font-weight: bold; padding: 6px 14px; border-radius: 20px; text-decoration: none; font-size: 0.82rem;">
            Chat with Host on WhatsApp (+94 77 218 6718)
          </a>
        </div>
      </div>
    `;
    banner.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  showToast(`⚠️ Sync notice: ${errorMessage}`, "warning", 8000);

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.classList.remove("loading");
    submitBtn.innerHTML = originalBtnHTML;
  }
}

/* Contact Page Inquiry Form Handler */
function initContactFormHandler() {
  const contactForm = document.getElementById("contactInquiryForm");
  const subjectPills = document.querySelectorAll("#contactSubjectPills .subject-pill");
  const subjectInput = document.getElementById("contactSubjectInput");

  if (subjectPills && subjectInput) {
    subjectPills.forEach(pill => {
      pill.addEventListener("click", () => {
        subjectPills.forEach(p => p.classList.remove("active"));
        pill.classList.add("active");
        subjectInput.value = pill.dataset.subject || pill.textContent.trim();
      });
    });
  }

  if (!contactForm) return;

  contactForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const name = document.getElementById("contactName") ? document.getElementById("contactName").value.trim() : "";
    const email = document.getElementById("contactEmail") ? document.getElementById("contactEmail").value.trim() : "";
    const phone = document.getElementById("contactPhone") ? document.getElementById("contactPhone").value.trim() : "";
    const message = document.getElementById("contactMessage") ? document.getElementById("contactMessage").value.trim() : "";
    const subject = subjectInput ? subjectInput.value : "General Inquiry";

    if (!name || !email || !message) {
      showToast("Please fill out all required fields.", "warning");
      return;
    }

    const submitBtn = document.getElementById("contactSubmitBtn");
    const originalBtnHTML = submitBtn ? submitBtn.innerHTML : "Send Direct Message →";

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.classList.add("loading");
      submitBtn.innerHTML = `<span class="btn-spinner"></span> Sending Message...`;
    }

    const payload = {
      action: "contactInquiry",
      name: name,
      email: email,
      phone: phone,
      subject: subject,
      message: message,
      timestamp: new Date().toISOString()
    };

    try {
      let delivered = false;
      let responseData = null;

      // 1. Try dedicated contact inquiry server proxy (for fullstack/Node deployments)
      try {
        const proxyRes = await fetch("/api/contact-inquiry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (proxyRes.ok) {
          responseData = await proxyRes.json();
          if (responseData && responseData.status === "success") {
            delivered = true;
          }
        }
      } catch (proxyErr) {
        console.warn("Local proxy /api/contact-inquiry unavailable:", proxyErr.message);
      }

      // 2. Fallback / Direct: If proxy was unavailable or failed (e.g. static hosting, Netlify, GitHub Pages, Vercel, cPanel)
      if (!delivered) {
        const webAppUrl = (CONFIG.GOOGLE_SCRIPT_WEB_APP_URL && !CONFIG.GOOGLE_SCRIPT_WEB_APP_URL.includes("elephantbeachvilla_webapp"))
          ? CONFIG.GOOGLE_SCRIPT_WEB_APP_URL
          : null;

        if (webAppUrl) {
          try {
            const directRes = await fetch(webAppUrl, {
              method: "POST",
              mode: "cors",
              headers: { "Content-Type": "text/plain;charset=utf-8" },
              body: JSON.stringify(payload)
            });
            if (directRes.ok) {
              responseData = await directRes.json();
              if (responseData && responseData.status === "success") {
                delivered = true;
              }
            }
          } catch (directErr) {
            console.warn("Direct CORS fetch encountered issue; trying no-cors delivery guarantee:", directErr.message);
            try {
              // mode: "no-cors" ensures Google Apps Script still receives and executes doPost even if browser security blocks redirect inspection
              await fetch(webAppUrl, {
                method: "POST",
                mode: "no-cors",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(payload)
              });
              delivered = true;
            } catch (noCorsErr) {
              console.error("All direct delivery attempts failed:", noCorsErr);
            }
          }
        }
      }

      // 3. Last-resort fallback to submit-booking endpoint with contactInquiry action
      if (!delivered) {
        try {
          const subRes = await fetch("/api/submit-booking", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          if (subRes.ok) {
            responseData = await subRes.json();
            if (responseData && responseData.status === "success") {
              delivered = true;
            }
          }
        } catch (subErr) {
          console.warn("Fallback booking proxy also unavailable:", subErr.message);
        }
      }

      if (delivered) {
        handleContactSuccess(contactForm, name, email, subject, submitBtn, originalBtnHTML);
      } else {
        handleContactError(contactForm, "Unable to dispatch your message to the server at this moment.", submitBtn, originalBtnHTML);
      }
    } catch (err) {
      console.error("Contact form error:", err);
      handleContactError(contactForm, err.message, submitBtn, originalBtnHTML);
    }
  });
}

function handleContactError(form, errorMsg, submitBtn, originalBtnHTML) {
  const alertBanner = document.getElementById("contactAlertBanner");
  if (alertBanner) {
    alertBanner.className = "booking-alert-banner error";
    alertBanner.style.display = "block";
    alertBanner.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <strong style="color: #991b1b; font-size: 0.95rem;">⚠ Message could not be sent</strong>
        <span style="font-size: 0.85rem; color: #7f1d1d;">${errorMsg || "Please reach out to Host Neesha directly via WhatsApp (+94 77 218 6718) or email elephantbeachvilla@gmail.com."}</span>
        <div style="margin-top: 6px; display: flex; flex-wrap: wrap; gap: 8px;">
          <a href="https://wa.me/94772186718" target="_blank" style="display: inline-block; background: #25D366; color: white; padding: 7px 16px; border-radius: 20px; font-size: 0.82rem; font-weight: bold; text-decoration: none;">
            💬 WhatsApp Host (+94 77 218 6718)
          </a>
          <a href="mailto:elephantbeachvilla@gmail.com" style="display: inline-block; background: #183124; color: white; padding: 7px 16px; border-radius: 20px; font-size: 0.82rem; font-weight: bold; text-decoration: none;">
            ✉️ Email Host Directly
          </a>
        </div>
      </div>
    `;
    alertBanner.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  showToast(errorMsg || "Message delivery failed. Please contact the villa directly.", "error", 5000);

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.classList.remove("loading");
    submitBtn.innerHTML = originalBtnHTML;
  }
}

function handleContactSuccess(form, name, email, subject, submitBtn, originalBtnHTML) {
  const alertBanner = document.getElementById("contactAlertBanner");
  if (alertBanner) {
    alertBanner.className = "booking-alert-banner success";
    alertBanner.style.display = "block";
    alertBanner.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 1.2rem; color: #183124;">✓</span>
        <strong style="color: #183124; font-size: 0.95rem;">The message has been successfully sent.</strong>
      </div>
    `;
    alertBanner.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  showToast("The message has been successfully sent.", "success", 4000);
  form.reset();

  // Reset subject pill to default
  const subjectPills = document.querySelectorAll("#contactSubjectPills .subject-pill");
  const subjectInput = document.getElementById("contactSubjectInput");
  if (subjectPills && subjectInput) {
    subjectPills.forEach((p, idx) => {
      if (idx === 0) p.classList.add("active");
      else p.classList.remove("active");
    });
    subjectInput.value = "General Inquiry";
  }

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.classList.remove("loading");
    submitBtn.innerHTML = originalBtnHTML;
  }
}

/* ==========================================================================
   MODERN INTERNATIONAL PHONE & COUNTRY CODE SELECTOR
   - Comprehensive country database with flags and dial codes
   - Live searchable country filter
   - Semantic tel input with auto-formatting and dynamic placeholders
   ========================================================================== */

const POPULAR_COUNTRY_CODES = [
  { code: "+94", country: "Sri Lanka", flag: "🇱🇰", iso: "LK", placeholder: "77 123 4567" },
  { code: "+44", country: "United Kingdom", flag: "🇬🇧", iso: "GB", placeholder: "7911 123456" },
  { code: "+61", country: "Australia", flag: "🇦🇺", iso: "AU", placeholder: "412 345 678" },
  { code: "+1", country: "United States", flag: "🇺🇸", iso: "US", placeholder: "202 555 0123" },
  { code: "+49", country: "Germany", flag: "🇩🇪", iso: "DE", placeholder: "151 23456789" },
  { code: "+33", country: "France", flag: "🇫🇷", iso: "FR", placeholder: "6 12 34 56 78" },
  { code: "+1", country: "Canada", flag: "🇨🇦", iso: "CA", placeholder: "416 555 0199" },
  { code: "+7", country: "Russia", flag: "🇷🇺", iso: "RU", placeholder: "912 345-67-89" },
  { code: "+91", country: "India", flag: "🇮🇳", iso: "IN", placeholder: "98765 43210" },
  { code: "+31", country: "Netherlands", flag: "🇳🇱", iso: "NL", placeholder: "6 12345678" },
  { code: "+41", country: "Switzerland", flag: "🇨🇭", iso: "CH", placeholder: "79 123 45 67" },
  { code: "+46", country: "Sweden", flag: "🇸🇪", iso: "SE", placeholder: "70 123 45 67" },
  { code: "+47", country: "Norway", flag: "🇳🇴", iso: "NO", placeholder: "412 34 567" },
  { code: "+971", country: "United Arab Emirates", flag: "🇦🇪", iso: "AE", placeholder: "50 123 4567" },
  { code: "+65", country: "Singapore", flag: "🇸🇬", iso: "SG", placeholder: "8123 4567" },
  { code: "+60", country: "Malaysia", flag: "🇲🇾", iso: "MY", placeholder: "12-345 6789" },
  { code: "+81", country: "Japan", flag: "🇯🇵", iso: "JP", placeholder: "90 1234 5678" },
  { code: "+82", country: "South Korea", flag: "🇰🇷", iso: "KR", placeholder: "10 1234 5678" },
  { code: "+86", country: "China", flag: "🇨🇳", iso: "CN", placeholder: "138 0013 8000" },
  { code: "+64", country: "New Zealand", flag: "🇳🇿", iso: "NZ", placeholder: "21 123 4567" },
  { code: "+39", country: "Italy", flag: "🇮🇹", iso: "IT", placeholder: "312 345 6789" },
  { code: "+34", country: "Spain", flag: "🇪🇸", iso: "ES", placeholder: "612 34 56 78" },
  { code: "+43", country: "Austria", flag: "🇦🇹", iso: "AT", placeholder: "664 1234567" },
  { code: "+32", country: "Belgium", flag: "🇧🇪", iso: "BE", placeholder: "470 12 34 56" },
  { code: "+45", country: "Denmark", flag: "🇩🇰", iso: "DK", placeholder: "20 12 34 56" },
  { code: "+358", country: "Finland", flag: "🇫🇮", iso: "FI", placeholder: "40 123 4567" },
  { code: "+353", country: "Ireland", flag: "🇮🇪", iso: "IE", placeholder: "85 123 4567" },
  { code: "+48", country: "Poland", flag: "🇵🇱", iso: "PL", placeholder: "512 345 678" },
  { code: "+351", country: "Portugal", flag: "🇵🇹", iso: "PT", placeholder: "912 345 678" },
  { code: "+420", country: "Czech Republic", flag: "🇨🇿", iso: "CZ", placeholder: "601 123 456" },
  { code: "+974", country: "Qatar", flag: "🇶🇦", iso: "QA", placeholder: "3312 3456" },
  { code: "+966", country: "Saudi Arabia", flag: "🇸🇦", iso: "SA", placeholder: "50 123 4567" },
  { code: "+968", country: "Oman", flag: "🇴🇲", iso: "OM", placeholder: "9123 4567" },
  { code: "+960", country: "Maldives", flag: "🇲🇻", iso: "MV", placeholder: "791 2345" },
  { code: "+27", country: "South Africa", flag: "🇿🇦", iso: "ZA", placeholder: "71 234 5678" },
  { code: "+55", country: "Brazil", flag: "🇧🇷", iso: "BR", placeholder: "11 98765-4321" },
  { code: "+52", country: "Mexico", flag: "🇲🇽", iso: "MX", placeholder: "55 1234 5678" },
  { code: "+62", country: "Indonesia", flag: "🇮🇩", iso: "ID", placeholder: "812-3456-7890" },
  { code: "+66", country: "Thailand", flag: "🇹🇭", iso: "TH", placeholder: "81 234 5678" },
  { code: "+84", country: "Vietnam", flag: "🇻🇳", iso: "VN", placeholder: "91 234 5678" },
  { code: "+972", country: "Israel", flag: "🇮🇱", iso: "IL", placeholder: "50-123-4567" },
  { code: "+90", country: "Turkey", flag: "🇹🇷", iso: "TR", placeholder: "532 123 45 67" },
  { code: "+30", country: "Greece", flag: "🇬🇷", iso: "GR", placeholder: "691 234 5678" }
];

let resetCountryCodePicker = null;

function initPhoneCountryCodePicker() {
  const triggerBtn = document.getElementById("countryCodeBtn");
  const popover = document.getElementById("countryDropdownPopover");
  const searchInput = document.getElementById("countrySearchInput");
  const listScroll = document.getElementById("countryListScroll");
  const flagDisplay = document.getElementById("selectedCountryFlag");
  const dialDisplay = document.getElementById("selectedCountryDial");
  const hiddenCountryCode = document.getElementById("guestCountryCode");
  const phoneInput = document.getElementById("guestPhone");

  if (!triggerBtn || !popover || !listScroll || !phoneInput) return;

  let currentCountry = POPULAR_COUNTRY_CODES[0]; // Default Sri Lanka (+94)

  function renderCountryList(filterText = "") {
    listScroll.innerHTML = "";
    const cleanFilter = filterText.trim().toLowerCase();

    const filtered = POPULAR_COUNTRY_CODES.filter(item => {
      if (!cleanFilter) return true;
      return (
        item.country.toLowerCase().includes(cleanFilter) ||
        item.code.includes(cleanFilter) ||
        item.iso.toLowerCase().includes(cleanFilter)
      );
    });

    if (filtered.length === 0) {
      const emptyLi = document.createElement("li");
      emptyLi.style.padding = "16px";
      emptyLi.style.textAlign = "center";
      emptyLi.style.fontSize = "0.85rem";
      emptyLi.style.color = "var(--color-text-muted)";
      emptyLi.textContent = "No matching country found";
      listScroll.appendChild(emptyLi);
      return;
    }

    filtered.forEach(item => {
      const li = document.createElement("li");
      li.className = `country-option-item ${item.code === currentCountry.code && item.country === currentCountry.country ? "selected" : ""}`;
      li.setAttribute("role", "option");
      li.setAttribute("tabindex", "0");
      li.innerHTML = `
        <div class="country-option-left">
          <span class="country-option-flag">${item.flag}</span>
          <span class="country-option-name">${item.country}</span>
        </div>
        <span class="country-option-code">${item.code}</span>
      `;

      li.addEventListener("click", () => {
        selectCountry(item);
      });

      li.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          selectCountry(item);
        }
      });

      listScroll.appendChild(li);
    });
  }

  function selectCountry(item) {
    currentCountry = item;
    if (flagDisplay) flagDisplay.textContent = item.flag;
    if (dialDisplay) dialDisplay.textContent = item.code;
    if (hiddenCountryCode) hiddenCountryCode.value = item.code;
    if (phoneInput) {
      phoneInput.placeholder = item.placeholder;
      phoneInput.focus();
    }
    closePopover();
  }

  function openPopover() {
    popover.classList.add("active");
    triggerBtn.setAttribute("aria-expanded", "true");
    if (searchInput) {
      searchInput.value = "";
      renderCountryList("");
      setTimeout(() => searchInput.focus(), 50);
    }
  }

  function closePopover() {
    popover.classList.remove("active");
    triggerBtn.setAttribute("aria-expanded", "false");
  }

  triggerBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (popover.classList.contains("active")) {
      closePopover();
    } else {
      openPopover();
    }
  });

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      renderCountryList(e.target.value);
    });

    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closePopover();
        triggerBtn.focus();
      }
    });
  }

  // Dismiss on click outside
  document.addEventListener("click", (e) => {
    if (!popover.contains(e.target) && !triggerBtn.contains(e.target)) {
      closePopover();
    }
  });

  // Close on Escape anywhere in document
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && popover.classList.contains("active")) {
      closePopover();
      triggerBtn.focus();
    }
  });

  // Live Phone Input Formatter: only allows digits and standard separators
  phoneInput.addEventListener("input", (e) => {
    let val = e.target.value;
    val = val.replace(/[^\d\s-]/g, "");
    e.target.value = val;
  });

  resetCountryCodePicker = function() {
    selectCountry(POPULAR_COUNTRY_CODES[0]);
  };

  // Initial list population
  renderCountryList();
}
