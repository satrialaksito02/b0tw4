// utils/dataService.js
const fs = require('fs');
const EventEmitter = require('events');
const chokidar = require('chokidar');
const config = require('../config');

class DataService extends EventEmitter {
    constructor(filePath) {
        super();
        this.filePath = filePath;
        this.data = this.loadDataFromFile();
        this.watchFile();
    }

    loadDataFromFile() {
        try {
            const fileData = fs.readFileSync(this.filePath, 'utf8');
            if (!fileData.trim()) {
                return { subscribedGroups: {}, SUPER_ADMIN_IDS: config.defaultSuperAdmins }; //Data awal
            }
            return JSON.parse(fileData);
        } catch (err) {
            console.log("File data tidak ditemukan, menggunakan data default.");
            return { subscribedGroups: {}, SUPER_ADMIN_IDS: config.defaultSuperAdmins }; //Data Awal
        }
    }

     saveData() {
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf8');
            this.emit('dataUpdated', this.data); // Emit event dengan data yang baru
        }
        catch(error){
            console.error("Gagal menyimpan data:", error)
        }
    }

    updateData(newData) {
        this.data = { ...this.data, ...newData };
        this.saveData();
    }
    
    getData() {
        return this.data;
    }


    watchFile() {
        const watcher = chokidar.watch(this.filePath, {
            persistent: true,
            ignoreInitial: true,
        });

        watcher.on('change', () => {
            console.log('data.json telah diubah, memuat ulang data...');
            try {
                this.data = this.loadDataFromFile();
                this.emit('dataUpdated', this.data); // Kirim data yang sudah diperbarui
            } catch (error) {
                console.error("Error memuat ulang data:", error);
            }
        });
    }
}

const dataService = new DataService(config.dataFilePath);

module.exports = dataService;

