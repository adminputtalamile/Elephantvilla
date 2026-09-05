/**
 * ============================================================================
 * ELEPHANT BEACH VILLA - GOOGLE APPS SCRIPT BACKEND
 * Komari, Arugam Bay Region, Sri Lanka
 * ============================================================================
 * Spreadsheet ID: 1iWA1wp2b4qY63jrzmU5rjFMRPZj0Wd0peG0VdOomBHE
 * Spreadsheet URL: https://docs.google.com/spreadsheets/d/1iWA1wp2b4qY63jrzmU5rjFMRPZj0Wd0peG0VdOomBHE/edit
 *
 * ARCHITECTURAL LOGIC:
 * 1. Booking Request Submission:
 *    - Guest submits reservation form -> Written to "Bookings" with Status = "Pending Verification".
 *    - "RoomAvailability" is NOT modified. The dates remain OPEN on public calendars.
 *    - Direct notification email sent to elephantbeachvilla@gmail.com with WhatsApp link.
 * 2. Date Booking Activation (Booked):
 *    - Admin clicks dates in website Admin Portal (authenticates with PIN "elephantbeachvilla@1234").
 *    - OR Admin edits the reservation's Status in "Bookings" sheet to "Confirmed" (handled via onEdit).
 * 3. Date Cancellation (Open):
 *    - Admin changes Status in "Bookings" to "Cancelled" -> Dates release back to "Open" in "RoomAvailability".
 *
 * HOW TO DEPLOY:
 * 1. Open your Google Spreadsheet:
 *    https://docs.google.com/spreadsheets/d/1iWA1wp2b4qY63jrzmU5rjFMRPZj0Wd0peG0VdOomBHE/edit
 * 2. In the top menu, go to Extensions > Apps Script.
 * 3. Replace all existing code in Code.gs with this entire file.
 * 4. Run `setupSpreadsheet()` from the Apps Script editor once to configure sheets,
 *    freeze headers, format columns, and configure dropdown validations.
 * 5. Click "Deploy" > "New deployment".
 * 6. Select "Web app" (click the gear icon next to "Select type").
 * 7. Set:
 *    - Description: Elephant Beach Villa Booking Engine
 *    - Execute as: "Me" (your Google account)
 *    - Who has access: "Anyone" (allows website clients to submit requests without login)
 * 8. Click "Deploy", review permissions, and copy the Web App URL.
 * 9. Paste the copied URL into script.js -> CONFIG.GOOGLE_SCRIPT_WEB_APP_URL.
 * ============================================================================
 */

// Configuration Constants
const SPREADSHEET_ID = "1iWA1wp2b4qY63jrzmU5rjFMRPZj0Wd0peG0VdOomBHE";
const ADMIN_PIN = "elephantbeachvilla@1234";
const HOST_EMAIL = "elephantbeachvilla@gmail.com";
const TIME_ZONE = "Asia/Colombo";

const ROOM_IDS = ["room1", "room2", "room3", "room4"];
const ROOM_COLUMNS = {
  room1: 2, // Column B in RoomAvailability
  room2: 3, // Column C in RoomAvailability
  room3: 4, // Column D in RoomAvailability
  room4: 5  // Column E in RoomAvailability
};

const STATUS_OPTIONS = ["Pending Verification", "Confirmed", "Cancelled"];

/**
 * ============================================================================
 * CENTRALIZED EMAIL NOTIFICATION TEMPLATES (SYNCHRONIZED WITH media-config.js)
 * ============================================================================
 * You can customize the subject, heading, body text, arrival instructions,
 * and WhatsApp contact details for automated emails sent to guests.
 * Placeholders available:
 *   {{bookingId}}       - Unique Reservation Reference ID (e.g. EBV-20260923-ABCD)
 *   {{guestName}}       - Name of the guest
 *   {{rooms}}           - Booked rooms (e.g. Entire Villa or specific room names)
 *   {{checkIn}}         - Check-in date (YYYY-MM-DD)
 *   {{checkOut}}        - Check-out date (YYYY-MM-DD)
 *   {{totalNights}}     - Total stay nights
 *   {{guestsCount}}     - Total guest count allocation
 *   {{phone}}           - Contact phone number
 *   {{specialRequests}} - Notes or dietary/surf requests
 * ============================================================================
 */
const EMAIL_TEMPLATES = {
  // 1. Confirmed Booking Template (Sent automatically when admin sets status to 'Confirmed')
  bookingConfirmed: {
    subject: "🌴 Booking Confirmed! [{{bookingId}}] - Elephant Beach Villa Komari",
    badgeText: "Status: Confirmed & Secured",
    heading: "Your Reservation is Confirmed, {{guestName}}!",
    subheading: "We are delighted to confirm your stay at Elephant Beach Villa. Your dates have been officially secured in our reservation calendar.",
    summaryTitle: "Confirmed Reservation Details",
    arrivalNotesTitle: "Check-In & Arrival Information",
    arrivalNotesText: "Check-in time is from 2:00 PM onwards. Caretaker Saman will welcome you at the villa gates. If you require private airport pickup from Colombo / Mattala, surf rental guidance, or safari tour arrangements, please message Host Neesha anytime.",
    whatsappButtonText: "💬 Chat with Host Neesha on WhatsApp (+94 77 218 6718)",
    whatsappUrl: "https://wa.me/94772186718",
    footerNotice: "© Elephant Beach Villa Komari · Direct Guest Reservation System"
  },

  // 2. Cancelled Booking Template (Sent automatically when admin sets status to 'Cancelled')
  bookingCancelled: {
    subject: "Reservation Update [{{bookingId}}] - Elephant Beach Villa Komari",
    badgeText: "Status: Reservation Cancelled",
    heading: "Reservation Cancelled (Ref: {{bookingId}})",
    subheading: "Dear {{guestName}}, your reservation request for Elephant Beach Villa has been cancelled, and the dates have been released back to our availability calendar.",
    summaryTitle: "Cancelled Reservation Summary",
    cancellationNotesTitle: "Cancellation Notice",
    cancellationNotesText: "If this cancellation was made in error or your travel plans change in the future, please do not hesitate to contact Host Neesha directly. We look forward to welcoming you to Komari on another occasion.",
    whatsappButtonText: "💬 Contact Host Neesha on WhatsApp (+94 77 218 6718)",
    whatsappUrl: "https://wa.me/94772186718",
    footerNotice: "© Elephant Beach Villa Komari · Direct Guest Reservation System"
  },

  // 3. Request Received Template (Sent immediately upon guest submission)
  bookingReceived: {
    subject: "🌴 Reservation Request Received [{{bookingId}}] - Elephant Beach Villa Komari",
    badgeText: "Status: Pending Host Verification",
    heading: "Thank You, {{guestName}}!",
    subheading: "We have received your reservation request for Elephant Beach Villa. Host Neesha will verify date availability and confirm your reservation via WhatsApp or email shortly.",
    summaryTitle: "Reservation Request Summary",
    whatsappButtonText: "💬 Chat with Host Neesha on WhatsApp (+94 77 218 6718)",
    whatsappUrl: "https://wa.me/94772186718",
    footerNotice: "© Elephant Beach Villa Komari · Direct Guest Reservation System"
  },

  // 4. Host Notification: Direct Message Inquiry Received (Sent to elephantbeachvilla@gmail.com)
  inquiryHostNotification: {
    subject: "💬 Direct Message from {{guestName}} [{{subject}}] - Elephant Beach Villa",
    badgeText: "Direct Message · Host Attention",
    heading: "New Direct Message Received",
    subheading: "A guest has sent a direct message from the 'Send Us A Direct Message' section on the website.",
    summaryTitle: "Sender & Inquiry Details",
    footerNotice: "© Elephant Beach Villa Komari · Direct Guest Inquiry System"
  },

  // 5. Guest Receipt: Direct Message Acknowledgement (Sent to guest)
  inquiryGuestReceipt: {
    subject: "🌴 We Received Your Message [{{subject}}] - Elephant Beach Villa Komari",
    badgeText: "Status: Message Received · Host Notified",
    heading: "Thank You, {{guestName}}!",
    subheading: "We have received your direct message regarding \"{{subject}}\". Host Neesha and Caretaker Saman will review your message and reply promptly via email or WhatsApp.",
    summaryTitle: "Your Inquiry Summary",
    whatsappButtonText: "💬 Chat with Host Neesha on WhatsApp (+94 77 218 6718)",
    whatsappUrl: "https://wa.me/94772186718",
    footerNotice: "© Elephant Beach Villa Komari · Direct Guest Inquiry Gateway"
  }
};

/**
 * Helper: Safely escapes HTML special characters to prevent injection in email layouts.
 */
