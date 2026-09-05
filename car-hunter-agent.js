const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// Your criteria from the brief
const CRITERIA = {
  makes: ['Mazda', 'Toyota', 'Honda', 'Subaru', 'Lexus', 'Hyundai'],
  models: {
    'Mazda': ['CX-5', 'CX5'],
    'Toyota': ['RAV4', 'RAV-4'],
    'Honda': ['HR-V', 'HRV', 'CR-V', 'CRV'],
    'Subaru': ['Crosstrek'],
    'Lexus': ['NX', 'RX', 'UX'],
    'Hyundai': ['Kona', 'Tucson', 'Santa Fe']
  },
  yearMin: 2018,
  yearMax: 2022,
  priceMax: 20000,
  mileageMax: 175000,
  transmission: 'Automatic',
  drivetrain: 'AWD',
  location: ['GTA', 'Toronto', 'Ontario', 'Mississauga', 'Brampton', 'Markham', 'Vaughan', 'Richmond Hill', 'Pickering', 'Ajax', 'Whitby', 'Oshawa']
};

const SEEN_LISTINGS_FILE = path.join(__dirname, 'seen_listings.json');
const EMAIL_CONFIG = {
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
};

// Helper to load seen listings
function loadSeenListings() {
  if (fs.existsSync(SEEN_LISTINGS_FILE)) {
    return JSON.parse(fs.readFileSync(SEEN_LISTINGS_FILE, 'utf8'));
  }
  return [];
}

// Helper to save seen listings
function saveSeenListings(listings) {
  fs.writeFileSync(SEEN_LISTINGS_FILE, JSON.stringify(listings, null, 2));
}

// Helper to make HTTP requests
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const timeout = setTimeout(() => {
      reject(new Error(`Request timeout for ${url}`));
    }, 10000);

    client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      clearTimeout(timeout);
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// Check if listing matches criteria
function matchesCriteria(car) {
  // Price check
  if (car.price > CRITERIA.priceMax) return false;

  // Mileage check
  if (car.mileage && car.mileage > CRITERIA.mileageMax) return false;

  // Year check
  if (car.year && (car.year < CRITERIA.yearMin || car.year > CRITERIA.yearMax)) return false;

  // Make check
  const makeMatch = CRITERIA.makes.some(make => 
    car.make && car.make.toLowerCase().includes(make.toLowerCase())
  );
  if (!makeMatch) return false;

  // Model check
  const modelMatch = Object.values(CRITERIA.models).some(models =>
    models.some(model => 
      car.model && car.model.toLowerCase().includes(model.toLowerCase())
    )
  );
  if (!modelMatch) return false;

  // Transmission check
  if (car.transmission && !car.transmission.toLowerCase().includes('automatic')) return false;

  // Drivetrain check (AWD preferred but not required)
  if (car.drivetrain && !car.drivetrain.toLowerCase().includes('awd')) return false;

  // Location check
  const locationMatch = CRITERIA.location.some(loc =>
    car.location && car.location.toLowerCase().includes(loc.toLowerCase())
  );
  if (!locationMatch) return false;

  return true;
}

// Send email notification
async function sendAlert(car) {
  try {
    const transporter = nodemailer.createTransport(EMAIL_CONFIG);
    const tcoEstimate = calculateTCO(car);
    
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: process.env.ALERT_EMAIL,
      subject: `🚗 Car Match Found: ${car.year} ${car.make} ${car.model} - $${car.price.toLocaleString()}`,
      html: `
        <h2>New Car Match Found!</h2>
        <p><strong>${car.year} ${car.make} ${car.model}</strong></p>
        
        <h3>Key Details</h3>
        <ul>
          <li><strong>Price:</strong> $${car.price.toLocaleString()}</li>
          <li><strong>Mileage:</strong> ${car.mileage ? car.mileage.toLocaleString() + ' km' : 'Not specified'}</li>
          <li><strong>Location:</strong> ${car.location || 'Not specified'}</li>
          <li><strong>Transmission:</strong> ${car.transmission || 'Not specified'}</li>
          <li><strong>Drivetrain:</strong> ${car.drivetrain || 'Not specified'}</li>
        </ul>

        <h3>TCO & Risk Assessment</h3>
        <p>${tcoEstimate}</p>

        <h3>Action</h3>
        <p><a href="${car.url}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Listing</a></p>
        
        <h3>Source</h3>
        <p>${car.source}</p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Alert sent for ${car.year} ${car.make} ${car.model}`);
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
  }
}

