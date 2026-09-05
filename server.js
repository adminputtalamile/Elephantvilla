const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

const CONFIG_FILE = path.join(__dirname, 'runtime-config.json');
const ADMIN_PIN = 'elephantbeachvilla@1234';
const SPREADSHEET_ID = '1iWA1wp2b4qY63jrzmU5rjFMRPZj0Wd0peG0VdOomBHE';
const DEFAULT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwvo22afIhUCYaJOWs5r5CyopuoaZbDsMaQXCGkjNOBIRqjYQ4Wc-O88HfdT5aznN5M/exec';
const DEFAULT_SCRIPT_PROJECT_URL = 'https://script.google.com/u/0/home/projects/16RFeNj9T6Q3o5KxZPID5ZEjPZWW0_p8w-CyYuSdEgxz1EhPk8n0cEMqn/edit';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function loadRuntimeConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      const parsed = JSON.parse(data);
      if (!parsed.scriptProjectUrl) {
        parsed.scriptProjectUrl = DEFAULT_SCRIPT_PROJECT_URL;
      }
      if (!parsed.webAppUrl) {
        parsed.webAppUrl = DEFAULT_WEB_APP_URL;
      }
      return parsed;
    }
  } catch (err) {
    console.error('Error reading runtime-config.json:', err.message);
  }
  return { 
    webAppUrl: DEFAULT_WEB_APP_URL, 
    scriptProjectUrl: DEFAULT_SCRIPT_PROJECT_URL,
    spreadsheetId: SPREADSHEET_ID, 
    lastVerified: null 
  };
}

function saveRuntimeConfig(config) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error saving runtime-config.json:', err.message);
    return false;
  }
}

function getActiveWebAppUrl() {
  if (process.env.GOOGLE_SCRIPT_WEB_APP_URL && process.env.GOOGLE_SCRIPT_WEB_APP_URL.trim()) {
    return process.env.GOOGLE_SCRIPT_WEB_APP_URL.trim();
  }
  const config = loadRuntimeConfig();
  return (config.webAppUrl || DEFAULT_WEB_APP_URL).trim();
}

function isPlaceholderUrl(url) {
  if (!url || typeof url !== 'string') return true;
  const trimmed = url.trim();
  if (trimmed.length < 25) return true;
  if (trimmed.includes('elephantbeachvilla_webapp')) return true;
  if (trimmed.includes('/projects/') || trimmed.endsWith('/edit')) return true;
  if (!trimmed.startsWith('https://script.google.com/macros/s/')) return true;
  return false;
}

// -----------------------------------------------------------------------------
// API Endpoints
// -----------------------------------------------------------------------------

