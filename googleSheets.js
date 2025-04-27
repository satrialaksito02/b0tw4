const { google } = require('googleapis');
const fs = require('node:fs/promises');

function parseIndonesianDate(dateString) {
    const months = {
      'Januari': 0, 'Februari': 1, 'Maret': 2, 'April': 3, 'Mei': 4, 'Juni': 5, 
      'Juli': 6, 'Agustus': 7, 'September': 8, 'Oktober': 9, 'November': 10, 'Desember': 11
    };
  
    const parts = dateString.split(' ');
    const day = parseInt(parts[0]);
    const month = months[parts[1]];
    const year = parseInt(parts[2]);
  
    return new Date(year, month, day);
  }
  
function formatIndonesianDate(date) {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

async function loadCredentials() {
  try {
    const content = await fs.readFile('credential.json');
    console.log('Credentials loaded successfully.');
    console.log('Credentials:', JSON.stringify(JSON.parse(content), null, 2)); // Log detail credentials (hati-hati dengan private key)
    return JSON.parse(content);
  } catch (err) {
    console.error('Error loading credentials:', err);
    console.error('Error stack:', err.stack); // Log stack trace untuk debugging yang lebih detail
    throw err;
  }
}

const addDaysToDate = (dateString, days) => {
  console.log(`Adding ${days} days to ${dateString}`);

  const date = parseIndonesianDate(dateString);
  date.setDate(date.getDate() + days);
  const newDate = formatIndonesianDate(date);
  console.log(`New date: ${newDate}`);
  return newDate;
};

async function getSheetData() {
  const auth = new google.auth.GoogleAuth({
    keyFile: 'credential.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = '1zO5w3JLCzoK7Scw5TuPleEE7c3-jcdXFpbAKfAEnlHw';
  console.log(`Getting data from spreadsheet ID: ${spreadsheetId}`);

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Youtube!B3:G',
    });
    console.log(`Data fetched successfully. Rows count: ${response.data.values.length}`);
    const rows = response.data.values;
    if (rows.length) {
        return rows.map(row => ({
          email: row[0],
          kolomC: row[1], //Nama kolom sesuai spreadsheet
          tanggalPembelian: row[2],
          durasi: row[3],
          kolomF: row[4], //Nama kolom sesuai spreadsheet
          expired: row[5],
        }));
      return parsedRows;
    } else {
      console.log('No data found in the sheet.');
      return [];
    }
  } catch (err) {
    console.error('Error getting sheet data:', err);
    console.error('Error stack:', err.stack); // Log stack trace
    throw err;
  }
}

async function updateSheetData(updatedRow) {
    const auth = new google.auth.GoogleAuth({
      keyFile: 'credential.json',
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = '1zO5w3JLCzoK7Scw5TuPleEE7c3-jcdXFpbAKfAEnlHw';
  
    try {
      const sheetData = await getSheetData();
      const emailForSearch = updatedRow.email ? updatedRow.email.toLowerCase() : '';
	  const rowIndex = sheetData.findIndex(row => row.email?.toLowerCase() === emailForSearch);

  
      if (rowIndex === -1) {
        console.error("Email not found in spreadsheet!");
        return;
      }
  
      const rowToUpdate = sheetData[rowIndex]; // Original row data

      // Use the original expired date for tanggalPembelian
      const originalExpiredDate = rowToUpdate.expired;
  
      // Update the other fields
      rowToUpdate.tanggalPembelian = originalExpiredDate; // Use the original expired date
      rowToUpdate.durasi = updatedRow.durasi;
      rowToUpdate.expired = updatedRow.expired;
  
      //Buat array 2D untuk update
      const dataToUpdate = [Object.values(rowToUpdate)];
      console.log('Data to update:', JSON.stringify(dataToUpdate, null, 2));
  
  
      const range = `Youtube!B${rowIndex + 3}:H${rowIndex + 3}`;
      console.log(`Updating range: ${range}`);
  
      const response = await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        resource: { values: dataToUpdate },
      });
  
      console.log('Spreadsheet update response:', JSON.stringify(response.data, null, 2));
      console.log('Spreadsheet updated successfully!');
    } catch (err) {
      console.error('Error updating sheet data:', err);
      console.error('Error stack:', err.stack);
      throw err;
    }
  }

  
  module.exports = { getSheetData, updateSheetData, addDaysToDate };
  