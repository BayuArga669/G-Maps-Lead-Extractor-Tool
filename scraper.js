/**
 * G-Maps Lead Extractor Tool
 * ==========================
 * Tool CLI untuk mengekstrak data komprehensif bisnis dari Google Maps:
 * Nama, Telepon, Rating, Jumlah Ulasan, Website, dan Kategori.
 *
 * Penggunaan: node scraper.js "Kata Kunci Pencarian"
 * Contoh:     node scraper.js "Percetakan di Surabaya"
 */

const { chromium } = require('playwright');
const { createObjectCsvWriter } = require('csv-writer');
const fs = require('fs');
const path = require('path');

// ─── ANSI Color Codes ───────────────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  bgCyan: '\x1b[46m',
  bgGreen: '\x1b[42m',
  white: '\x1b[37m',
};

// ─── Helper Functions ────────────────────────────────────────────────

/** Timestamp untuk logging */
function timestamp() {
  return `${C.dim}[${new Date().toLocaleTimeString('id-ID')}]${C.reset}`;
}

/** Log info */
function logInfo(msg) {
  console.log(`${timestamp()} ${C.cyan}ℹ${C.reset} ${msg}`);
}

/** Log success */
function logSuccess(msg) {
  console.log(`${timestamp()} ${C.green}✔${C.reset} ${msg}`);
}

/** Log warning */
function logWarn(msg) {
  console.log(`${timestamp()} ${C.yellow}⚠${C.reset} ${msg}`);
}

/** Log error */
function logError(msg) {
  console.log(`${timestamp()} ${C.red}✖${C.reset} ${msg}`);
}

/** Log progress */
function logProgress(current, total, name) {
  const pct = Math.round((current / total) * 100);
  const bar = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5));
  console.log(
    `${timestamp()} ${C.magenta}[${current}/${total}]${C.reset} ${C.blue}${bar}${C.reset} ${C.bright}${name}${C.reset}`
  );
}

