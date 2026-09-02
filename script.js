/* ==========================================================================
   ELEPHANT BEACH VILLA - ADVANCED MULTI-ROOM CALENDAR & STEPPER COUNTER
   Features:
   - Multi-Room Popover Selector in Homepage Hero Check Bar with Max Guests Badges
   - Automatic Synchronization of Homepage Selected Rooms to Availability Page
   - Disable & Block Past Dates across All Calendars and Date Pickers
   - Modern Stepper Counter (+ / -) for Guest Selection (Max 8 Guests)
   - 4 Separate Room Availability Calendars (Room 1, Room 2, Room 3, Room 4)
   - Dynamic Sync to "Selected Rooms" Input Field in Booking Form
   - Synchronized Date Range Picker with Middle Days In-Range Highlighting
   - Collision Detection for Pre-booked Dates Across Selected Rooms
   - Minimum 2 Nights Stay Enforcement
   - Admin Date Status Management Portal (PIN: 1234)
   ========================================================================== */

document.addEventListener("DOMContentLoaded", function () {
  initDateLimits();
  initMobileMenu();
  initGuestStepperCounter();
  initHeroMultiRoomSelector();
  initHeroCheckBar();
  initMultiRoomCalendar();
  initFormHandlers();
});

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

/* Mobile Navigation Drawer */
function initMobileMenu() {
  const mobileToggle = document.querySelector(".mobile-toggle");
  const navLeft = document.querySelector(".nav-left");
  const navRight = document.querySelector(".nav-right");

  if (mobileToggle) {
    mobileToggle.addEventListener("click", () => {
      if (navLeft) navLeft.classList.toggle("active");
      if (navRight) navRight.classList.toggle("active");
    });
  }
}

/* Modern Stepper Counter Widget (+ / - Buttons, Max 8 Guests) */
let guestCount = 2;