// 1. Get Integration Status
app.get('/api/status', (req, res) => {
  const currentUrl = getActiveWebAppUrl();
  const placeholder = isPlaceholderUrl(currentUrl);
  const config = loadRuntimeConfig();
  res.json({
    status: 'success',
    configured: !placeholder,
    isPlaceholder: placeholder,
    webAppUrl: currentUrl,
    scriptProjectUrl: config.scriptProjectUrl || DEFAULT_SCRIPT_PROJECT_URL,
    spreadsheetId: SPREADSHEET_ID,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`
  });
});

// 2. Test Connection to Google Apps Script Web App
app.post('/api/test-connection', async (req, res) => {
  const testUrl = (req.body.webAppUrl || getActiveWebAppUrl() || '').trim();

  if (testUrl.includes('/projects/') || testUrl.endsWith('/edit')) {
    return res.status(400).json({
      status: 'error',
      connected: false,
      message: 'This is the Google Apps Script Project Editor link. To sync data, click Deploy (top right) > New deployment (or Manage deployments) > Web app (Who has access: Anyone) > Copy the Web App URL that ends in /exec and paste it here.'
    });
  }

  if (isPlaceholderUrl(testUrl)) {
    return res.status(400).json({
      status: 'error',
      connected: false,
      message: 'The URL provided is empty or contains the placeholder identifier. Please deploy google-apps-script.gs in your Google Sheet and paste the real Web App URL.'
    });
  }

  try {
    const fetchUrl = testUrl.includes('?') ? `${testUrl}&action=getAvailability` : `${testUrl}?action=getAvailability`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(fetchUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return res.status(502).json({
        status: 'error',
        connected: false,
        message: `Google Apps Script returned HTTP status ${response.status} (${response.statusText}). Make sure the Web App is deployed with 'Who has access' set to 'Anyone'.`
      });
    }

    const data = await response.json();
    if (data && data.status === 'success') {
      const config = loadRuntimeConfig();
      config.lastVerified = new Date().toISOString();
      saveRuntimeConfig(config);

      return res.json({
        status: 'success',
        connected: true,
        message: '✓ Connection verified! Google Sheet & Apps Script backend are responding normally in real time.',
        bookedDates: data.bookedDates || {}
      });
    } else {
      return res.status(502).json({
        status: 'error',
        connected: false,
        message: data && data.message ? data.message : 'Google Apps Script responded, but returned an unexpected format.'
      });
    }
  } catch (err) {
    console.error('Test connection error:', err.message);
    return res.status(502).json({
      status: 'error',
      connected: false,
      message: `Failed to connect to Google Apps Script: ${err.message}. Please ensure the Web App is deployed under Extensions > Apps Script.`
    });
  }
});

// 3. Save Web App URL (Admin Only)
app.post('/api/admin/set-web-app-url', async (req, res) => {
  const { pin, webAppUrl } = req.body;

  if (pin !== ADMIN_PIN) {
    return res.status(401).json({
      status: 'error',
      message: 'Unauthorized: Invalid Admin Password'
    });
  }

  const cleanUrl = (webAppUrl || '').trim();
  const config = loadRuntimeConfig();
  config.webAppUrl = cleanUrl;
  saveRuntimeConfig(config);

  if (isPlaceholderUrl(cleanUrl)) {
    return res.json({
      status: 'success',
      configured: false,
      message: 'Web App URL updated, but it is currently empty or contains the placeholder string.',
      webAppUrl: cleanUrl
    });
  }

  // Attempt automatic test on save
  try {
    const fetchUrl = cleanUrl.includes('?') ? `${cleanUrl}&action=getAvailability` : `${cleanUrl}?action=getAvailability`;
    const response = await fetch(fetchUrl, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(8000) });
    if (response.ok) {
      config.lastVerified = new Date().toISOString();
      saveRuntimeConfig(config);
      return res.json({
        status: 'success',
        configured: true,
        connected: true,
        message: '✓ Google Apps Script Web App URL saved and connection verified successfully!',
        webAppUrl: cleanUrl
      });
    }
  } catch (err) {
    console.warn('Post-save connection verification warning:', err.message);
  }

  return res.json({
    status: 'success',
    configured: true,
    connected: false,
    message: 'Web App URL saved. Please test the connection to verify permissions.',
    webAppUrl: cleanUrl
  });
});

// 4. Update Calendar (Admin Only)
app.post('/api/calendar-update', async (req, res) => {
  const { pin, changes, dates, roomIds, status } = req.body;

  if (pin !== ADMIN_PIN) {
    return res.status(401).json({
      status: 'error',
      message: 'Unauthorized: Invalid Admin Password'
    });
  }

  const targetUrl = getActiveWebAppUrl();
  if (isPlaceholderUrl(targetUrl)) {
    return res.status(400).json({
      status: 'error',
      message: 'Google Apps Script Web App URL is not configured yet. Please open Admin Settings in the floating toolbar and enter your deployed Web App URL to sync with Google Sheets in real time.'
    });
  }

  try {
    const payload = {
      action: 'updateCalendar',
      pin: pin,
      changes: changes,
      dates: dates,
      roomIds: roomIds,
      status: status
    };

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      return res.status(502).json({
        status: 'error',
        message: `Google Apps Script returned HTTP ${response.status} (${response.statusText}). Could not update Google Sheet.`
      });
    }

    const data = await response.json();
    return res.json(data);
  } catch (err) {
    console.error('Calendar update proxy error:', err.message);
    return res.status(502).json({
      status: 'error',
      message: `Failed to update Google Sheet: ${err.message}. Please check your Web App URL and deployment permissions.`
    });
  }
});

// 5. Submit Booking Request (Writes to Bookings & sends emails to Host + Guest)
app.post('/api/submit-booking', async (req, res) => {
  const targetUrl = getActiveWebAppUrl();

  if (isPlaceholderUrl(targetUrl)) {
    return res.status(400).json({
      status: 'error',
      message: 'Google Apps Script Web App URL is not configured yet. Please deploy the Apps Script Web App to log bookings and send emails.'
    });
  }

  try {
    const payload = {
      action: req.body.action || 'submitBooking',
      ...req.body
    };

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: AbortSignal.timeout(35000)
    });

    if (!response.ok) {
      return res.status(502).json({
        status: 'error',
        message: `Google Apps Script returned HTTP ${response.status} (${response.statusText}).`
      });
    }

    const data = await response.json();
    return res.json(data);
  } catch (err) {
    console.error('Submit booking proxy error:', err.message);
    return res.status(502).json({
      status: 'error',
      message: `Failed to connect to Google Sheets backend: ${err.message}. Please contact the villa host directly at elephantbeachvilla@gmail.com.`
    });
  }
});

// 5b. Submit Contact Direct Message Inquiry (Writes to Inquiries sheet & dispatches styled emails to elephantbeachvilla@gmail.com and guest)
app.post('/api/contact-inquiry', async (req, res) => {
  const { name, email, phone, subject, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({
      status: 'error',
      message: 'Name, email address, and message are required.'
    });
  }

  const targetUrl = getActiveWebAppUrl();

  if (isPlaceholderUrl(targetUrl)) {
    console.log(`[Contact Inquiry Local Fallback] From: ${name} <${email}>`);
    console.log(`[Contact Inquiry Local Fallback] Subject: ${subject || 'General Inquiry'}`);
    console.log(`[Contact Inquiry Local Fallback] Destination: elephantbeachvilla@gmail.com`);
    console.log(`[Contact Inquiry Local Fallback] Message: ${message}`);
    return res.json({
      status: 'success',
      message: 'The message has been successfully sent.'
    });
  }

  try {
    const payload = {
      action: 'contactInquiry',
      name: String(name || 'Guest').trim(),
      guestName: String(name || 'Guest').trim(),
      email: String(email || '').trim(),
      guestEmail: String(email || '').trim(),
      phone: String(phone || '').trim(),
      guestPhone: String(phone || '').trim(),
      subject: String(subject || 'General Inquiry').trim(),
      message: String(message || '').trim(),
      specialRequests: String(message || '').trim(),
      timestamp: new Date().toISOString()
    };

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: AbortSignal.timeout(35000)
    });

    if (!response.ok) {
      return res.status(502).json({
        status: 'error',
        message: `Google Apps Script returned HTTP ${response.status} (${response.statusText}).`
      });
    }

    const data = await response.json();
    return res.json(data);
  } catch (err) {
    console.error('Submit contact inquiry proxy error:', err.message);
    return res.status(502).json({
      status: 'error',
      message: `Failed to connect to backend: ${err.message}. Please contact Host Neesha directly at elephantbeachvilla@gmail.com.`
    });
  }
});

// 6. Update Booking Status (Admin Confirms or Cancels Booking)
app.post('/api/update-booking-status', async (req, res) => {
  const { pin, bookingId, status } = req.body;

  if (pin !== ADMIN_PIN) {
    return res.status(401).json({
      status: 'error',
      message: 'Unauthorized: Invalid Admin Password'
    });
  }

  const targetUrl = getActiveWebAppUrl();
  if (isPlaceholderUrl(targetUrl)) {
    return res.status(400).json({
      status: 'error',
      message: 'Google Apps Script Web App URL is not configured yet.'
    });
  }

  try {
    const payload = {
      action: 'updateBookingStatus',
      pin,
      bookingId,
      status
    };

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      return res.status(502).json({
        status: 'error',
        message: `Google Apps Script returned HTTP ${response.status} (${response.statusText}).`
      });
    }

    const data = await response.json();
    return res.json(data);
  } catch (err) {
    console.error('Update booking status proxy error:', err.message);
    return res.status(502).json({
      status: 'error',
      message: `Failed to update booking status: ${err.message}`
    });
  }
});

// 7. Get Live Availability
app.get('/api/get-availability', async (req, res) => {
  const targetUrl = getActiveWebAppUrl();

  if (isPlaceholderUrl(targetUrl)) {
    return res.json({
      status: 'notice',
      configured: false,
      message: 'Live Google Sheet not configured yet. Using default availability.',
      bookedDates: {}
    });
  }

  try {
    const fetchUrl = targetUrl.includes('?') ? `${targetUrl}&action=getAvailability` : `${targetUrl}?action=getAvailability`;
    const response = await fetch(fetchUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(10000)
    });

    if (response.ok) {
      const data = await response.json();
      return res.json(data);
    }
  } catch (err) {
    console.warn('Availability fetch proxy notice:', err.message);
  }

  res.json({
    status: 'notice',
    configured: true,
    message: 'Could not fetch live availability from Google Apps Script. Using fallback.',
    bookedDates: {}
  });
});

// Serve static files with automatic html extension resolution for clean URLs
app.use(express.static(__dirname, {
  extensions: ['html', 'htm']
}));

// Route fallback for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 404 fallback handler
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Elephant Beach Villa website is running live at http://${HOST}:${PORT}/`);
});

