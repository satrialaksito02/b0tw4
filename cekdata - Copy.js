const fs = require('fs');
const EventEmitter = require('events');
const DATA_FILE = 'data.json';

const emitter = new EventEmitter();
let data; // Deklarasikan data di sini

function loadDataFromFile() {
    try {
        const fileData = fs.readFileSync(DATA_FILE, 'utf8');
        data = JSON.parse(fileData);
        return data;
    } catch (err) {
        console.log("File data tidak ditemukan, menggunakan data default.");
        data = { // Sekarang aman karena 'data' sudah dideklarasikan
            subscribedGroups: {},
            SUPER_ADMIN_IDS: ["xxxxxxxx-xxxxxxxx@c.us", "yyyyyyyy-yyyyyyyy@c.us"]
        };
        return data;
    }
}

data = loadDataFromFile(); // Panggil loadDataFromFile setelah deklarasi

function saveData(dataToSave) {
    if (!dataToSave) {
        console.error("Error: Data yang akan disimpan tidak valid.");
        return;
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(dataToSave, null, 2), 'utf8');
    loadDataFromFile(); // Muat ulang data setelah disimpan
    emitter.emit('dataUpdated', data); // Emit event bahwa data telah diperbarui
}

function getData() {
    return data;
}

module.exports = { loadData: loadDataFromFile, saveData, getData, emitter };
