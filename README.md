# G-Maps Lead Extractor Tool

G-Maps Lead Extractor Tool is an automated CLI (Command Line Interface) tool built with Node.js and Playwright. It is designed to extract public business contact data (Names and Phone Numbers) in bulk from Google Maps based on specific search keywords and locations.

## Features
- **Keyword Input**: Flexible search queries (e.g., "Percetakan di Surabaya").
- **Automated Lazy-Load Scrolling**: Automatically navigates the search results sidebar and scrolls to load all places in the area.
- **Data Extraction**: Extracts Business Names and Phone Numbers (if available).
- **Data Export**: Saves extracted data automatically to easily readable formats (`.csv` and `.json`).
- **Anti-Bot Mitigation**: Implements dynamic random delays on actions to mimic human behavior.
- **Error Handling**: Gracefully handles missing data (e.g., no phone number) by marking them as "N/A" and continues scraping.
- **Headless Operation**: Runs in the background without launching a visible browser UI.

## Prerequisites
- [Node.js](https://nodejs.org/) (v14 or higher recommended)
- npm (Node Package Manager)

## Installation
1. Clone this repository:
   ```bash
   git clone https://github.com/BayuArga669/G-Maps-Lead-Extractor-Tool.git
   ```
2. Navigate into the directory:
   ```bash
   cd G-Maps-Lead-Extractor-Tool
   ```
3. Install the dependencies:
   ```bash
   npm install
   ```
4. Install Playwright browsers:
   ```bash
   npx playwright install
   ```

## Usage
Run the script using Node.js and pass your search keyword as an argument:
```bash
node scraper.js "Your Search Keyword"
```

*Example:*
```bash
node scraper.js "Cafe di Buduran Sidoarjo"
```

### Expected Output
- The script will log its progress in the terminal.
- Extracted data will be saved in the root directory as `.csv` and `.json` files (e.g., `leads-cafe-di-buduran-sidoarjo.csv`).

## Limitations
- Google Maps limits the number of results shown in a single search area (usually 100-120 results).
- Frequent changes in Google Maps DOM structure may require periodic maintenance of the CSS selectors in the script.

## Tech Stack
- **Environment**: Node.js
- **Automation**: Playwright
- **Output Handlers**: Node.js `fs` module, `csv-writer`