function escapeHtmlGAS(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Helper: Replace {{key}} placeholders in template strings
 */
function fillTemplateString(str, data) {
  if (!str) return "";
  let res = String(str);
  res = res.replace(/\{\{bookingId\}\}/g, data.bookingId || "");
  res = res.replace(/\{\{guestName\}\}/g, data.guestName || "Guest");
  res = res.replace(/\{\{rooms\}\}/g, data.rooms || "Entire Villa");
  res = res.replace(/\{\{checkIn\}\}/g, data.checkIn || "");
  res = res.replace(/\{\{checkOut\}\}/g, data.checkOut || "");
  res = res.replace(/\{\{totalNights\}\}/g, String(data.totalNights || 1));
  res = res.replace(/\{\{guestsCount\}\}/g, String(data.guestsCount || 2));
  res = res.replace(/\{\{phone\}\}/g, data.phone || "");
  res = res.replace(/\{\{specialRequests\}\}/g, data.specialRequests || "None");
  res = res.replace(/\{\{subject\}\}/g, data.subject || "General Inquiry");
  res = res.replace(/\{\{message\}\}/g, data.message || "");
  return res;
}

/**
 * Helper to open the bound or configured spreadsheet safely.
 */
function getSpreadsheet() {
  if (SPREADSHEET_ID && SPREADSHEET_ID !== "YOUR_SPREADSHEET_ID") {
    try {
      return SpreadsheetApp.openById(SPREADSHEET_ID);
    } catch (err) {
      console.warn("Could not open by ID, falling back to active spreadsheet:", err);
    }
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Standard CORS JSON Response
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * GET Handler: Returns clean JSON map of booked dates for all 4 rooms.
 * Endpoint: ?action=getAvailability or general GET
 */
function doGet(e) {
  try {
    const ss = getSpreadsheet();
    let availabilitySheet = ss.getSheetByName("RoomAvailability");

    if (!availabilitySheet) {
      setupSpreadsheet();
      availabilitySheet = ss.getSheetByName("RoomAvailability");
    }

    const bookedDatesMap = fetchBookedDatesMap(availabilitySheet);

    return createJsonResponse({
      status: "success",
      timestamp: new Date().toISOString(),
      bookedDates: bookedDatesMap
    });
  } catch (error) {
    console.error("doGet error:", error);
    return createJsonResponse({
      status: "error",
      message: error.toString()
    });
  }
}

/**
 * POST Handler: Handles "submitBooking", "updateCalendar", and "updateBookingStatus"
 */
function doPost(e) {
  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (err) {
        payload = e.parameter || {};
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    const action = payload.action || "submitBooking";

    if (action === "updateCalendar") {
      return handleUpdateCalendar(payload);
    } else if (action === "updateBookingStatus") {
      return handleUpdateBookingStatus(payload);
    } else if (action === "submitBooking") {
      return handleSubmitBooking(payload);
    } else if (action === "contactInquiry") {
      return handleContactInquiry(payload);
    } else {
      return createJsonResponse({
        status: "error",
        message: "Unrecognized action: " + action
      });
    }
  } catch (error) {
    console.error("doPost error:", error);
    return createJsonResponse({
      status: "error",
      message: error.toString()
    });
  }
}

/**
 * Action: updateCalendar
 * Requires Admin PIN authentication.
 * Upserts dates in "RoomAvailability" to "Booked" or "Open".
 */
function handleUpdateCalendar(payload) {
  // 1. Verify Admin PIN
  if (payload.pin !== ADMIN_PIN) {
    return createJsonResponse({
      status: "error",
      message: "Unauthorized: Invalid Admin PIN / Password"
    });
  }

  const ss = getSpreadsheet();
  let availabilitySheet = ss.getSheetByName("RoomAvailability");
  if (!availabilitySheet) {
    setupSpreadsheet();
    availabilitySheet = ss.getSheetByName("RoomAvailability");
  }

  // 2. Handle batch changes array from Admin Edit Mode
  if (Array.isArray(payload.changes) && payload.changes.length > 0) {
    applyChangesToRoomAvailability(availabilitySheet, payload.changes);
    const updatedBookedDates = fetchBookedDatesMap(availabilitySheet);
    return createJsonResponse({
      status: "success",
      message: "Google Sheet updated successfully in real time.",
      updatedCount: payload.changes.length,
      bookedDates: updatedBookedDates
    });
  }

  // 3. Fallback: Legacy array of dates & roomIds
  const dates = Array.isArray(payload.dates) ? payload.dates : (payload.date ? [payload.date] : []);
  const roomIds = Array.isArray(payload.roomIds) ? payload.roomIds : (payload.roomId ? [payload.roomId] : ROOM_IDS);
  const status = (payload.status === "Open" || payload.status === "open") ? "Open" : "Booked";

  if (dates.length === 0) {
    return createJsonResponse({
      status: "error",
      message: "No dates provided to update."
    });
  }

  // Update room availability
  updateRoomAvailabilityRange(availabilitySheet, dates, roomIds, status);

  // Return fresh state
  const updatedBookedDates = fetchBookedDatesMap(availabilitySheet);

  return createJsonResponse({
    status: "success",
    message: "Google Sheet updated successfully in real time.",
    updatedDates: dates,
    updatedRooms: roomIds,
    statusApplied: status,
    bookedDates: updatedBookedDates
  });
}

/**
 * Action: submitBooking
 * Writes guest details to "Bookings" sheet with Status = "Pending Verification".
 * DOES NOT block calendar dates yet.
 * Sends host notification email with WhatsApp quick link.
 */
function handleSubmitBooking(payload) {
  const ss = getSpreadsheet();
  let bookingsSheet = ss.getSheetByName("Bookings");
  if (!bookingsSheet) {
    setupSpreadsheet();
    bookingsSheet = ss.getSheetByName("Bookings");
  }

  const guestName = (payload.guestName || payload.name || "Guest").trim();
  const phone = (payload.phone || payload.guestPhone || "").trim();
  const email = (payload.email || payload.guestEmail || "").trim();
  const rooms = (payload.rooms || payload.selectedRooms || "Entire Villa (All 4 Bedrooms)").trim();
  const checkIn = (payload.checkIn || "").trim();
  const checkOut = (payload.checkOut || "").trim();
  const guestsCount = payload.guestsCount || payload.guests || "2";
  const specialRequests = (payload.specialRequests || payload.notes || "").trim();

  // Validate mandatory fields
  if (!guestName || !phone || !email || !checkIn || !checkOut) {
    return createJsonResponse({
      status: "error",
      message: "Missing mandatory fields (name, phone, email, check-in, check-out)."
    });
  }

  // Calculate total nights
  let totalNights = 1;
  try {
    const dIn = new Date(checkIn);
    const dOut = new Date(checkOut);
    const diffTime = dOut.getTime() - dIn.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    totalNights = diffDays > 0 ? diffDays : 1;
  } catch (e) {
    totalNights = 1;
  }

  // Generate Unique Booking ID: EBV-YYYYMMDD-XXXX
  const dateStr = formatDateCompact(new Date());
  const randSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const bookingId = "EBV-" + dateStr + "-" + randSuffix;

  const timestamp = Utilities.formatDate(new Date(), TIME_ZONE, "yyyy-MM-dd HH:mm:ss");
  const initialStatus = "Pending Verification";

  // Prevent Google Sheets formula parse error:
  // When a cell starts with '+' (e.g. +94 77 218 6718), Google Sheets treats it as an arithmetic formula
  // which produces "#ERROR!". Prepending "'" instructs Google Sheets to store it strictly as literal text.
  const cleanPhone = phone.replace(/^['"]*/, '').trim();
  const phoneForSheet = cleanPhone ? ("'" + cleanPhone) : "";

  // Columns: [Status, Timestamp, BookingID, Rooms, GuestName, Phone, Email, CheckIn, CheckOut, TotalNights, GuestsCount, SpecialRequests]
  const rowData = [
    initialStatus,
    timestamp,
    bookingId,
    rooms,
    guestName,
    phoneForSheet,
    email,
    checkIn,
    checkOut,
    totalNights,
    guestsCount,
    specialRequests
  ];

  bookingsSheet.appendRow(rowData);
  const newRowIndex = bookingsSheet.getLastRow();

  // Explicitly set the cell's number format to Plain Text '@' to guarantee no formula parsing occurs
  try {
    bookingsSheet.getRange(newRowIndex, 6).setNumberFormat('@').setValue(phoneForSheet);
  } catch (fmtErr) {
    console.warn("Could not set number format on phone cell:", fmtErr);
  }

  // Apply in-cell dropdown for Status in Column 1
  applyStatusDataValidation(bookingsSheet, newRowIndex);

  // Send Notification Email to Villa Host
  try {
    sendHostNotificationEmail({
      bookingId: bookingId,
      guestName: guestName,
      phone: phone,
      email: email,
      rooms: rooms,
      checkIn: checkIn,
      checkOut: checkOut,
      totalNights: totalNights,
      guestsCount: guestsCount,
      specialRequests: specialRequests,
      spreadsheetUrl: ss.getUrl()
    });
  } catch (emailErr) {
    console.warn("Host notification email error (non-fatal):", emailErr);
  }

  // Send Direct Confirmation Email to Guest (at the provided email)
  try {
    sendGuestConfirmationEmail({
      bookingId: bookingId,
      guestName: guestName,
      phone: phone,
      email: email,
      rooms: rooms,
      checkIn: checkIn,
      checkOut: checkOut,
      totalNights: totalNights,
      guestsCount: guestsCount,
      specialRequests: specialRequests
    });
  } catch (guestEmailErr) {
    console.warn("Guest confirmation email error (non-fatal):", guestEmailErr);
  }

  return createJsonResponse({
    status: "success",
    bookingId: bookingId,
    statusName: initialStatus,
    message: "Your reservation request has been submitted for host verification. Calendar dates remain available until Host Neesha confirms your booking."
  });
}

/**
 * Extracts a dynamic header map from the sheet (e.g. column 1 is status, column 6 is phone, column 7 is email, etc.)
 * This ensures that even if columns are moved, renamed, or rearranged in Google Sheets, data is always accurately resolved.
 */
function getSheetHeaderMap(sheet) {
  const lastCol = Math.max(sheet.getLastColumn(), 12);
  const headerValues = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const map = {};
  for (let c = 0; c < headerValues.length; c++) {
    const raw = String(headerValues[c] || "").trim().toLowerCase().replace(/[\s_\-\(\)\/]/g, "");
    if (raw) {
      map[raw] = c + 1; // 1-indexed column
    }
  }
  return map;
}

/**
 * Extracts all booking fields from a row, resolving column positions dynamically and recovering corrupted phone numbers.
 */
function extractBookingDataFromRow(sheet, row, headerMap) {
  if (!headerMap) headerMap = getSheetHeaderMap(sheet);
  const lastCol = Math.max(sheet.getLastColumn(), 12);
  const rowValues = sheet.getRange(row, 1, 1, lastCol).getValues()[0];

  function getVal(aliases, defaultColIndex, defaultVal) {
    for (let i = 0; i < aliases.length; i++) {
      const col = headerMap[aliases[i]];
      if (col && col <= rowValues.length) {
        const val = rowValues[col - 1];
        if (val !== undefined && val !== null && String(val).trim() !== "") {
          return val;
        }
      }
    }
    if (defaultColIndex && defaultColIndex <= rowValues.length) {
      return rowValues[defaultColIndex - 1];
    }
    return defaultVal || "";
  }

  const bookingId = String(getVal(["bookingid", "refid", "id", "ref"], 3, "")).trim();
  const roomsText = String(getVal(["rooms", "room", "accommodation", "selectedrooms"], 4, "Entire Villa (All 4 Bedrooms)")).trim();
  const guestName = String(getVal(["guestname", "name", "guest"], 5, "Guest")).trim();

  // Phone number: retrieve from cell and guard against #ERROR! formula corruption
  const phoneCol = headerMap["phone"] || headerMap["guestphone"] || headerMap["contactphone"] || 6;
  const phoneCell = sheet.getRange(row, phoneCol);
  const phoneVal = String(phoneCell.getValue() || "").trim();
  const phoneFormula = String(phoneCell.getFormula() || "").trim();
  let phone = "";
  if (phoneVal === "#ERROR!" || phoneVal.includes("ERROR") || phoneFormula.startsWith("=") || phoneFormula.startsWith("+")) {
    let recovered = phoneFormula.replace(/^[=+]+/, "").trim();
    if (!recovered.startsWith("+")) recovered = "+" + recovered;
    phone = recovered;
  } else {
    phone = phoneVal.replace(/^['"]*/, "");
  }

  // Email address
  const emailCol = headerMap["email"] || headerMap["guestemail"] || headerMap["contactemail"] || 7;
  const email = String(sheet.getRange(row, emailCol).getValue() || "").trim();

  const checkInVal = getVal(["checkin", "checkindate", "arrival"], 8, "");
  const checkOutVal = getVal(["checkout", "checkoutdate", "departure"], 9, "");
  const totalNights = getVal(["totalnights", "nights"], 10, 1);
  const guestsCount = getVal(["guestscount", "guests", "totalguests"], 11, 2);
  const specialRequests = String(getVal(["specialrequests", "requests", "notes"], 12, "")).trim();
  const status = String(getVal(["status", "bookingstatus"], 1, "Pending Verification")).trim();

  const checkInDateObj = parseDateCell(checkInVal) || new Date();
  const checkOutDateObj = parseDateCell(checkOutVal) || new Date();
  const checkInStr = Utilities.formatDate(checkInDateObj, TIME_ZONE, "yyyy-MM-dd");
  const checkOutStr = Utilities.formatDate(checkOutDateObj, TIME_ZONE, "yyyy-MM-dd");

  return {
    row: row,
    status: status,
    bookingId: bookingId,
    rooms: roomsText,
    guestName: guestName,
    phone: phone,
    email: email,
    checkIn: checkInStr,
    checkOut: checkOutStr,
    totalNights: totalNights,
    guestsCount: guestsCount,
    specialRequests: specialRequests,
    rawCheckIn: checkInVal,
    rawCheckOut: checkOutVal
  };
}

/**
 * onEdit(e) Simple Trigger
 * Listens for edits to the "Status" column in the "Bookings" sheet.
 */
function onEdit(e) {
  handleSpreadsheetEdit(e, false);
}

/**
 * installedSpreadsheetEdit(e) Installable Trigger
 * Runs with full user authorization so MailApp and GmailApp can dispatch guest emails without permission blocks!
 */
function installedSpreadsheetEdit(e) {
  handleSpreadsheetEdit(e, true);
}

/**
 * Core Status Change Processor
 * - When Status becomes "Confirmed":
 *   1. Updates "RoomAvailability" sheet in real-time marking dates from CheckIn to CheckOut as "Booked".
 *   2. Automatically sends the Luxury Confirmed Reservation email to the guest's email address.
 * - When Status becomes "Cancelled":
 *   1. Updates "RoomAvailability" sheet in real-time releasing dates from CheckIn to CheckOut to "Open".
 *   2. Automatically sends the Luxury Cancellation email to the guest's email address.
 */
function handleSpreadsheetEdit(e, isInstallable) {
  try {
    if (!e || !e.range) return;

    const sheet = e.range.getSheet();
    if (sheet.getName() !== "Bookings") return;

    const row = e.range.getRow();
    const col = e.range.getColumn();

    const headerMap = getSheetHeaderMap(sheet);
    const statusCol = headerMap["status"] || 1;

    // Check if edited column is the Status column and ignore header row
    if (col !== statusCol || row <= 1) return;

    const newStatus = String(e.value || e.range.getValue()).trim();
    if (newStatus !== "Confirmed" && newStatus !== "Cancelled") return;

    const data = extractBookingDataFromRow(sheet, row, headerMap);

    if (!data.rawCheckIn || !data.rawCheckOut) {
      console.warn("handleSpreadsheetEdit: CheckIn or CheckOut missing for row " + row);
      return;
    }

    const dates = getDatesListBetween(data.rawCheckIn, data.rawCheckOut);
    const roomIds = parseRoomIdsFromText(data.rooms);

    if (dates.length === 0 || roomIds.length === 0) {
      console.warn("handleSpreadsheetEdit: No dates or rooms resolved for row " + row);
      return;
    }

    const ss = getSpreadsheet();
    let availabilitySheet = ss.getSheetByName("RoomAvailability");
    if (!availabilitySheet) {
      setupSpreadsheet();
      availabilitySheet = ss.getSheetByName("RoomAvailability");
    }

    if (newStatus === "Confirmed") {
      updateRoomAvailabilityRange(availabilitySheet, dates, roomIds, "Booked");
      console.log("✓ Booking " + data.bookingId + " confirmed. Marked dates " + data.checkIn + " to " + data.checkOut + " as Booked:", dates);

      // Automatically send Confirmation Email to guest
      try {
        const sent = sendGuestBookingConfirmedEmail(data);
        if (sent) {
          console.log("✓ Confirmation email dispatched to guest:", data.email);
        } else {
          console.warn("Email could not be dispatched to " + data.email + ". Note: If running via simple onEdit trigger, authorize installable triggers via menu '🌴 Elephant Beach Villa -> ⚡ 1. Authorize & Enable Auto-Email Triggers'.");
        }
      } catch (mailErr) {
        console.warn("Could not send confirmation email:", mailErr);
      }
    } else if (newStatus === "Cancelled") {
      updateRoomAvailabilityRange(availabilitySheet, dates, roomIds, "Open");
      console.log("✓ Booking " + data.bookingId + " cancelled. Released dates " + data.checkIn + " to " + data.checkOut + " to Open:", dates);

      // Automatically send Cancellation Email to guest
      try {
        const sent = sendGuestBookingCancelledEmail(data);
        if (sent) {
          console.log("✓ Cancellation email dispatched to guest:", data.email);
        } else {
          console.warn("Email could not be dispatched to " + data.email + ". Note: If running via simple onEdit trigger, authorize installable triggers via menu '🌴 Elephant Beach Villa -> ⚡ 1. Authorize & Enable Auto-Email Triggers'.");
        }
      } catch (mailErr) {
        console.warn("Could not send cancellation email:", mailErr);
      }
    }
  } catch (err) {
    console.error("handleSpreadsheetEdit trigger error:", err);
  }
}

/**
 * Custom UI Menu added automatically when opening the Google Sheet.
 * Provides Host Neesha with 1-click tools:
 * 1. Authorize and activate auto-email triggers
 * 2. 1-Click Confirm or Cancel any selected reservation with guaranteed email delivery
 * 3. Resend emails if guest didn't receive them
 * 4. Fix #ERROR! phone number issues instantly
 * 5. Re-synchronize availability calendar
 */
function onOpen(e) {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu("🌴 Elephant Beach Villa")
      .addItem("⚡ 1. Authorize & Enable Auto-Email Triggers (Run Once)", "setupTriggers")
      .addSeparator()
      .addItem("✅ Confirm Selected Booking & Send Email", "menuConfirmSelectedBooking")
      .addItem("❌ Cancel Selected Booking & Send Email", "menuCancelSelectedBooking")
      .addItem("✉️ Resend Email for Selected Row", "menuResendEmailForSelectedRow")
      .addSeparator()
      .addItem("🔧 Fix Phone Numbers (#ERROR! Fix)", "menuRepairPhoneErrors")
      .addItem("📊 Re-sync All Dates to Availability Calendar", "syncAllConfirmedBookings")
      .addToUi();
  } catch (err) {
    console.warn("onOpen UI menu error:", err);
  }
}

/**
 * Menu Action: Confirm Selected Booking
 */
function menuConfirmSelectedBooking() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSheet();
  if (sheet.getName() !== "Bookings") {
    ui.alert("Notice", "Please open and select a reservation row in the 'Bookings' sheet.", ui.ButtonSet.OK);
    return;
  }

  const row = sheet.getActiveRange().getRow();
  if (row <= 1) {
    ui.alert("Notice", "Please select a booking row (Row 2 or higher), not the header row.", ui.ButtonSet.OK);
    return;
  }

  const headerMap = getSheetHeaderMap(sheet);
  const data = extractBookingDataFromRow(sheet, row, headerMap);

  const confirmPrompt = ui.alert(
    "Confirm Booking " + data.bookingId + "?",
    "Guest: " + data.guestName + "\n" +
    "Email: " + data.email + "\n" +
    "Dates: " + data.checkIn + " to " + data.checkOut + "\n" +
    "Room: " + data.rooms + "\n\n" +
    "Click YES to set status to Confirmed, lock dates on the website calendar, and dispatch the confirmation email to " + data.email + ".",
    ui.ButtonSet.YES_NO
  );

  if (confirmPrompt !== ui.Button.YES) return;

  // 1. Update Status in sheet
  const statusCol = headerMap["status"] || 1;
  sheet.getRange(row, statusCol).setValue("Confirmed");

  // 2. Lock dates in RoomAvailability
  const ss = getSpreadsheet();
  let availabilitySheet = ss.getSheetByName("RoomAvailability");
  if (!availabilitySheet) {
    setupSpreadsheet();
    availabilitySheet = ss.getSheetByName("RoomAvailability");
  }
  const dates = getDatesListBetween(data.rawCheckIn, data.rawCheckOut);
  const roomIds = parseRoomIdsFromText(data.rooms);
  updateRoomAvailabilityRange(availabilitySheet, dates, roomIds, "Booked");

  // 3. Dispatch confirmed email
  let emailDispatched = false;
  try {
    emailDispatched = sendGuestBookingConfirmedEmail(data);
  } catch (err) {
    console.error("Email send error:", err);
  }

  ui.alert(
    "🎉 Booking Confirmed!",
    "Booking " + data.bookingId + " is now CONFIRMED.\n\n" +
    "• Dates from " + data.checkIn + " to " + data.checkOut + " are marked as BOOKED on the calendar.\n" +
    (emailDispatched ? "• Official Confirmation Email successfully sent to: " + data.email : "• Warning: Email could not be sent. Please check Apps Script authorizations."),
    ui.ButtonSet.OK
  );
}

/**
 * Menu Action: Cancel Selected Booking
 */
function menuCancelSelectedBooking() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSheet();
  if (sheet.getName() !== "Bookings") {
    ui.alert("Notice", "Please open and select a reservation row in the 'Bookings' sheet.", ui.ButtonSet.OK);
    return;
  }

  const row = sheet.getActiveRange().getRow();
  if (row <= 1) {
    ui.alert("Notice", "Please select a booking row (Row 2 or higher), not the header row.", ui.ButtonSet.OK);
    return;
  }

  const headerMap = getSheetHeaderMap(sheet);
  const data = extractBookingDataFromRow(sheet, row, headerMap);

  const confirmPrompt = ui.alert(
    "Cancel Booking " + data.bookingId + "?",
    "Guest: " + data.guestName + "\n" +
    "Email: " + data.email + "\n" +
    "Dates: " + data.checkIn + " to " + data.checkOut + "\n\n" +
    "Click YES to set status to Cancelled, release dates back to Open on the website calendar, and dispatch the cancellation email to " + data.email + ".",
    ui.ButtonSet.YES_NO
  );

  if (confirmPrompt !== ui.Button.YES) return;

  // 1. Update Status in sheet
  const statusCol = headerMap["status"] || 1;
  sheet.getRange(row, statusCol).setValue("Cancelled");

  // 2. Release dates in RoomAvailability
  const ss = getSpreadsheet();
  let availabilitySheet = ss.getSheetByName("RoomAvailability");
  if (!availabilitySheet) {
    setupSpreadsheet();
    availabilitySheet = ss.getSheetByName("RoomAvailability");
  }
  const dates = getDatesListBetween(data.rawCheckIn, data.rawCheckOut);
  const roomIds = parseRoomIdsFromText(data.rooms);
  updateRoomAvailabilityRange(availabilitySheet, dates, roomIds, "Open");

  // 3. Dispatch cancellation email
  let emailDispatched = false;
  try {
    emailDispatched = sendGuestBookingCancelledEmail(data);
  } catch (err) {
    console.error("Email send error:", err);
  }

  ui.alert(
    "Booking Cancelled",
    "Booking " + data.bookingId + " has been CANCELLED.\n\n" +
    "• Dates from " + data.checkIn + " to " + data.checkOut + " are released to OPEN on the calendar.\n" +
    (emailDispatched ? "• Official Cancellation Email successfully sent to: " + data.email : "• Warning: Email could not be sent. Please check Apps Script authorizations."),
    ui.ButtonSet.OK
  );
}

/**
 * Menu Action: Resend Email for Selected Row
 */
function menuResendEmailForSelectedRow() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSheet();
  if (sheet.getName() !== "Bookings") {
    ui.alert("Notice", "Please open and select a row in the 'Bookings' sheet.", ui.ButtonSet.OK);
    return;
  }

  const row = sheet.getActiveRange().getRow();
  if (row <= 1) {
    ui.alert("Notice", "Please select a booking row.", ui.ButtonSet.OK);
    return;
  }

  const headerMap = getSheetHeaderMap(sheet);
  const data = extractBookingDataFromRow(sheet, row, headerMap);

  if (!data.email || !data.email.includes("@")) {
    ui.alert("Invalid Email", "No valid email address found in row " + row + " for guest " + data.guestName, ui.ButtonSet.OK);
    return;
  }

  let sent = false;
  if (data.status === "Confirmed") {
    sent = sendGuestBookingConfirmedEmail(data);
  } else if (data.status === "Cancelled") {
    sent = sendGuestBookingCancelledEmail(data);
  } else {
    sent = sendGuestConfirmationEmail(data);
  }

  if (sent) {
    ui.alert("Email Sent", "Successfully resent " + data.status + " email to " + data.email, ui.ButtonSet.OK);
  } else {
    ui.alert("Send Failed", "Could not send email to " + data.email + ". Please check your Google account quotas or authorizations.", ui.ButtonSet.OK);
  }
}

/**
 * Menu Action: Repair Phone Numbers
 */
function menuRepairPhoneErrors() {
  const ui = SpreadsheetApp.getUi();
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName("Bookings");
  if (!sheet) {
    ui.alert("Error", "'Bookings' sheet not found.", ui.ButtonSet.OK);
    return;
  }
  const count = repairPhoneErrors(sheet);
  ui.alert("Phone Numbers Formatted", "Successfully verified phone column as Plain Text.\nRepaired " + count + " cells containing formula errors (#ERROR!).", ui.ButtonSet.OK);
}

/**
 * Synchronizes all confirmed bookings from the "Bookings" sheet into the "RoomAvailability" calendar.
 */
function syncAllConfirmedBookings() {
  const ss = getSpreadsheet();
  const bookingsSheet = ss.getSheetByName("Bookings");
  let availabilitySheet = ss.getSheetByName("RoomAvailability");
  if (!bookingsSheet) return;
  if (!availabilitySheet) {
    setupSpreadsheet();
    availabilitySheet = ss.getSheetByName("RoomAvailability");
  }

  const lastRow = bookingsSheet.getLastRow();
  if (lastRow <= 1) return;

  const headerMap = getSheetHeaderMap(bookingsSheet);
  let confirmedCount = 0;

  for (let r = 2; r <= lastRow; r++) {
    const data = extractBookingDataFromRow(bookingsSheet, r, headerMap);
    if (data.status === "Confirmed" && data.rawCheckIn && data.rawCheckOut) {
      const dates = getDatesListBetween(data.rawCheckIn, data.rawCheckOut);
      const roomIds = parseRoomIdsFromText(data.rooms);
      updateRoomAvailabilityRange(availabilitySheet, dates, roomIds, "Booked");
      confirmedCount++;
    }
  }

  console.log("Synchronized " + confirmedCount + " confirmed bookings to RoomAvailability calendar.");
  try {
    SpreadsheetApp.getUi().alert("Calendar Synchronized", "Successfully verified " + confirmedCount + " confirmed bookings and synchronized their dates to the RoomAvailability calendar.", SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {}
}

/**
 * Action: updateBookingStatus
 * Enables status update directly via Web App API (with full permissions, zero auth restrictions)
 * Payload: { action: "updateBookingStatus", bookingId: "...", status: "Confirmed" | "Cancelled", pin: ADMIN_PIN }
 */
function handleUpdateBookingStatus(payload) {
  if (payload.pin !== ADMIN_PIN) {
    return createJsonResponse({ status: "error", message: "Unauthorized: Invalid Admin PIN" });
  }

  const bookingId = String(payload.bookingId || "").trim();
  const targetStatus = String(payload.status || "").trim();

  if (!bookingId || (targetStatus !== "Confirmed" && targetStatus !== "Cancelled")) {
    return createJsonResponse({ status: "error", message: "Invalid bookingId or status. Must be Confirmed or Cancelled." });
  }

  const ss = getSpreadsheet();
  const bookingsSheet = ss.getSheetByName("Bookings");
  if (!bookingsSheet) {
    return createJsonResponse({ status: "error", message: "Bookings sheet not found." });
  }

  const lastRow = bookingsSheet.getLastRow();
  if (lastRow <= 1) {
    return createJsonResponse({ status: "error", message: "No bookings found in sheet." });
  }

  const headerMap = getSheetHeaderMap(bookingsSheet);
  const idCol = headerMap["bookingid"] || headerMap["refid"] || headerMap["id"] || 3;
  const idValues = bookingsSheet.getRange(2, idCol, lastRow - 1, 1).getValues();
  let foundRow = -1;
  for (let i = 0; i < idValues.length; i++) {
    if (String(idValues[i][0]).trim() === bookingId) {
      foundRow = i + 2;
      break;
    }
  }

  if (foundRow === -1) {
    return createJsonResponse({ status: "error", message: "Booking ID " + bookingId + " not found." });
  }

  // Update Status in sheet
  const statusCol = headerMap["status"] || 1;
  bookingsSheet.getRange(foundRow, statusCol).setValue(targetStatus);

  // Extract row data dynamically
  const bookingData = extractBookingDataFromRow(bookingsSheet, foundRow, headerMap);

  const dates = getDatesListBetween(bookingData.rawCheckIn, bookingData.rawCheckOut);
  const roomIds = parseRoomIdsFromText(bookingData.rooms);

  let availabilitySheet = ss.getSheetByName("RoomAvailability");
  if (!availabilitySheet) {
    setupSpreadsheet();
    availabilitySheet = ss.getSheetByName("RoomAvailability");
  }

  let emailSent = false;
  if (targetStatus === "Confirmed") {
    updateRoomAvailabilityRange(availabilitySheet, dates, roomIds, "Booked");
    try {
      emailSent = sendGuestBookingConfirmedEmail(bookingData);
    } catch (err) {
      console.warn("Error sending confirmed email:", err);
    }
  } else {
    updateRoomAvailabilityRange(availabilitySheet, dates, roomIds, "Open");
    try {
      emailSent = sendGuestBookingCancelledEmail(bookingData);
    } catch (err) {
      console.warn("Error sending cancelled email:", err);
    }
  }

  const updatedBookedDates = fetchBookedDatesMap(availabilitySheet);

  return createJsonResponse({
    status: "success",
    message: "Booking " + bookingId + " updated to " + targetStatus + ". Availability sheet updated and email sent to " + bookingData.email + ".",
    bookingId: bookingId,
    newStatus: targetStatus,
    emailSent: emailSent,
    datesAffected: dates,
    bookedDates: updatedBookedDates
  });
}

/**
 * Reads "RoomAvailability" sheet and returns a map of booked dates for each room.
 * { room1: ["2026-10-01", ...], room2: [...], ... }
 */
function fetchBookedDatesMap(sheet) {
  const result = {
    room1: [],
    room2: [],
    room3: [],
    room4: []
  };

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return result;

  const data = sheet.getRange(2, 1, lastRow - 1, 5).getValues();

  data.forEach(row => {
    let dateVal = row[0];
    if (!dateVal) return;

    let dateStr = "";
    if (dateVal instanceof Date) {
      dateStr = Utilities.formatDate(dateVal, TIME_ZONE, "yyyy-MM-dd");
    } else {
      dateStr = String(dateVal).trim().substring(0, 10);
    }

    if (!dateStr || dateStr.length < 10) return;

    ROOM_IDS.forEach(roomId => {
      const colIdx = ROOM_COLUMNS[roomId] - 1;
      const val = String(row[colIdx] || "").trim().toLowerCase();
      if (val === "booked") {
        result[roomId].push(dateStr);
      }
    });
  });

  return result;
}

/**
 * Upserts rows in "RoomAvailability" sheet.
 * For each date in dates array, sets selected room columns to targetStatus ("Booked" or "Open").
 */
function updateRoomAvailabilityRange(sheet, dates, roomIds, targetStatus) {
  const lastRow = sheet.getLastRow();
  const existingMap = {}; // dateStr -> rowIndex

  if (lastRow > 1) {
    const dateValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    dateValues.forEach((r, idx) => {
      let d = r[0];
      if (d) {
        let str = (d instanceof Date) ? Utilities.formatDate(d, TIME_ZONE, "yyyy-MM-dd") : String(d).trim().substring(0, 10);
        existingMap[str] = idx + 2; // 1-based sheet row index
      }
    });
  }

  dates.forEach(dateStr => {
    let rowNum = existingMap[dateStr];
    if (rowNum) {
      // Update existing row
      roomIds.forEach(roomId => {
        const col = ROOM_COLUMNS[roomId];
        sheet.getRange(rowNum, col).setValue(targetStatus);
      });
    } else {
      // Add new date row
      const newRow = [dateStr, "Open", "Open", "Open", "Open"];
      roomIds.forEach(roomId => {
        const colIdx = ROOM_COLUMNS[roomId] - 1;
        newRow[colIdx] = targetStatus;
      });
      sheet.appendRow(newRow);
      existingMap[dateStr] = sheet.getLastRow();
    }
  });
}

/**
 * Applies a batch of individual room-date status changes directly to "RoomAvailability" sheet.
 * changes: [ { roomId: "room1", date: "2026-10-01", status: "Booked" }, ... ]
 */
function applyChangesToRoomAvailability(sheet, changes) {
  const lastRow = sheet.getLastRow();
  const existingMap = {}; // dateStr -> rowIndex

  if (lastRow > 1) {
    const dateValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    dateValues.forEach((r, idx) => {
      let d = r[0];
      if (d) {
        let str = (d instanceof Date) ? Utilities.formatDate(d, TIME_ZONE, "yyyy-MM-dd") : String(d).trim().substring(0, 10);
        existingMap[str] = idx + 2; // 1-based sheet row index
      }
    });
  }

  changes.forEach(change => {
    const dateStr = (change.date || change.dateStr || "").trim();
    const roomId = (change.roomId || "").trim();
    const targetStatus = (change.status === "Open" || change.status === "open") ? "Open" : "Booked";
    
    if (!dateStr || !ROOM_COLUMNS[roomId]) return;

    let rowNum = existingMap[dateStr];
    if (rowNum) {
      const col = ROOM_COLUMNS[roomId];
      sheet.getRange(rowNum, col).setValue(targetStatus);
    } else {
      // Append new date row
      const newRow = [dateStr, "Open", "Open", "Open", "Open"];
      const colIdx = ROOM_COLUMNS[roomId] - 1;
      newRow[colIdx] = targetStatus;
      sheet.appendRow(newRow);
      existingMap[dateStr] = sheet.getLastRow();
    }
  });
}

/**
 * Helper: Safely parse a date value from a sheet cell (Date object or string).
 */
function parseDateCell(val) {
  if (!val) return null;
  if (val instanceof Date) {
    const d = new Date(val.getTime());
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const str = String(val).trim();
  const m = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) {
    return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10), 0, 0, 0);
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    parsed.setHours(0, 0, 0, 0);
    return parsed;
  }
  return null;
}

/**
 * Helper: Parse all dates from checkIn date to checkOut date of that request.
 * Generates an array of YYYY-MM-DD date strings from CheckIn up to and including CheckOut.
 */
function getDatesListBetween(checkInVal, checkOutVal) {
  const dates = [];
  try {
    const s = parseDateCell(checkInVal);
    const e = parseDateCell(checkOutVal);
    if (!s || !e) return dates;

    const curr = new Date(s.getTime());
    // Loops from CheckIn date through CheckOut date
    while (curr <= e) {
      dates.push(Utilities.formatDate(curr, TIME_ZONE, "yyyy-MM-dd"));
      curr.setDate(curr.getDate() + 1);
    }
  } catch (err) {
    console.error("Error computing dates range:", err);
  }
  return dates;
}

/**
 * Helper: Parse room IDs from user-submitted text string
 */
function parseRoomIdsFromText(roomsText) {
  const lower = String(roomsText).toLowerCase();
  if (lower.includes("entire") || lower.includes("all 4") || lower.includes("all four")) {
    return ["room1", "room2", "room3", "room4"];
  }

  const selected = [];
  if (lower.includes("room 1") || lower.includes("room1")) selected.push("room1");
  if (lower.includes("room 2") || lower.includes("room2")) selected.push("room2");
  if (lower.includes("room 3") || lower.includes("room3")) selected.push("room3");
  if (lower.includes("room 4") || lower.includes("room4")) selected.push("room4");

  return selected.length > 0 ? selected : ["room1", "room2", "room3", "room4"];
}

/**
 * Format Date as YYYYMMDD
 */
function formatDateCompact(d) {
  return Utilities.formatDate(d, TIME_ZONE, "yyyyMMdd");
}

/**
 * Apply dropdown validation to Status column for a given row.
 */
function applyStatusDataValidation(sheet, rowNumber) {
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(STATUS_OPTIONS, true)
    .setAllowInvalid(false)
    .build();

  const cell = sheet.getRange(rowNumber, 1);
  cell.setDataValidation(rule);
}

/**
 * Safe email sender with dual engine fallback: MailApp -> GmailApp.
 * Handles headers, guarantees delivery attempts, and provides comprehensive logging for diagnostics.
 */
function safeSendEmail(options) {
  if (!options || !options.to) {
    console.warn("safeSendEmail: Aborted because no recipient email address was provided.");
    return false;
  }
  const recipient = String(options.to).trim();
  if (!recipient || !recipient.includes("@")) {
    console.warn("safeSendEmail: Aborted due to invalid recipient email: " + recipient);
    return false;
  }

  const errors = [];

  // Engine 1: MailApp (Standard Apps Script mail quota)
  try {
    MailApp.sendEmail({
      to: recipient,
      subject: options.subject,
      htmlBody: options.htmlBody,
      name: "Elephant Beach Villa"
    });
    console.log("✓ Email successfully dispatched via MailApp to: " + recipient + " [" + options.subject + "]");
    return true;
  } catch (err1) {
    console.warn("MailApp.sendEmail failed (" + err1.message + "). Attempting fallback to GmailApp...");
    errors.push("MailApp: " + err1.message);
  }

  // Engine 2: GmailApp fallback
  try {
    GmailApp.sendEmail(recipient, options.subject, "", {
      htmlBody: options.htmlBody,
      name: "Elephant Beach Villa"
    });
    console.log("✓ Email successfully dispatched via GmailApp fallback to: " + recipient + " [" + options.subject + "]");
    return true;
  } catch (err2) {
    console.error("GmailApp.sendEmail fallback failed (" + err2.message + ")");
    errors.push("GmailApp: " + err2.message);
  }

  console.error("CRITICAL: Failed to dispatch email to " + recipient + ". Errors: " + errors.join(" | "));
  return false;
}

/**
 * Dispatches a formatted HTML notification email to the host.
 */
function sendHostNotificationEmail(data) {
  const rawPhone = String(data.phone).replace(/\D/g, "");
  const whatsappUrl = "https://wa.me/" + rawPhone;

  const subject = "🌴 New Reservation Request [" + data.bookingId + "] - " + data.guestName;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #2E5A44; border-radius: 8px; overflow: hidden; background: #FFFAF5;">
      <div style="background: #2E5A44; color: #FFFFFF; padding: 24px; text-align: center;">
        <h2 style="margin: 0; font-size: 22px; letter-spacing: 1px;">Elephant Beach Villa</h2>
        <p style="margin: 6px 0 0; color: #C5A880; font-size: 13px; text-transform: uppercase; letter-spacing: 2px;">Komari, Arugam Bay Region · Sri Lanka</p>
      </div>

      <div style="padding: 24px; color: #1A202C; line-height: 1.6;">
        <div style="background: #FFF; border: 1px solid #E2E8F0; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
          <span style="display: inline-block; background: #C5A880; color: #000; font-size: 11px; font-weight: bold; padding: 3px 10px; border-radius: 12px; text-transform: uppercase;">
            Pending Host Verification
          </span>
          <h3 style="margin: 10px 0 0; color: #2E5A44;">Reservation Request: ${data.bookingId}</h3>
          <p style="margin: 4px 0 0; font-size: 13px; color: #5C6B62;">Public website calendars remain open until you confirm this booking.</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 10px 0; font-weight: bold; color: #2E5A44; width: 40%;">Guest Name:</td>
            <td style="padding: 10px 0;">${data.guestName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 10px 0; font-weight: bold; color: #2E5A44;">Phone / WhatsApp:</td>
            <td style="padding: 10px 0;">
              ${data.phone}
              <span style="margin-left: 8px;">
                <a href="${whatsappUrl}" target="_blank" style="background: #25D366; color: white; text-decoration: none; padding: 3px 10px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                  Chat on WhatsApp
                </a>
              </span>
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 10px 0; font-weight: bold; color: #2E5A44;">Email Address:</td>
            <td style="padding: 10px 0;"><a href="mailto:${data.email}" style="color: #2E5A44;">${data.email}</a></td>
          </tr>
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 10px 0; font-weight: bold; color: #2E5A44;">Selected Accommodation:</td>
            <td style="padding: 10px 0; font-weight: bold;">${data.rooms}</td>
          </tr>
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 10px 0; font-weight: bold; color: #2E5A44;">Check-In & Check-Out:</td>
            <td style="padding: 10px 0;"><strong>${data.checkIn}</strong> to <strong>${data.checkOut}</strong> (${data.totalNights} Night${data.totalNights > 1 ? 's' : ''})</td>
          </tr>
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 10px 0; font-weight: bold; color: #2E5A44;">Guest Count:</td>
            <td style="padding: 10px 0;">${data.guestsCount} Guests</td>
          </tr>
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 10px 0; font-weight: bold; color: #2E5A44;">Special Requests:</td>
            <td style="padding: 10px 0; color: #4A5568;">${data.specialRequests || 'None'}</td>
          </tr>
        </table>

        <div style="text-align: center; margin: 28px 0 10px;">
          <a href="${data.spreadsheetUrl}" target="_blank" style="background: #2E5A44; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 25px; font-weight: bold; font-size: 14px; display: inline-block;">
            Open Google Spreadsheet to Verify & Confirm
          </a>
        </div>
        <p style="font-size: 12px; color: #718096; text-align: center; margin-top: 12px;">
          To block dates on the website calendar, simply change this booking's Status cell in Google Sheets to <strong>Confirmed</strong>.
        </p>
      </div>

      <div style="background: #EAE6DF; padding: 14px; text-align: center; font-size: 12px; color: #5C6B62;">
        Elephant Beach Villa Direct Booking Gateway · Komari, Eastern Province, Sri Lanka
      </div>
    </div>
  `;

  return safeSendEmail({
    to: HOST_EMAIL,
    subject: subject,
    htmlBody: htmlBody
  });
}

/**
 * Dispatches a formatted HTML confirmation email to the guest when booking request is initially received.
 */
function sendGuestConfirmationEmail(data) {
  if (!data.email || !data.email.includes("@")) return;

  const tpl = EMAIL_TEMPLATES.bookingReceived;
  const subject = fillTemplateString(tpl.subject, data);
  const badgeText = tpl.badgeText;
  const heading = fillTemplateString(tpl.heading, data);
  const subheading = fillTemplateString(tpl.subheading, data);
  const summaryTitle = tpl.summaryTitle;
  const whatsappButtonText = tpl.whatsappButtonText;
  const whatsappUrl = tpl.whatsappUrl;
  const footerNotice = tpl.footerNotice;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #C5A059; border-radius: 10px; overflow: hidden; background: #FFFAF5;">
      <div style="background: #183124; color: #FFFFFF; padding: 26px 22px; text-align: center;">
        <h2 style="margin: 0; font-family: Georgia, serif; font-size: 24px; letter-spacing: 1px; color: #FFFFFF;">Elephant Beach Villa</h2>
        <p style="margin: 6px 0 0; color: #C5A059; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Komari, Arugam Bay Region · Sri Lanka</p>
      </div>

      <div style="padding: 24px 22px; color: #1A202C; line-height: 1.6;">
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; padding: 16px 18px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #C5A059;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
            <span style="display: inline-block; background: rgba(197, 160, 89, 0.2); color: #183124; font-size: 11px; font-weight: bold; padding: 3px 10px; border-radius: 12px; text-transform: uppercase;">
              ${badgeText}
            </span>
            <span style="font-size: 12px; color: #718096; font-weight: 600;">Ref: ${data.bookingId}</span>
          </div>
          <h3 style="margin: 10px 0 0; color: #183124; font-size: 18px;">${heading}</h3>
          <p style="margin: 6px 0 0; font-size: 13.5px; color: #4A5568;">
            ${subheading}
          </p>
        </div>

        <h4 style="margin: 0 0 10px; color: #183124; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">${summaryTitle}</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 13.5px; margin-bottom: 20px;">
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 9px 0; font-weight: 600; color: #183124; width: 40%;">Accommodation:</td>
            <td style="padding: 9px 0; font-weight: 600; color: #2D3748;">${data.rooms}</td>
          </tr>
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 9px 0; font-weight: 600; color: #183124;">Check-In:</td>
            <td style="padding: 9px 0;"><strong>${data.checkIn}</strong></td>
          </tr>
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 9px 0; font-weight: 600; color: #183124;">Check-Out:</td>
            <td style="padding: 9px 0;"><strong>${data.checkOut}</strong> (${data.totalNights} Night${data.totalNights > 1 ? 's' : ''})</td>
          </tr>
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 9px 0; font-weight: 600; color: #183124;">Guest Allocation:</td>
            <td style="padding: 9px 0;">${data.guestsCount}</td>
          </tr>
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 9px 0; font-weight: 600; color: #183124;">Contact Phone:</td>
            <td style="padding: 9px 0;">${data.phone}</td>
          </tr>
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 9px 0; font-weight: 600; color: #183124;">Special Requests:</td>
            <td style="padding: 9px 0; color: #4A5568;">${data.specialRequests || 'None'}</td>
          </tr>
        </table>

        <div style="background: rgba(24, 49, 36, 0.05); border: 1px solid rgba(24, 49, 36, 0.12); border-radius: 8px; padding: 14px; margin-bottom: 20px; text-align: center;">
          <p style="margin: 0 0 10px; font-size: 13px; color: #2D3748;">
            Have questions or want immediate confirmation? Chat directly with Host Neesha:
          </p>
          <a href="${whatsappUrl}" target="_blank" style="background: #25D366; color: #FFFFFF; text-decoration: none; padding: 9px 20px; border-radius: 20px; font-weight: bold; font-size: 13px; display: inline-block;">
            ${whatsappButtonText}
          </a>
        </div>

        <p style="font-size: 12px; color: #718096; line-height: 1.5; margin: 0;">
          <strong>Location:</strong> Light House Road, Komari, Arugam Bay Region, Eastern Province, Sri Lanka<br/>
          <strong>Email:</strong> elephantbeachvilla@gmail.com | <strong>Phone:</strong> +94 77 218 6718
        </p>
      </div>

      <div style="background: #EFEBE5; padding: 12px; text-align: center; font-size: 11.5px; color: #5C6B62;">
        ${footerNotice}
      </div>
    </div>
  `;

  return safeSendEmail({
    to: data.email,
    subject: subject,
    htmlBody: htmlBody
  });
}

/**
 * Dispatches an automated Confirmed Reservation HTML email to the guest.
 * Triggered automatically when Admin changes Status to "Confirmed" in Google Sheets or via API.
 */
function sendGuestBookingConfirmedEmail(data) {
  if (!data.email || !data.email.includes("@")) return;

  const tpl = EMAIL_TEMPLATES.bookingConfirmed;
  const subject = fillTemplateString(tpl.subject, data);
  const badgeText = tpl.badgeText;
  const heading = fillTemplateString(tpl.heading, data);
  const subheading = fillTemplateString(tpl.subheading, data);
  const summaryTitle = tpl.summaryTitle;
  const arrivalTitle = tpl.arrivalNotesTitle;
  const arrivalText = fillTemplateString(tpl.arrivalNotesText, data);
  const whatsappButtonText = tpl.whatsappButtonText;
  const whatsappUrl = tpl.whatsappUrl;
  const footerNotice = tpl.footerNotice;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1.5px solid #15803D; border-radius: 10px; overflow: hidden; background: #FFFAF5;">
      <div style="background: #183124; color: #FFFFFF; padding: 26px 22px; text-align: center;">
        <h2 style="margin: 0; font-family: Georgia, serif; font-size: 24px; letter-spacing: 1px; color: #FFFFFF;">Elephant Beach Villa</h2>
        <p style="margin: 6px 0 0; color: #C5A059; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Komari, Arugam Bay Region · Sri Lanka</p>
      </div>

      <div style="padding: 24px 22px; color: #1A202C; line-height: 1.6;">
        <div style="background: #FFFFFF; border: 1px solid #BBF7D0; padding: 16px 18px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #15803D;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
            <span style="display: inline-block; background: rgba(21, 128, 61, 0.15); color: #15803D; font-size: 11px; font-weight: bold; padding: 3px 10px; border-radius: 12px; text-transform: uppercase;">
              ${badgeText}
            </span>
            <span style="font-size: 12px; color: #718096; font-weight: 600;">Ref: ${data.bookingId}</span>
          </div>
          <h3 style="margin: 10px 0 0; color: #183124; font-size: 18px;">${heading}</h3>
          <p style="margin: 6px 0 0; font-size: 13.5px; color: #2D3748;">
            ${subheading}
          </p>
        </div>

        <h4 style="margin: 0 0 10px; color: #183124; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">${summaryTitle}</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 13.5px; margin-bottom: 20px;">
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 9px 0; font-weight: 600; color: #183124; width: 40%;">Accommodation:</td>
            <td style="padding: 9px 0; font-weight: 600; color: #2D3748;">${data.rooms}</td>
          </tr>
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 9px 0; font-weight: 600; color: #183124;">Check-In:</td>
            <td style="padding: 9px 0;"><strong style="color: #15803D;">${data.checkIn}</strong></td>
          </tr>
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 9px 0; font-weight: 600; color: #183124;">Check-Out:</td>
            <td style="padding: 9px 0;"><strong style="color: #15803D;">${data.checkOut}</strong> (${data.totalNights} Night${data.totalNights > 1 ? 's' : ''})</td>
          </tr>
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 9px 0; font-weight: 600; color: #183124;">Guest Allocation:</td>
            <td style="padding: 9px 0;">${data.guestsCount}</td>
          </tr>
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 9px 0; font-weight: 600; color: #183124;">Contact Phone:</td>
            <td style="padding: 9px 0;">${data.phone}</td>
          </tr>
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 9px 0; font-weight: 600; color: #183124;">Special Requests:</td>
            <td style="padding: 9px 0; color: #4A5568;">${data.specialRequests || 'None'}</td>
          </tr>
        </table>

        <!-- Check-in & Arrival Information Box -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px;">
          <h5 style="margin: 0 0 6px; color: #183124; font-size: 13px; font-weight: bold; text-transform: uppercase;">${arrivalTitle}</h5>
          <p style="margin: 0; font-size: 13px; color: #4A5568; line-height: 1.5;">
            ${arrivalText}
          </p>
        </div>

        <div style="background: rgba(24, 49, 36, 0.05); border: 1px solid rgba(24, 49, 36, 0.12); border-radius: 8px; padding: 14px; margin-bottom: 20px; text-align: center;">
          <p style="margin: 0 0 10px; font-size: 13px; color: #2D3748;">
            Connect with Host Neesha directly on WhatsApp for transfers, arrival times, and safari bookings:
          </p>
          <a href="${whatsappUrl}" target="_blank" style="background: #25D366; color: #FFFFFF; text-decoration: none; padding: 9px 20px; border-radius: 20px; font-weight: bold; font-size: 13px; display: inline-block;">
            ${whatsappButtonText}
          </a>
        </div>

        <p style="font-size: 12px; color: #718096; line-height: 1.5; margin: 0;">
          <strong>Location:</strong> Light House Road, Komari, Arugam Bay Region, Eastern Province, Sri Lanka<br/>
          <strong>Email:</strong> elephantbeachvilla@gmail.com | <strong>Phone:</strong> +94 77 218 6718
        </p>
      </div>

      <div style="background: #EFEBE5; padding: 12px; text-align: center; font-size: 11.5px; color: #5C6B62;">
        ${footerNotice}
      </div>
    </div>
  `;

  return safeSendEmail({
    to: data.email,
    subject: subject,
    htmlBody: htmlBody
  });
}

/**
 * Dispatches an automated Cancelled Reservation HTML email to the guest.
 * Triggered automatically when Admin changes Status to "Cancelled" in Google Sheets or via API.
 */
function sendGuestBookingCancelledEmail(data) {
  if (!data.email || !data.email.includes("@")) return;

  const tpl = EMAIL_TEMPLATES.bookingCancelled;
  const subject = fillTemplateString(tpl.subject, data);
  const badgeText = tpl.badgeText;
  const heading = fillTemplateString(tpl.heading, data);
  const subheading = fillTemplateString(tpl.subheading, data);
  const summaryTitle = tpl.summaryTitle;
  const cancellationTitle = tpl.cancellationNotesTitle;
  const cancellationText = fillTemplateString(tpl.cancellationNotesText, data);
  const whatsappButtonText = tpl.whatsappButtonText;
  const whatsappUrl = tpl.whatsappUrl;
  const footerNotice = tpl.footerNotice;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1.5px solid #B91C1C; border-radius: 10px; overflow: hidden; background: #FFFAF5;">
      <div style="background: #183124; color: #FFFFFF; padding: 26px 22px; text-align: center;">
        <h2 style="margin: 0; font-family: Georgia, serif; font-size: 24px; letter-spacing: 1px; color: #FFFFFF;">Elephant Beach Villa</h2>
        <p style="margin: 6px 0 0; color: #C5A059; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Komari, Arugam Bay Region · Sri Lanka</p>
      </div>

      <div style="padding: 24px 22px; color: #1A202C; line-height: 1.6;">
        <div style="background: #FFFFFF; border: 1px solid #FECACA; padding: 16px 18px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #B91C1C;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
            <span style="display: inline-block; background: rgba(185, 28, 28, 0.15); color: #B91C1C; font-size: 11px; font-weight: bold; padding: 3px 10px; border-radius: 12px; text-transform: uppercase;">
              ${badgeText}
            </span>
            <span style="font-size: 12px; color: #718096; font-weight: 600;">Ref: ${data.bookingId}</span>
          </div>
          <h3 style="margin: 10px 0 0; color: #B91C1C; font-size: 18px;">${heading}</h3>
          <p style="margin: 6px 0 0; font-size: 13.5px; color: #4A5568;">
            ${subheading}
          </p>
        </div>

        <h4 style="margin: 0 0 10px; color: #183124; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">${summaryTitle}</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 13.5px; margin-bottom: 20px;">
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 9px 0; font-weight: 600; color: #183124; width: 40%;">Accommodation:</td>
            <td style="padding: 9px 0; font-weight: 600; color: #2D3748;">${data.rooms}</td>
          </tr>
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 9px 0; font-weight: 600; color: #183124;">Cancelled Dates:</td>
            <td style="padding: 9px 0;">${data.checkIn} to ${data.checkOut} (${data.totalNights} Night${data.totalNights > 1 ? 's' : ''})</td>
          </tr>
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 9px 0; font-weight: 600; color: #183124;">Guest Allocation:</td>
            <td style="padding: 9px 0;">${data.guestsCount}</td>
          </tr>
        </table>

        <!-- Cancellation Notice Box -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px;">
          <h5 style="margin: 0 0 6px; color: #183124; font-size: 13px; font-weight: bold; text-transform: uppercase;">${cancellationTitle}</h5>
          <p style="margin: 0; font-size: 13px; color: #4A5568; line-height: 1.5;">
            ${cancellationText}
          </p>
        </div>

        <div style="background: rgba(24, 49, 36, 0.05); border: 1px solid rgba(24, 49, 36, 0.12); border-radius: 8px; padding: 14px; margin-bottom: 20px; text-align: center;">
          <p style="margin: 0 0 10px; font-size: 13px; color: #2D3748;">
            Have questions or want to rebook for future dates? Contact Host Neesha:
          </p>
          <a href="${whatsappUrl}" target="_blank" style="background: #25D366; color: #FFFFFF; text-decoration: none; padding: 9px 20px; border-radius: 20px; font-weight: bold; font-size: 13px; display: inline-block;">
            ${whatsappButtonText}
          </a>
        </div>

        <p style="font-size: 12px; color: #718096; line-height: 1.5; margin: 0;">
          <strong>Location:</strong> Light House Road, Komari, Arugam Bay Region, Eastern Province, Sri Lanka<br/>
          <strong>Email:</strong> elephantbeachvilla@gmail.com | <strong>Phone:</strong> +94 77 218 6718
        </p>
      </div>

      <div style="background: #EFEBE5; padding: 12px; text-align: center; font-size: 11.5px; color: #5C6B62;">
        ${footerNotice}
      </div>
    </div>
  `;

  return safeSendEmail({
    to: data.email,
    subject: subject,
    htmlBody: htmlBody
  });
}

/**
 * Setup Triggers: Installs the installable onEdit trigger for the spreadsheet.
 * CRITICAL: Google's security model forbids simple triggers (onEdit) from sending emails.
 * An Installable onEdit trigger executes under Host Neesha's Google account authority, allowing
 * automated emails to be sent whenever the status dropdown in the sheet is changed to Confirmed or Cancelled!
 */
function setupTriggers() {
  const ss = getSpreadsheet();
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    const fn = triggers[i].getHandlerFunction();
    if (fn === "installedSpreadsheetEdit" || fn === "handleSpreadsheetEdit") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  ScriptApp.newTrigger("installedSpreadsheetEdit")
    .forSpreadsheet(ss)
    .onEdit()
    .create();

  console.log("✓ Successfully installed onEdit trigger 'installedSpreadsheetEdit' with full email permissions!");

  try {
    SpreadsheetApp.getUi().alert(
      "🌴 Auto-Email Triggers Activated!",
      "Auto-email triggers are now successfully enabled for this Google Sheet.\n\n" +
      "When you change any reservation Status to 'Confirmed' or 'Cancelled' in Column 1, " +
      "the guest will automatically receive an official confirmation or cancellation email!",
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (uiErr) {}
}

/**
 * Action: contactInquiry
 * Logs general contact inquiries into "Inquiries" sheet and sends luxury-themed emails
 * to the host (elephantbeachvilla@gmail.com) and the guest.
 */
function handleContactInquiry(payload) {
  const ss = getSpreadsheet();
  let inquiriesSheet = ss.getSheetByName("Inquiries");
  if (!inquiriesSheet) {
    inquiriesSheet = ss.insertSheet("Inquiries");
    const headers = ["Timestamp", "Name", "Email", "Phone", "Subject", "Message"];
    inquiriesSheet.getRange(1, 1, 1, 6).setValues([headers]);
    inquiriesSheet.getRange(1, 1, 1, 6)
      .setBackground("#183124")
      .setFontColor("#FFFFFF")
      .setFontWeight("bold");
    inquiriesSheet.setFrozenRows(1);
  }

  const timestamp = Utilities.formatDate(new Date(), TIME_ZONE, "yyyy-MM-dd HH:mm:ss");
  const name = (payload.name || "Guest").trim();
  const email = (payload.email || "").trim();
  const phone = (payload.phone || "").trim();
  const subject = (payload.subject || "General Inquiry").trim();
  const message = (payload.message || "").trim();

  // Prevent Google Sheets arithmetic formula error on phone
  const cleanPhone = phone.replace(/^['"]*/, '').trim();
  const phoneForSheet = cleanPhone ? ("'" + cleanPhone) : "";

  inquiriesSheet.appendRow([timestamp, name, email, phoneForSheet, subject, message]);
  try {
    inquiriesSheet.getRange(inquiriesSheet.getLastRow(), 4).setNumberFormat('@').setValue(phoneForSheet);
  } catch (e) {}

  const inquiryData = {
    name: name,
    email: email,
    phone: cleanPhone,
    subject: subject,
    message: message,
    timestamp: timestamp,
    spreadsheetUrl: "https://docs.google.com/spreadsheets/d/" + SPREADSHEET_ID + "/edit#gid=" + inquiriesSheet.getSheetId()
  };

  // 1. Send luxury-themed notification email to host at elephantbeachvilla@gmail.com
  try {
    sendHostInquiryEmail(inquiryData);
  } catch (err) {
    console.warn("Error sending host inquiry email:", err);
  }

  // 2. Send matching luxury confirmation receipt to guest
  if (email && email.includes("@")) {
    try {
      sendGuestInquiryReceiptEmail(inquiryData);
    } catch (err) {
      console.warn("Error sending guest inquiry receipt email:", err);
    }
  }

  return createJsonResponse({
    status: "success",
    message: "The message has been successfully sent."
  });
}

/**
 * Dispatches a luxury-formatted HTML notification email for direct messages to the host at elephantbeachvilla@gmail.com.
 * Matches the exact same emerald (#183124) & gold (#C5A059) theme as booking notifications.
 */
function sendHostInquiryEmail(data) {
  const rawPhone = String(data.phone || "").replace(/\D/g, "");
  const whatsappUrl = rawPhone ? ("https://wa.me/" + rawPhone) : "";

  const tpl = EMAIL_TEMPLATES.inquiryHostNotification;
  const subject = fillTemplateString(tpl.subject, { guestName: data.name, subject: data.subject });
  const badgeText = tpl.badgeText;
  const heading = fillTemplateString(tpl.heading, { guestName: data.name, subject: data.subject });
  const subheading = fillTemplateString(tpl.subheading, { guestName: data.name, subject: data.subject });
  const summaryTitle = tpl.summaryTitle;
  const footerNotice = tpl.footerNotice;

  const safeName = escapeHtmlGAS(data.name);
  const safeEmail = escapeHtmlGAS(data.email);
  const safePhone = escapeHtmlGAS(data.phone);
  const safeSubject = escapeHtmlGAS(data.subject);
  const safeMessage = escapeHtmlGAS(data.message);

  const htmlBody = `
    <div style="font-family: Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; border: 1.5px solid #C5A059; border-radius: 10px; overflow: hidden; background: #FFFAF5;">
      <!-- Signature Emerald Header -->
      <div style="background: #183124; color: #FFFFFF; padding: 26px 22px; text-align: center;">
        <h2 style="margin: 0; font-family: Georgia, 'Playfair Display', serif; font-size: 24px; letter-spacing: 1.5px; color: #FFFFFF; font-weight: 700;">Elephant Beach Villa</h2>
        <p style="margin: 6px 0 0; color: #C5A059; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">Komari, Arugam Bay Region · Sri Lanka</p>
      </div>

      <!-- Main Content -->
      <div style="padding: 24px 22px; color: #1A202C; line-height: 1.6;">
        <!-- Status Card with Gold Accent -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; padding: 16px 18px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #C5A059;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
            <span style="display: inline-block; background: rgba(197, 160, 89, 0.2); color: #183124; font-size: 11px; font-weight: bold; padding: 3px 10px; border-radius: 12px; text-transform: uppercase;">
              ${badgeText}
            </span>
            <span style="font-size: 12px; color: #718096; font-weight: 600;">${data.timestamp}</span>
          </div>
          <h3 style="margin: 10px 0 0; color: #183124; font-size: 18px;">${heading}: ${safeSubject}</h3>
          <p style="margin: 6px 0 0; font-size: 13.5px; color: #4A5568;">
            ${subheading}
          </p>
        </div>

        <!-- Sender & Inquiry Details Table -->
        <h4 style="margin: 0 0 10px; color: #183124; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">${summaryTitle}</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 13.5px; margin-bottom: 20px;">
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 10px 0; font-weight: 600; color: #183124; width: 38%;">Sender Name:</td>
            <td style="padding: 10px 0; font-weight: 600; color: #2D3748;">${safeName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 10px 0; font-weight: 600; color: #183124;">Email Address:</td>
            <td style="padding: 10px 0;">
              <a href="mailto:${safeEmail}?subject=Re: [Elephant Beach Villa] ${encodeURIComponent(data.subject)}" style="color: #2E5A44; font-weight: 600; text-decoration: none;">
                ${safeEmail}
              </a>
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 10px 0; font-weight: 600; color: #183124;">Phone / WhatsApp:</td>
            <td style="padding: 10px 0; color: #2D3748;">
              ${safePhone ? safePhone : '<span style="color: #A0AEC0;">Not provided</span>'}
              ${rawPhone ? `
                <span style="margin-left: 8px;">
                  <a href="${whatsappUrl}" target="_blank" style="background: #25D366; color: #FFFFFF; text-decoration: none; padding: 3px 10px; border-radius: 4px; font-size: 11.5px; font-weight: bold; display: inline-block;">
                    💬 Chat on WhatsApp
                  </a>
                </span>
              ` : ''}
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 10px 0; font-weight: 600; color: #183124;">Inquiry Topic:</td>
            <td style="padding: 10px 0; font-weight: 600; color: #C5A059;">${safeSubject}</td>
          </tr>
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 10px 0; font-weight: 600; color: #183124;">Logged At:</td>
            <td style="padding: 10px 0; color: #4A5568;">${data.timestamp} (Sri Lanka Time)</td>
          </tr>
        </table>

        <!-- Highlighted Message Box -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px 18px; margin-bottom: 20px; border-left: 4px solid #183124;">
          <h5 style="margin: 0 0 8px; color: #183124; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Message Content</h5>
          <div style="font-size: 14px; color: #2D3748; line-height: 1.65; white-space: pre-wrap;">${safeMessage}</div>
        </div>

        <!-- Quick Response Action Box -->
        <div style="background: rgba(24, 49, 36, 0.05); border: 1px solid rgba(24, 49, 36, 0.12); border-radius: 8px; padding: 16px; margin-bottom: 20px; text-align: center;">
          <p style="margin: 0 0 12px; font-size: 13px; color: #2D3748; font-weight: 600;">
            Quick Actions to Respond to ${safeName}:
          </p>
          <div>
            <a href="mailto:${safeEmail}?subject=Re: [Elephant Beach Villa] ${encodeURIComponent(data.subject)}" target="_blank" style="background: #183124; color: #FFFFFF; text-decoration: none; padding: 10px 20px; border-radius: 20px; font-weight: bold; font-size: 13px; display: inline-block; margin: 4px;">
              ✉️ Reply via Email
            </a>
            ${rawPhone ? `
              <a href="${whatsappUrl}" target="_blank" style="background: #25D366; color: #FFFFFF; text-decoration: none; padding: 10px 20px; border-radius: 20px; font-weight: bold; font-size: 13px; display: inline-block; margin: 4px;">
                💬 Chat on WhatsApp
              </a>
            ` : ''}
            <a href="${data.spreadsheetUrl}" target="_blank" style="background: #C5A059; color: #000000; text-decoration: none; padding: 10px 20px; border-radius: 20px; font-weight: bold; font-size: 13px; display: inline-block; margin: 4px;">
              📊 Open Google Sheet
            </a>
          </div>
        </div>

        <!-- Property Contact Details -->
        <p style="font-size: 12px; color: #718096; line-height: 1.5; margin: 0; text-align: center;">
          <strong>Elephant Beach Villa</strong> · Selvapuram Village Road, Komari, Eastern Province, Sri Lanka<br/>
          <strong>Host Email:</strong> elephantbeachvilla@gmail.com | <strong>Phone:</strong> +94 77 218 6718
        </p>
      </div>

      <!-- Sub-footer -->
      <div style="background: #EFEBE5; padding: 12px; text-align: center; font-size: 11.5px; color: #5C6B62;">
        ${footerNotice}
      </div>
    </div>
  `;

  return safeSendEmail({
    to: HOST_EMAIL,
    subject: subject,
    htmlBody: htmlBody
  });
}

/**
 * Dispatches an automated HTML receipt to the guest acknowledging their direct message.
 * Formatted in the identical luxury emerald and gold villa theme.
 */
function sendGuestInquiryReceiptEmail(data) {
  if (!data.email || !data.email.includes("@")) return;

  const tpl = EMAIL_TEMPLATES.inquiryGuestReceipt;
  const subject = fillTemplateString(tpl.subject, { guestName: data.name, subject: data.subject });
  const whatsappUrl = tpl.whatsappUrl;
  const whatsappButtonText = tpl.whatsappButtonText;
  const footerNotice = tpl.footerNotice;

  const safeName = escapeHtmlGAS(data.name);
  const safeSubject = escapeHtmlGAS(data.subject);
  const safeMessage = escapeHtmlGAS(data.message);

  const htmlBody = `
    <div style="font-family: Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; border: 1.5px solid #C5A059; border-radius: 10px; overflow: hidden; background: #FFFAF5;">
      <!-- Signature Villa Header -->
      <div style="background: #183124; color: #FFFFFF; padding: 26px 22px; text-align: center;">
        <h2 style="margin: 0; font-family: Georgia, 'Playfair Display', serif; font-size: 24px; letter-spacing: 1.5px; color: #FFFFFF; font-weight: 700;">Elephant Beach Villa</h2>
        <p style="margin: 6px 0 0; color: #C5A059; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">Komari, Arugam Bay Region · Sri Lanka</p>
      </div>

      <!-- Main Content -->
      <div style="padding: 24px 22px; color: #1A202C; line-height: 1.6;">
        <!-- Status Card with Gold Accent Border -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; padding: 16px 18px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #C5A059;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
            <span style="display: inline-block; background: rgba(197, 160, 89, 0.2); color: #183124; font-size: 11px; font-weight: bold; padding: 3px 10px; border-radius: 12px; text-transform: uppercase;">
              ${tpl.badgeText}
            </span>
            <span style="font-size: 12px; color: #718096; font-weight: 600;">${data.timestamp}</span>
          </div>
          <h3 style="margin: 10px 0 0; color: #183124; font-size: 18px;">Thank You, ${safeName}!</h3>
          <p style="margin: 6px 0 0; font-size: 13.5px; color: #4A5568;">
            We have safely received your direct message regarding "<strong>${safeSubject}</strong>". Host Neesha and Caretaker Saman have been notified and will reply promptly via email or WhatsApp.
          </p>
        </div>

        <!-- Summary Table -->
        <h4 style="margin: 0 0 10px; color: #183124; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">${tpl.summaryTitle}</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 13.5px; margin-bottom: 20px;">
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 9px 0; font-weight: 600; color: #183124; width: 38%;">Name:</td>
            <td style="padding: 9px 0; font-weight: 600; color: #2D3748;">${safeName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 9px 0; font-weight: 600; color: #183124;">Inquiry Topic:</td>
            <td style="padding: 9px 0; font-weight: 600; color: #C5A059;">${safeSubject}</td>
          </tr>
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 9px 0; font-weight: 600; color: #183124;">Contact Email:</td>
            <td style="padding: 9px 0; color: #2D3748;">${escapeHtmlGAS(data.email)}</td>
          </tr>
          ${data.phone ? `
            <tr style="border-bottom: 1px solid #E2E8F0;">
              <td style="padding: 9px 0; font-weight: 600; color: #183124;">Contact Phone:</td>
              <td style="padding: 9px 0; color: #2D3748;">${escapeHtmlGAS(data.phone)}</td>
            </tr>
          ` : ''}
        </table>

        <!-- Message Preview Box -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px;">
          <h5 style="margin: 0 0 6px; color: #183124; font-size: 13px; font-weight: bold; text-transform: uppercase;">Message Sent:</h5>
          <p style="margin: 0; font-size: 13px; color: #4A5568; line-height: 1.6; white-space: pre-wrap;">
            ${safeMessage}
          </p>
        </div>

        <!-- WhatsApp Urgent Help Box -->
        <div style="background: rgba(24, 49, 36, 0.05); border: 1px solid rgba(24, 49, 36, 0.12); border-radius: 8px; padding: 14px; margin-bottom: 20px; text-align: center;">
          <p style="margin: 0 0 10px; font-size: 13px; color: #2D3748;">
            Need urgent assistance, directions, or airport taxi pickup guidance right now?
          </p>
          <a href="${whatsappUrl}" target="_blank" style="background: #25D366; color: #FFFFFF; text-decoration: none; padding: 9px 20px; border-radius: 20px; font-weight: bold; font-size: 13px; display: inline-block;">
            ${whatsappButtonText}
          </a>
        </div>

        <!-- Property Details -->
        <p style="font-size: 12px; color: #718096; line-height: 1.5; margin: 0; text-align: center;">
          <strong>Location:</strong> Light House Road, Selvapuram, Komari, Arugam Bay Region, Eastern Province, Sri Lanka<br/>
          <strong>Email:</strong> elephantbeachvilla@gmail.com | <strong>Phone:</strong> +94 77 218 6718
        </p>
      </div>

      <!-- Sub-footer Banner -->
      <div style="background: #EFEBE5; padding: 12px; text-align: center; font-size: 11.5px; color: #5C6B62;">
        ${footerNotice}
      </div>
    </div>
  `;

  return safeSendEmail({
    to: data.email,
    subject: subject,
    htmlBody: htmlBody
  });
}

/**
 * Scans Column 6 (Phone) of the Bookings sheet and repairs any "#ERROR!" formulas
 * or values corrupted by leading '+' arithmetic evaluation.
 */
function repairPhoneErrors(bookingsSheet) {
  if (!bookingsSheet) {
    const ss = getSpreadsheet();
    bookingsSheet = ss.getSheetByName("Bookings");
  }
  if (!bookingsSheet) return 0;

  const lastRow = bookingsSheet.getLastRow();
  if (lastRow <= 1) return 0;

  const headerMap = getSheetHeaderMap(bookingsSheet);
  const phoneCol = headerMap["phone"] || headerMap["guestphone"] || 6;

  // Ensure column is formatted as plain text
  try {
    bookingsSheet.getRange(2, phoneCol, lastRow - 1, 1).setNumberFormat('@');
  } catch (e) {}

  const range = bookingsSheet.getRange(2, phoneCol, lastRow - 1, 1);
  const values = range.getValues();
  const formulas = range.getFormulas();

  let repairedCount = 0;

  for (let i = 0; i < values.length; i++) {
    const r = i + 2;
    const val = String(values[i][0] || "").trim();
    const formula = String(formulas[i][0] || "").trim();

    if (val === "#ERROR!" || val.includes("ERROR") || formula.startsWith("=") || formula.startsWith("+")) {
      let recovered = formula.replace(/^[=+]+/, "").trim();
      if (!recovered) {
        recovered = val.replace(/^#ERROR!/i, "").trim();
      }
      if (recovered) {
        if (!recovered.startsWith("+")) recovered = "+" + recovered;
        bookingsSheet.getRange(r, phoneCol).setNumberFormat('@').setValue("'" + recovered);
        repairedCount++;
      }
    } else if (val.startsWith("+") && !formula) {
      bookingsSheet.getRange(r, phoneCol).setNumberFormat('@').setValue("'" + val);
    }
  }

  console.log("repairPhoneErrors completed. Repaired cells: " + repairedCount);
  return repairedCount;
}

/**
 * Setup Function: Run once from the Apps Script editor.
 * Initializes Sheet 1 ("RoomAvailability") and Sheet 2 ("Bookings") with
 * matching columns, luxury styling, frozen header rows, and data validation rules.
 */
function setupSpreadsheet() {
  const ss = getSpreadsheet();

  // 1. Setup "RoomAvailability"
  let availabilitySheet = ss.getSheetByName("RoomAvailability");
  if (!availabilitySheet) {
    availabilitySheet = ss.insertSheet("RoomAvailability");
  }

  const availabilityHeaders = ["Date (YYYY-MM-DD)", "Room1", "Room2", "Room3", "Room4"];
  availabilitySheet.getRange(1, 1, 1, 5).setValues([availabilityHeaders]);
  availabilitySheet.getRange(1, 1, 1, 5)
    .setBackground("#2E5A44")
    .setFontColor("#FFFFFF")
    .setFontWeight("bold")
    .setFontFamily("Trebuchet MS")
    .setHorizontalAlignment("center");
  availabilitySheet.setFrozenRows(1);
  availabilitySheet.setColumnWidth(1, 140);
  availabilitySheet.setColumnWidth(2, 100);
  availabilitySheet.setColumnWidth(3, 100);
  availabilitySheet.setColumnWidth(4, 100);
  availabilitySheet.setColumnWidth(5, 100);

  // 2. Setup "Bookings"
  let bookingsSheet = ss.getSheetByName("Bookings");
  if (!bookingsSheet) {
    bookingsSheet = ss.insertSheet("Bookings");
  }

  const bookingsHeaders = [
    "Status",
    "Timestamp",
    "BookingID",
    "Rooms",
    "GuestName",
    "Phone",
    "Email",
    "CheckIn",
    "CheckOut",
    "TotalNights",
    "GuestsCount",
    "SpecialRequests"
  ];
  bookingsSheet.getRange(1, 1, 1, 12).setValues([bookingsHeaders]);
  bookingsSheet.getRange(1, 1, 1, 12)
    .setBackground("#2E5A44")
    .setFontColor("#FFFFFF")
    .setFontWeight("bold")
    .setFontFamily("Trebuchet MS")
    .setHorizontalAlignment("center");
  bookingsSheet.setFrozenRows(1);

  // Set column widths
  bookingsSheet.setColumnWidth(1, 160); // Status
  bookingsSheet.setColumnWidth(2, 150); // Timestamp
  bookingsSheet.setColumnWidth(3, 160); // BookingID
  bookingsSheet.setColumnWidth(4, 220); // Rooms
  bookingsSheet.setColumnWidth(5, 160); // GuestName
  bookingsSheet.setColumnWidth(6, 150); // Phone
  bookingsSheet.setColumnWidth(7, 200); // Email
  bookingsSheet.setColumnWidth(8, 110); // CheckIn
  bookingsSheet.setColumnWidth(9, 110); // CheckOut
  bookingsSheet.setColumnWidth(10, 100); // TotalNights
  bookingsSheet.setColumnWidth(11, 110); // GuestsCount
  bookingsSheet.setColumnWidth(12, 250); // SpecialRequests

  // Explicitly format Phone column (F) as Plain Text '@'
  bookingsSheet.getRange("F:F").setNumberFormat('@');

  // Apply Status validation across column 1 rows (rows 2 to 500)
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(STATUS_OPTIONS, true)
    .setAllowInvalid(false)
    .build();
  bookingsSheet.getRange(2, 1, 499, 1).setDataValidation(statusRule);

  // Automatically repair any existing formula errors in the Phone column
  repairPhoneErrors(bookingsSheet);

  console.log("Spreadsheet initialized successfully! 'RoomAvailability' and 'Bookings' tabs are ready.");
}