/** Random delay untuk anti-bot mitigation */
function randomDelay(minMs, maxMs) {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/** Bersihkan string dari karakter aneh */
function cleanText(text) {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').trim();
}

/** Validasi apakah string benar-benar nomor telepon (bukan tanggal, dsb) */
function isValidPhone(str) {
  if (!str) return false;
  // Tolak format tanggal: dd-mm-yyyy, dd/mm/yyyy, dll
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(str.trim())) return false;
  // Harus mengandung minimal 7 digit angka
  const digits = str.replace(/\D/g, '');
  if (digits.length < 7) return false;
  // Harus dimulai dengan 0 atau +62 atau 62
  if (/^(\+?62|0)/.test(digits) || /^(\+?62|0)/.test(str.trim())) return true;
  // Atau format (0xx)
  if (/^\(0/.test(str.trim())) return true;
  return false;
}

// ─── Main Scraper ────────────────────────────────────────────────────

async function main() {
  // 1. Argument Parsing
  const keyword = process.argv[2];

  if (!keyword) {
    console.log(`
${C.bright}${C.cyan}╔══════════════════════════════════════════════════╗${C.reset}
${C.bright}${C.cyan}║${C.reset}   ${C.bright}G-Maps Lead Extractor Tool${C.reset}                     ${C.bright}${C.cyan}║${C.reset}
${C.bright}${C.cyan}╚══════════════════════════════════════════════════╝${C.reset}

${C.yellow}Penggunaan:${C.reset}
  node scraper.js ${C.green}"Kata Kunci Pencarian"${C.reset}

${C.yellow}Contoh:${C.reset}
  node scraper.js ${C.green}"Percetakan di Surabaya"${C.reset}
  node scraper.js ${C.green}"Wedding Organizer Jakarta"${C.reset}
  node scraper.js ${C.green}"Restoran Bandung"${C.reset}
`);
    process.exit(1);
  }

  console.log(`
${C.bright}${C.cyan}╔══════════════════════════════════════════════════╗${C.reset}
${C.bright}${C.cyan}║${C.reset}   ${C.bright}G-Maps Lead Extractor Tool${C.reset}                     ${C.bright}${C.cyan}║${C.reset}
${C.bright}${C.cyan}╚══════════════════════════════════════════════════╝${C.reset}
`);

  logInfo(`Memulai pencarian untuk: ${C.bright}"${keyword}"${C.reset}`);

  let browser;
  const leads = [];

  try {
    // 2. Browser Launch
    logInfo('Meluncurkan browser (headless mode)...');
    browser = await chromium.launch({
      headless: true,
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      locale: 'id-ID',
      geolocation: { longitude: 106.845599, latitude: -6.208763 },
      permissions: ['geolocation'],
    });

    const page = await context.newPage();
    page.setDefaultTimeout(30000);

    // 3. Google Maps Navigation — langsung ke URL pencarian
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(keyword)}`;
    logInfo(`Membuka Google Maps dengan pencarian: "${keyword}"...`);
    await page.goto(searchUrl, { waitUntil: 'load', timeout: 60000 });
    await randomDelay(5000, 7000);

    // Handle consent/cookie dialog jika muncul
    try {
      const consentBtn = page.locator('button:has-text("Accept all"), button:has-text("Terima semua"), button:has-text("Setuju"), form[action*="consent"] button');
      if (await consentBtn.first().isVisible({ timeout: 5000 })) {
        await consentBtn.first().click();
        logInfo('Cookie consent diterima.');
        await randomDelay(2000, 4000);
        // Reload halaman pencarian setelah consent
        await page.goto(searchUrl, { waitUntil: 'load', timeout: 60000 });
        await randomDelay(5000, 7000);
      }
    } catch {
      // Consent dialog tidak muncul, lanjut
    }

    logInfo('Menunggu hasil pencarian dimuat...');

    // 4. Automated Lazy-Load Scrolling
    logInfo('Memulai auto-scroll untuk memuat semua hasil...');

    // Cari container sidebar hasil pencarian
    // Google Maps menggunakan div dengan role="feed" untuk daftar hasil
    const feedSelector = 'div[role="feed"]';

    try {
      await page.waitForSelector(feedSelector, { timeout: 15000 });
    } catch {
      // Fallback: coba selector alternatif
      logWarn('Feed container tidak ditemukan dengan selector utama, mencoba alternatif...');
    }

    let scrollAttempts = 0;
    const maxScrollAttempts = 50; // Maksimum scroll attempts
    let previousHeight = 0;
    let noChangeCount = 0;

    while (scrollAttempts < maxScrollAttempts) {
      scrollAttempts++;

      // Cek apakah sudah sampai akhir daftar
      const endOfList = await page.evaluate(() => {
        // Google Maps menampilkan teks ini saat sudah di akhir
        const endTexts = [
          "You've reached the end of the list",
          'Anda telah mencapai akhir daftar',
          "you've reached the end",
        ];
        const body = document.body.innerText.toLowerCase();
        return endTexts.some((t) => body.includes(t.toLowerCase()));
      });

      if (endOfList) {
        logSuccess('Semua hasil telah dimuat (akhir daftar tercapai).');
        break;
      }

      // Scroll sidebar
      const currentHeight = await page.evaluate((sel) => {
        const feed = document.querySelector(sel);
        if (feed) {
          feed.scrollTop = feed.scrollHeight;
          return feed.scrollHeight;
        }
        // Fallback: scroll elemen scrollable terdekat
        const scrollables = document.querySelectorAll('[role="main"] div');
        for (const el of scrollables) {
          if (el.scrollHeight > el.clientHeight && el.clientHeight > 200) {
            el.scrollTop = el.scrollHeight;
            return el.scrollHeight;
          }
        }
        return 0;
      }, feedSelector);

      if (currentHeight === previousHeight) {
        noChangeCount++;
        if (noChangeCount >= 5) {
          logInfo(`Scroll berhenti — tinggi tidak berubah setelah ${noChangeCount} percobaan.`);
          break;
        }
      } else {
        noChangeCount = 0;
      }
      previousHeight = currentHeight;

      // Random delay untuk anti-bot
      await randomDelay(1500, 3500);

      if (scrollAttempts % 5 === 0) {
        logInfo(`Scroll progress: ${scrollAttempts} kali scroll dilakukan...`);
      }
    }

    // 5. Data Extraction — Kumpulkan semua link kartu bisnis
    logInfo('Mengumpulkan daftar tempat...');
    await randomDelay(1000, 2000);

    // Ambil semua link hasil pencarian dari feed
    const placeLinks = await page.evaluate(() => {
      const feed = document.querySelector('div[role="feed"]');
      if (!feed) return [];

      const links = feed.querySelectorAll('a[href*="/maps/place/"]');
      const uniqueHrefs = [];
      const seen = new Set();

      for (const link of links) {
        const href = link.getAttribute('href');
        // Ambil nama dari aria-label
        const label = link.getAttribute('aria-label') || '';
        if (href && !seen.has(href) && label) {
          seen.add(href);
          uniqueHrefs.push({ href, label });
        }
      }
      return uniqueHrefs;
    });

    if (placeLinks.length === 0) {
      logWarn('Tidak ada hasil ditemukan. Pastikan kata kunci pencarian benar.');
      await browser.close();
      process.exit(0);
    }

    logSuccess(`${C.bright}${placeLinks.length}${C.reset}${C.green} tempat ditemukan!${C.reset}`);
    logInfo('Mulai mengekstrak data detail...\n');

    // 6. Direct URL Extraction — navigasi langsung ke setiap URL tempat
    for (let i = 0; i < placeLinks.length; i++) {
      const place = placeLinks[i];
      const placeName = cleanText(place.label);

      logProgress(i + 1, placeLinks.length, placeName);

      try {
        // Navigasi langsung ke URL tempat (lebih reliable daripada klik di feed)
        await page.goto(place.href, { waitUntil: 'load', timeout: 30000 });
        await randomDelay(2000, 3500);

        // Ekstrak semua data dari halaman detail
        const placeData = await page.evaluate(() => {
          const result = { phone: null, rating: null, reviewCount: null, website: null, category: null };

          // ── Telepon ──
          // Strategi 1: data-tooltip
          const phoneSelectors = [
            'button[data-tooltip="Salin nomor telepon"]',
            'button[data-tooltip="Copy phone number"]',
            'a[data-tooltip="Salin nomor telepon"]',
            'a[data-tooltip="Copy phone number"]',
            'button[aria-label*="phone" i]',
            'button[aria-label*="telepon" i]',
          ];
          for (const sel of phoneSelectors) {
            const el = document.querySelector(sel);
            if (el) {
              const text = el.getAttribute('aria-label') || el.textContent || '';
              const match = text.match(/(?:phone|telepon|nomor)[:\s]*([+\d\s\-()]+)/i);
              if (match) { result.phone = match[1].trim(); break; }
            }
          }
          // Strategi 2: href tel:
          if (!result.phone) {
            const telLinks = document.querySelectorAll('a[href^="tel:"]');
            if (telLinks.length > 0) {
              result.phone = telLinks[0].textContent.trim() || telLinks[0].href.replace('tel:', '');
            }
          }
          // Strategi 3: scan teks detail
          if (!result.phone) {
            const detailPanel = document.querySelector('[role="main"]');
            if (detailPanel) {
              const lines = detailPanel.innerText.split('\n');
              for (const line of lines) {
                const trimmed = line.trim();
                const phonePattern = trimmed.match(/(\+?62[\d\s\-]{8,}|0\d[\d\s\-]{7,})/);
                if (phonePattern) { result.phone = phonePattern[1].trim(); break; }
              }
            }
          }

          // ── Rating & Jumlah Ulasan ──
          // Cari elemen rating (biasanya span dengan angka seperti "4.8")
          const ratingEl = document.querySelector('div.F7nice span[aria-hidden="true"]');
          if (ratingEl) {
            result.rating = ratingEl.textContent.trim().replace(',', '.');
          }
          // Jumlah ulasan
          const reviewEls = document.querySelectorAll('div.F7nice span[aria-label]');
          for (const el of reviewEls) {
            const label = el.getAttribute('aria-label') || '';
            const match = label.match(/(\d[\d.,]*)\s*(?:ulasan|review|Rating)/i);
            if (match) {
              if (!result.rating) result.rating = match[1].replace(',', '.');
            }
          }
          // Ambil jumlah ulasan dari teks dalam kurung, e.g. "(120)"
          const reviewCountEl = document.querySelector('div.F7nice span:last-child span');
          if (reviewCountEl) {
            const countText = reviewCountEl.textContent.replace(/[()]/g, '').trim();
            if (/^[\d.,]+$/.test(countText)) {
              result.reviewCount = countText.replace('.', '').replace(',', '');
            }
          }
          // Fallback: cari di aria-label yang berisi jumlah reviews
          if (!result.reviewCount) {
            const allSpans = document.querySelectorAll('span[aria-label]');
            for (const sp of allSpans) {
              const lbl = sp.getAttribute('aria-label') || '';
              const m = lbl.match(/(\d[\d.,]*)\s*(?:ulasan|review)/i);
              if (m) { result.reviewCount = m[1].replace('.', '').replace(',', ''); break; }
            }
          }

          // ── Website ──
          const websiteSelectors = [
            'a[data-tooltip="Buka situs web"]',
            'a[data-tooltip="Open website"]',
            'a[aria-label*="situs web" i]',
            'a[aria-label*="website" i]',
          ];
          for (const sel of websiteSelectors) {
            const el = document.querySelector(sel);
            if (el) {
              result.website = el.getAttribute('href') || el.textContent.trim();
              break;
            }
          }

          // ── Kategori Bisnis ──
          // Biasanya ada di bawah nama, sebagai button atau span
          const categoryEl = document.querySelector('button[jsaction*="category"]');
          if (categoryEl) {
            result.category = categoryEl.textContent.trim();
          }
          // Fallback: cari span/div yang berisi kategori di area header
          if (!result.category) {
            const catSpan = document.querySelector('span.DkEaL');
            if (catSpan) result.category = catSpan.textContent.trim();
          }
          // Fallback 2: cari elemen dengan class yang umum untuk kategori
          if (!result.category) {
            const headerEl = document.querySelector('[data-attrid="subtitle"], .fontBodyMedium span.DkEaL, .LCkSce button');
            if (headerEl) result.category = headerEl.textContent.trim();
          }

          return result;
        });

        // Validasi nomor telepon (cegah false positive seperti tanggal)
        const phone = isValidPhone(placeData.phone) ? placeData.phone : null;

        const lead = {
          no: leads.length + 1,
          nama: placeName,
          telepon: phone || 'N/A',
          rating: placeData.rating || 'N/A',
          ulasan: placeData.reviewCount || 'N/A',
          website: placeData.website || 'N/A',
          kategori: placeData.category || 'N/A',
        };
        leads.push(lead);

        // Log detail
        const details = [];
        if (phone) details.push(`📞 ${C.bright}${phone}${C.reset}`);
        else details.push(`📞 ${C.dim}N/A${C.reset}`);
        if (placeData.rating) details.push(`⭐ ${C.yellow}${placeData.rating}${C.reset} (${placeData.reviewCount || '?'})`);
        if (placeData.category) details.push(`🏷️  ${C.cyan}${placeData.category}${C.reset}`);
        if (placeData.website) details.push(`🌐 ${C.dim}${placeData.website.substring(0, 40)}...${C.reset}`);
        logSuccess(`  └─ ${details.join(' │ ')}`);

        // Random delay antar request untuk anti-bot
        await randomDelay(1000, 2500);
      } catch (err) {
        logError(`  └─ Gagal mengekstrak "${placeName}": ${err.message}`);
        leads.push({
          no: leads.length + 1,
          nama: placeName,
          telepon: 'N/A',
          rating: 'N/A',
          ulasan: 'N/A',
          website: 'N/A',
          kategori: 'N/A',
        });
        await randomDelay(1000, 2000);
      }
    }

    console.log(''); // Empty line

    // 7. Data Export
    if (leads.length === 0) {
      logWarn('Tidak ada data yang berhasil diekstrak.');
      await browser.close();
      process.exit(0);
    }

    // Buat nama file berdasarkan keyword
    const safeKeyword = keyword
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const csvFilename = `leads-${safeKeyword}.csv`;
    const jsonFilename = `leads-${safeKeyword}.json`;

    // Export CSV
    const csvWriter = createObjectCsvWriter({
      path: path.join(process.cwd(), csvFilename),
      header: [
        { id: 'no', title: 'No' },
        { id: 'nama', title: 'Nama Bisnis' },
        { id: 'kategori', title: 'Kategori' },
        { id: 'telepon', title: 'Nomor Telepon' },
        { id: 'rating', title: 'Rating' },
        { id: 'ulasan', title: 'Jumlah Ulasan' },
        { id: 'website', title: 'Website' },
      ],
    });

    await csvWriter.writeRecords(leads);
    logSuccess(`Data tersimpan ke ${C.bright}${csvFilename}${C.reset}`);

    // Export JSON
    const jsonData = {
      keyword: keyword,
      totalResults: leads.length,
      extractedAt: new Date().toISOString(),
      data: leads,
    };

    fs.writeFileSync(
      path.join(process.cwd(), jsonFilename),
      JSON.stringify(jsonData, null, 2),
      'utf-8'
    );
    logSuccess(`Data tersimpan ke ${C.bright}${jsonFilename}${C.reset}`);

    // Ringkasan
    const withPhone = leads.filter((l) => l.telepon !== 'N/A').length;
    const withoutPhone = leads.filter((l) => l.telepon === 'N/A').length;
    const withRating = leads.filter((l) => l.rating !== 'N/A').length;
    const withWebsite = leads.filter((l) => l.website !== 'N/A').length;

    console.log(`
${C.bright}${C.green}╔══════════════════════════════════════════════════╗${C.reset}
${C.bright}${C.green}║${C.reset}   ${C.bright}Ekstraksi Selesai!${C.reset}                             ${C.bright}${C.green}║${C.reset}
${C.bright}${C.green}╚══════════════════════════════════════════════════╝${C.reset}

  ${C.cyan}Total data:${C.reset}          ${C.bright}${leads.length}${C.reset} tempat
  ${C.green}Dengan telepon:${C.reset}      ${C.bright}${withPhone}${C.reset}
  ${C.yellow}Tanpa telepon:${C.reset}       ${C.bright}${withoutPhone}${C.reset}
  ${C.green}Dengan rating:${C.reset}       ${C.bright}${withRating}${C.reset}
  ${C.green}Dengan website:${C.reset}      ${C.bright}${withWebsite}${C.reset}

  ${C.cyan}File output:${C.reset}
    📄 ${C.bright}${csvFilename}${C.reset}
    📄 ${C.bright}${jsonFilename}${C.reset}
`);
  } catch (err) {
    logError(`Terjadi kesalahan fatal: ${err.message}`);
    console.error(err);
    process.exit(1);
  } finally {
    // Pastikan browser selalu ditutup
    if (browser) {
      logInfo('Menutup browser...');
      await browser.close();
    }
  }
}

// ─── Entry Point ─────────────────────────────────────────────────────
main().catch((err) => {
  logError(`Unhandled error: ${err.message}`);
  process.exit(1);
});