// Simple TCO calculator
function calculateTCO(car) {
  const insurance = car.make === 'Lexus' ? 1800 : car.make === 'Hyundai' ? 1200 : 1500;
  const fuel = 1200; // Annual estimate
  const maintenance = 600;
  const yearlyTCO = insurance + fuel + maintenance;
  const totalTCO = (yearlyTCO * 2.5) + car.price;
  
  let riskFlags = [];
  if (car.mileage > 150000) riskFlags.push('High mileage');
  if (car.price > 18000) riskFlags.push('Near budget limit');
  
  const riskText = riskFlags.length > 0 ? `⚠️ Flags: ${riskFlags.join(', ')}` : '✅ Low risk profile';
  
  return `Estimated 2.5-year TCO: $${totalTCO.toLocaleString()} | ${riskText}`;
}

// Kijiji scraper
async function scrapeKijiji() {
  console.log('🔍 Scraping Kijiji...');
  try {
    // Note: Kijiji has anti-scraping measures. This is a simplified example.
    // In production, you may need to use a headless browser or API.
    console.log('⚠️ Kijiji: Requires headless browser (skipping in basic mode)');
    return [];
  } catch (error) {
    console.error('❌ Kijiji error:', error.message);
    return [];
  }
}

// AutoTrader scraper
async function scrapeAutoTrader() {
  console.log('🔍 Scraping AutoTrader...');
  try {
    // AutoTrader API approach (simplified)
    console.log('⚠️ AutoTrader: Requires API key (skipping in basic mode)');
    return [];
  } catch (error) {
    console.error('❌ AutoTrader error:', error.message);
    return [];
  }
}

// CarGurus scraper
async function scrapeCarGurus() {
  console.log('🔍 Scraping CarGurus...');
  try {
    // CarGurus has dynamic content. Simplified approach:
    console.log('⚠️ CarGurus: Requires headless browser (skipping in basic mode)');
    return [];
  } catch (error) {
    console.error('❌ CarGurus error:', error.message);
    return [];
  }
}

