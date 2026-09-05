/**
 * ============================================================================
 * ELEPHANT BEACH VILLA - CENTRALIZED MEDIA ASSET MANAGEMENT CONFIGURATION
 * ============================================================================
 * 
 * ARCHITECTURAL SUMMARY:
 * This file serves as the Single Source of Truth (SSOT) for all media assets
 * (images, videos, hero banners) across the entire Elephant Beach Villa website.
 * 
 * HOW TO USE GOOGLE DRIVE LINKS:
 * 1. Upload your photo or video to Google Drive.
 * 2. Right-click the file -> Click "Share" -> Set general access to "Anyone with the link can view".
 * 3. Copy the Google Drive share link (e.g. https://drive.google.com/file/d/1A2B3C.../view?usp=sharing).
 * 4. Paste it directly into the relevant property below in place of the Unsplash URL.
 * 
 * The built-in formatMediaUrl() engine will automatically extract the Google Drive FILE_ID
 * and transform it into a high-performance direct embed link:
 * https://lh3.googleusercontent.com/d/FILE_ID
 * 
 * STRUCTURE:
 * Page -> Section Number -> Element Key
 */

const SITE_MEDIA = {
  // Global & Brand Assets
  global: {
    logo: "https://drive.google.com/file/d/1kdBrNOmRZu4FQXIyeIK7onZe6m4X7vaG/view?usp=drive_link", // Official Elephant Beach Villa logo (paste Google Drive link or local asset path here)
    defaultHeroPlaceholder: "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1920&q=80"
  },

  // Page 1: Home Page (index.html)
  home: {
    section1_hero: {
      bgImage: "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1920&q=80"
    },
    section2_features: {
      desertedBeach: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80",
      wildElephants: "https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?auto=format&fit=crop&w=600&q=80",
      plungePool: "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=600&q=80",
      surfPoints: "https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=600&q=80"
    },
    section3_estate: {
      estateExterior: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80"
    },
    section4_banner: {
      bannerBg: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80"
    },
    section5_roomsSlider: {
      room1: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80",
      room2: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80",
      room3: "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80",
      room4: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80"
    },
    section6_reviewsParallax: {
      reviewsBg: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1920&q=80"
    }
  },

  // Page 2: About Page (about.html)
  about: {
    section1_hero: {
      bgImage: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80"
    },
    section2_details: {
      sandDunes: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80"
    },
    section2_villaSpace: {
      beachSandDunes: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80"
    },
    section3_banner: {
      bannerBg: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80"
    },
    section4_attractions: {
      surfPoints: "https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=600&q=80",
      nationalParks: "https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?auto=format&fit=crop&w=600&q=80",
      nationalParksElephants: "https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?auto=format&fit=crop&w=600&q=80",
      localCafes: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80",
      localDiningTransport: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80"
    }
  },

  // Page 3: Rooms & Suites Page (rooms.html)
  rooms: {
    section1_hero: {
      bgImage: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1920&q=80"
    },
    section2_largeRooms: {
      room3: "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80",
      room4: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80"
    },
    section3_banner: {
      bannerBg: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80"
    },
    section4_twinRooms: {
      room1: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80",
      room2: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80"
    }
  },

  // Page 4: Availability & Booking Page (availability.html)
  availability: {
    section1_hero: {
      bgImage: "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=1920&q=80"
    },
    section2_roomSelectorCards: {
      room1: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80",
      room2: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=600&q=80",
      room3: "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=600&q=80",
      room4: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=600&q=80"
    }
  },

  // Page 5: Gallery Page (gallery.html)
  gallery: {
    section1_hero: {
      bgImage: "https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=1920&q=80"
    },
    section2_grid: {
      beachDunes: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80",
      plungePool: "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=600&q=80",
      wildElephants: "https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?auto=format&fit=crop&w=600&q=80",
      room1: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80",
      room3: "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=600&q=80",
      verandahDining: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80",
      verandah: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80"
    },
    section3_banner: {
      bannerBg: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80"
    }
  },

  // Page 6: Contact Page (contact.html)
  contact: {
    section1_hero: {
      bgImage: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1920&q=80"
    },
    section3_banner: {
      bannerBg: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80"
    }
  }
};