function initGuestStepperCounter() {
  const minusBtn = document.getElementById("guestMinusBtn");
  const plusBtn = document.getElementById("guestPlusBtn");
  const valueDisplay = document.getElementById("guestValueDisplay");

  if (minusBtn && plusBtn && valueDisplay) {
    minusBtn.addEventListener("click", () => {
      if (guestCount > 1) {
        guestCount--;
        valueDisplay.textContent = `${guestCount} Guest${guestCount > 1 ? 's' : ''}`;
      }
    });

    plusBtn.addEventListener("click", () => {
      if (guestCount < 8) {
        guestCount++;
        valueDisplay.textContent = `${guestCount} Guest${guestCount > 1 ? 's' : ''}`;
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

function initMultiRoomCalendar() {
  const multiCalendarContainer = document.getElementById("multiCalendarContainer");
  const roomCards = document.querySelectorAll(".room-select-card");
  const selectAllBtn = document.getElementById("selectAllVillaBtn");
  const validationAlert = document.getElementById("validationAlert");
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
  let adminPIN = "1234";

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Parse URL Parameters from Homepage Check Dates
  const urlParams = new URLSearchParams(window.location.search);
  const paramCheckIn = urlParams.get("checkIn");
  const paramCheckOut = urlParams.get("checkOut");
  const paramRooms = urlParams.get("rooms") || urlParams.get("room");

  if (paramCheckIn) {
    startDate = paramCheckIn;
    if (checkInInput) checkInInput.value = paramCheckIn;
  }
  if (paramCheckOut) {
    endDate = paramCheckOut;
    if (checkOutInput) checkOutInput.value = paramCheckOut;
  }

  // Synchronize Homepage Selected Rooms onto Availability Page Cards
  if (paramRooms) {
    if (paramRooms === "entire") {
      selectedRoomIds = new Set(["room1", "room2", "room3", "room4"]);
    } else {
      const roomArr = paramRooms.split(",");
      selectedRoomIds = new Set(roomArr);
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
    if (validationAlert) validationAlert.style.display = "none";
  }

  function renderAllCalendars() {
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
      const isBooked = room.bookedDates.has(dateStr);

      if (isPast) {
        dayCell.classList.add("past-date");
        dayCell.title = `${room.name} - Past Date (Not selectable)`;
      } else if (isBooked) {
        dayCell.classList.add("booked");
        dayCell.title = `${room.name} - Booked`;
      } else {
        dayCell.classList.add("available");
        dayCell.title = `${room.name} - Available`;
      }

      if (!isPast) {
        if (startDate && dateStr === startDate) {
          dayCell.classList.add("selected-start");
        } else if (endDate && dateStr === endDate) {
          dayCell.classList.add("selected-end");
        } else if (startDate && endDate && isDateInRange(dateStr, startDate, endDate)) {
          dayCell.classList.add("in-range");
        }

        dayCell.addEventListener("click", () => handleDateClick(dateStr));
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

  function handleDateClick(dateStr) {
    const clickedDateObj = new Date(dateStr);
    clickedDateObj.setHours(0, 0, 0, 0);
    const todayZero = getTodayZero();

    if (clickedDateObj < todayZero) {
      alert("Past dates cannot be selected.");
      return;
    }

    if (isAdminMode) {
      selectedRoomIds.forEach(roomId => {
        const room = ROOMS_DATA.find(r => r.id === roomId);
        if (room) {
          if (room.bookedDates.has(dateStr)) {
            room.bookedDates.delete(dateStr);
          } else {
            room.bookedDates.add(dateStr);
          }
        }
      });
      renderAllCalendars();
      return;
    }

    if (!startDate || (startDate && endDate)) {
      startDate = dateStr;
      endDate = null;
      if (validationAlert) validationAlert.style.display = "none";
    } else if (startDate && !endDate) {
      if (new Date(dateStr) < new Date(startDate)) {
        startDate = dateStr;
        endDate = null;
      } else {
        endDate = dateStr;

        const nights = Math.round((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
        if (nights < 2) {
          showValidationError("⚠️ Minimum 2 nights stay required for booking. Please select a longer date range.");
          endDate = null;
          renderAllCalendars();
          return;
        }

        const collisionRoom = checkBookedCollision(startDate, endDate);
        if (collisionRoom) {
          showValidationError(`⚠️ Cannot reserve: ${collisionRoom.name} has booked dates within your selected range (${startDate} to ${endDate}). Please pick open dates or deselect that room.`);
          resetDateSelection();
          renderAllCalendars();
          return;
        }
      }
    }

    if (checkInInput && startDate) checkInInput.value = startDate;
    if (checkOutInput && endDate) checkOutInput.value = endDate;

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
    if (validationAlert) {
      validationAlert.textContent = msg;
      validationAlert.style.display = "block";
    } else {
      alert(msg);
    }
  }

  const adminToggleBtn = document.getElementById("adminToggleBtn");
  const adminStatusBadge = document.getElementById("adminStatusBadge");

  if (adminToggleBtn) {
    adminToggleBtn.addEventListener("click", () => {
      if (!isAdminMode) {
        const pin = prompt("Enter Admin PIN to manage dates across selected room calendars (Default: 1234):");
        if (pin === adminPIN) {
          isAdminMode = true;
          adminToggleBtn.textContent = "Exit Admin Mode";
          if (adminStatusBadge) {
            adminStatusBadge.style.display = "inline-block";
            adminStatusBadge.textContent = "ADMIN MODE ACTIVE (Click dates to toggle Booked status)";
          }
          alert("Admin Mode Active! Clicking any calendar date will toggle its availability across selected rooms.");
        } else if (pin !== null) {
          alert("Incorrect Admin PIN.");
        }
      } else {
        isAdminMode = false;
        adminToggleBtn.textContent = "Admin Calendar Access";
        if (adminStatusBadge) adminStatusBadge.style.display = "none";
        alert("Exited Admin Mode.");
      }
    });
  }

  // Initial Sync & Render
  updateSelectedRoomsDisplay();
  renderAllCalendars();
}

/* Form Submit Handlers */
function initFormHandlers() {
  const bookingForms = document.querySelectorAll(".booking-form");

  bookingForms.forEach(form => {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      const checkInVal = form.querySelector("#checkInInput") ? form.querySelector("#checkInInput").value : null;
      const checkOutVal = form.querySelector("#checkOutInput") ? form.querySelector("#checkOutInput").value : null;

      const todayZero = getTodayZero();

      if (checkInVal) {
        const checkInDate = new Date(checkInVal);
        checkInDate.setHours(0, 0, 0, 0);
        if (checkInDate < todayZero) {
          alert("Check-in date cannot be in the past.");
          return;
        }
      }

      if (checkInVal && checkOutVal) {
        const nights = Math.round((new Date(checkOutVal) - new Date(checkInVal)) / (1000 * 60 * 60 * 24));
        if (nights < 2) {
          alert("Minimum 2 nights stay required for Elephant Beach Villa booking requests.");
          return;
        }
      }

      const submitBtn = form.querySelector("button[type='submit']");
      const originalText = submitBtn ? submitBtn.textContent : "Submit";

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Sending Request...";
      }

      setTimeout(() => {
        alert("Thank you! Your booking request for Elephant Beach Villa has been received. Host Neesha & Caretaker Saman will verify dates and reply shortly.");
        form.reset();
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      }, 1000);
    });
  });
}