// Visor.vin scraper
async function scrapeVisorVin() {
  console.log('🔍 Scraping Visor.vin...');
  try {
    const listings = [];
    
    // Build search URL for Ontario, AWD vehicles
    // Visor.vin search parameters
    const searchParams = new URLSearchParams({
      'province': 'ON',
      'transmission': 'automatic',
      'drivetrain': 'AWD',
      'max_price': '25000',
      'max_mileage': '200000'
    });
    
    const url = `https://www.visor.vin/search?${searchParams.toString()}`;
    const response = await fetchUrl(url);
    
    // Parse HTML to extract car listings
    // Look for car listing cards in the response
    const listingPattern = /class=['"']listing[-\w]*['"][^>]*>([\s\S]*?)<\/div>/gi;
    const matches = response.matchAll(listingPattern);
    
    for (const match of matches) {
      try {
        const listingHtml = match[1];
        
        // Extract make/model
        const makeModelMatch = listingHtml.match(/(?:Mazda|Toyota|Honda|Subaru|Lexus|Hyundai)\s+(?:CX-5|RAV4|HR-V|Crosstrek|NX|RX|UX|Kona|Tucson|Santa Fe|CR-V|CX5|RAV-4|HRV|CRV)/i);
        if (!makeModelMatch) continue;
        
        const [makeModel] = makeModelMatch[0].split(/\s+(?=CX-5|RAV4|HR-V|Crosstrek|NX|RX|UX|Kona|Tucson|Santa Fe|CR-V|CX5|RAV-4|HRV|CRV)/i);
        const parts = makeModel.match(/^(\w+)\s+(.+)$/);
        if (!parts) continue;
        
        const [, make, model] = parts;
        
        // Extract year
        const yearMatch = listingHtml.match(/\b(20\d{2})\b/);
        const year = yearMatch ? parseInt(yearMatch[1]) : null;
        
        // Extract price
        const priceMatch = listingHtml.match(/\$[\s]?([\d,]+)/);
        const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : null;
        
        // Extract mileage
        const mileageMatch = listingHtml.match(/([\d,]+)\s*(?:km|KM)/);
        const mileage = mileageMatch ? parseInt(mileageMatch[1].replace(/,/g, '')) : null;
        
        // Extract location
        const locationMatch = listingHtml.match(/(?:Location|City)[:\s]+([^<,]+)/i);
        const location = locationMatch ? locationMatch[1].trim() : 'Ontario';
        
        // Extract URL
        const urlMatch = listingHtml.match(/href=['"](\/listing\/[^'"]+)['"]/i);
        const listingUrl = urlMatch ? `https://www.visor.vin${urlMatch[1]}` : null;
        
        if (!listingUrl || !price) continue;
        
        // Assume automatic and AWD from search filter
        const car = {
          source: 'Visor.vin',
          year,
          make,
          model,
          price,
          mileage,
          location,
          transmission: 'Automatic',
          drivetrain: 'AWD',
          url: listingUrl
        };
        
        listings.push(car);
      } catch (e) {
        // Skip malformed listings
        continue;
      }
    }
    
    console.log(`✅ Visor.vin: Found ${listings.length} listings`);
    return listings;
  } catch (error) {
    console.error('❌ Visor.vin error:', error.message);
    return [];
  }
}

// Facebook Marketplace scraper
async function scrapeFacebookMarketplace() {
  console.log('🔍 Scraping Facebook Marketplace...');
  try {
    // Facebook Marketplace requires authentication and headless browser
    console.log('⚠️ Facebook Marketplace: Requires authentication (skipping in basic mode)');
    return [];
  } catch (error) {
    console.error('❌ Facebook Marketplace error:', error.message);
    return [];
  }
}

// Main run function
async function runScan() {
  console.log('\n=== CAR HUNTER AGENT ===');
  console.log(`Scan started at ${new Date().toISOString()}`);
  
  const seenListings = loadSeenListings();
  let newMatches = [];

  // Run Visor.vin scraper (most reliable for now)
  console.log('📡 Starting scan of Visor.vin...');
  const visorListings = await scrapeVisorVin();
  
  // Log other sources as pending
  console.log('⏳ Kijiji, AutoTrader, CarGurus, Facebook: Coming soon');

  const allCars = visorListings;

  // Filter and alert on new matches
  if (allCars.length > 0) {
    console.log(`\n🔎 Checking ${allCars.length} listings against your criteria...`);
  }
  
  for (const car of allCars) {
    const listingId = `${car.source}-${car.url}`;
    
    if (!seenListings.includes(listingId)) {
      if (matchesCriteria(car)) {
        newMatches.push(car);
        seenListings.push(listingId);
        console.log(`\n✨ MATCH FOUND: ${car.year} ${car.make} ${car.model} - $${car.price.toLocaleString()}`);
        await sendAlert(car);
      } else {
        // Still track as seen to avoid future checks
        seenListings.push(listingId);
      }
    }
  }

  saveSeenListings(seenListings);
  
  console.log(`\n✅ Scan complete. Found ${newMatches.length} new matches.`);
  console.log(`📊 Total unique listings scanned: ${seenListings.length}`);
}

// Run the agent
runScan().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
