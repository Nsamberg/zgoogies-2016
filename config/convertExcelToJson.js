const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Read the Excel file
const workbook = XLSX.readFile(path.join(__dirname, 'FIFA World Cup 2026.xlsx'));
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Convert to JSON
const data = XLSX.utils.sheet_to_json(worksheet);

console.log(`Total rows found: ${data.length}`);
console.log('Sample row:', data[0]);

// Transform the data and filter out empty rows
const games = data.filter(row => {
  // Filter out rows that don't have essential data
  return row['Match #'] && row['Team A'] && row['Team B'];
}).map(row => {
  // Parse the Location field to split Stadium and City
  const location = row['Location'] || '';
  const locationParts = location.split(',').map(part => part.trim());
  const stadium = locationParts[0] || '';
  const city = locationParts[1] || '';

  // Parse the date/time from EDT to UTC
  // EDT is UTC-4 hours
  let dateTimeUTC = null;
  const edtDateStr = row['Date & Time (US EDT/UTC-4)'];

  if (edtDateStr) {
    try {
      // Format: "Thursday, June 11, at 3:00 PM"
      // Extract month, day, and time
      const match = edtDateStr.match(/(\w+),\s+(\w+)\s+(\d+),\s+at\s+(\d+):(\d+)\s+(AM|PM)/i);

      if (match) {
        const [, , monthName, day, hours, minutes, ampm] = match;

        // Convert month name to number
        const months = {
          'January': 0, 'February': 1, 'March': 2, 'April': 3,
          'May': 4, 'June': 5, 'July': 6, 'August': 7,
          'September': 8, 'October': 9, 'November': 10, 'December': 11
        };

        const month = months[monthName];

        // Convert to 24-hour format
        let hour = parseInt(hours);
        if (ampm.toUpperCase() === 'PM' && hour !== 12) {
          hour += 12;
        } else if (ampm.toUpperCase() === 'AM' && hour === 12) {
          hour = 0;
        }

        // Create date in EDT (year 2026)
        const edtDate = new Date(2026, month, parseInt(day), hour, parseInt(minutes), 0);

        // Convert EDT to UTC by adding 4 hours
        const utcDate = new Date(edtDate.getTime() + (4 * 60 * 60 * 1000));
        dateTimeUTC = utcDate.toISOString();
      }
    } catch (error) {
      console.error(`Error parsing date for match ${row['Match #']}: ${edtDateStr}`, error);
    }
  }

  return {
    stage: row['Stage'] || '',
    dateTimeUTC: dateTimeUTC,
    teamA: row['Team A'] || '',
    teamB: row['Team B'] || '',
    matchNumber: row['Match #'] || '',
    stadium: stadium,
    city: city,
    competitionRound: row['Round'] || ''
  };
});

console.log(`Total games converted: ${games.length}`);

// Write to JSON file
const outputPath = path.join(__dirname, 'Tournament Games.json');
fs.writeFileSync(outputPath, JSON.stringify(games, null, 2));

console.log(`JSON file created at: ${outputPath}`);
console.log(`Total games in JSON: ${games.length}`);