/**
 * GOOGLE DRIVE LINK PARSER & FORMATTER HELPER
 * Converts Google Drive sharing links into direct-embed image/media URLs.
 * 
 * Supports all standard Google Drive formats:
 * - https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 * - https://drive.google.com/file/d/FILE_ID/view
 * - https://drive.google.com/open?id=FILE_ID
 * - https://drive.google.com/uc?id=FILE_ID&export=view
 * - https://drive.google.com/uc?export=view&id=FILE_ID
 * - https://drive.google.com/d/FILE_ID
 * 
 * Direct format produced: https://lh3.googleusercontent.com/d/FILE_ID
 */
function formatMediaUrl(url) {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  // Check if it is a Google Drive URL
  if (trimmed.includes("drive.google.com") || trimmed.includes("docs.google.com")) {
    const fileIdMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                        trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
                        trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
    
    if (fileIdMatch && fileIdMatch[1]) {
      const fileId = fileIdMatch[1];
      // lh3.googleusercontent.com is Google's fast high-availability CDN direct image stream
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }
  }

  // If already a direct link (e.g. Unsplash, CDN, or custom host), return as is
  return trimmed;
}

/**
 * Helper to resolve nested object path (e.g. "home.section2_features.desertedBeach")
 */
function resolveMediaPath(path) {
  if (!path || typeof path !== "string") return null;
  const parts = path.split(".");
  let current = SITE_MEDIA;
  for (let i = 0; i < parts.length; i++) {
    const key = parts[i];
    if (current && Object.prototype.hasOwnProperty.call(current, key)) {
      current = current[key];
    } else {
      return null;
    }
  }
  return (typeof current === "string") ? current : null;
}

/**
 * DYNAMIC DOM INJECTION ENGINE
 * Scans all elements with [data-media="page.section.key"] and updates their
 * src, source, or background-image property.
 */
function applySiteMedia() {
  const mediaElements = document.querySelectorAll("[data-media]");
  mediaElements.forEach(el => {
    const mediaPath = el.getAttribute("data-media");
    if (!mediaPath) return;

    const rawUrl = resolveMediaPath(mediaPath);
    if (!rawUrl) return;

    const formattedUrl = formatMediaUrl(rawUrl);
    if (!formattedUrl) return;

    const tagName = el.tagName.toLowerCase();

    if (tagName === "img") {
      el.src = formattedUrl;
      // Clear srcset when a custom media link is supplied so the browser renders formattedUrl
      if (el.hasAttribute("srcset")) {
        el.removeAttribute("srcset");
      }
    } else if (tagName === "video") {
      let sourceEl = el.querySelector("source");
      if (!sourceEl) {
        sourceEl = document.createElement("source");
        el.appendChild(sourceEl);
      }
      sourceEl.src = formattedUrl;
      el.load();
    } else if (tagName === "source") {
      el.src = formattedUrl;
    } else {
      // Container element with background image (Hero, Parallax Banners, etc.)
      const isBanner = el.classList.contains("section-banner-bg") || el.classList.contains("section-reviews-parallax");
      const gradient = isBanner 
        ? "linear-gradient(0deg, rgba(0, 0, 0, 0.75) 0%, rgba(0, 0, 0, 0.85) 100%)"
        : "linear-gradient(180deg, rgba(0, 0, 0, 0.75) 0%, rgba(0, 0, 0, 0.85) 100%)";
      
      el.style.backgroundImage = `${gradient}, url('${formattedUrl}')`;
      el.style.backgroundPosition = "center";
      el.style.backgroundSize = "cover";
      el.style.backgroundRepeat = "no-repeat";
      el.style.backgroundAttachment = "fixed";
    }
  });
}

// Auto-run engine as soon as the DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", applySiteMedia);
} else {
  applySiteMedia();
}

/**
 * ============================================================================
 * CENTRALIZED EMAIL NOTIFICATION TEMPLATES CONFIGURATION
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
  }
};

// Expose globals for developer/admin access
SITE_MEDIA.emailTemplates = EMAIL_TEMPLATES;
window.EMAIL_TEMPLATES = EMAIL_TEMPLATES;
window.SITE_MEDIA = SITE_MEDIA;
window.formatMediaUrl = formatMediaUrl;
window.applySiteMedia = applySiteMedia;
