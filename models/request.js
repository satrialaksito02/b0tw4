const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(path.join(__dirname, '../database.db'));

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS requests (
        requestId TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        email TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        nominal INTEGER,
        qrisData BLOB,
        expiredDate TEXT
    )`);
});

const createRequest = async (request) => {
    return new Promise((resolve, reject) => {
        db.run("INSERT INTO requests (requestId, userId, email, status, nominal, expiredDate) VALUES (?, ?, ?, ?, ?, ?)",
            [request.requestId, request.userId, request.email, request.status, request.nominal, request.expiredDate ],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
    });
};

const updateRequestStatus = async (requestId, status) => {
    console.log('Mengubah status request', requestId, 'menjadi:', status);
    return new Promise((resolve, reject) => {
        db.run("UPDATE requests set status = ? WHERE requestId = ?", [status, requestId], function (err) {
            if (err) {
                console.error('Error updating request status:', err);
                reject(err);
            } else {
                console.log('Status request:', requestId, 'berhasil diperbarui.');
                resolve(this.changes > 0); // Return true if updated, false otherwise.
            }
        });
    });
};

const saveQris = async (requestId, qrisData) => {
    return new Promise((resolve, reject) => {
        db.run("UPDATE requests SET qrisData = ? WHERE requestId = ?", [qrisData, requestId], function (err) {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
};

const getRequest = async (status) => {
    console.log('Mencari request dengan status:', status);
    return new Promise((resolve, reject) => {
        const query = "SELECT * FROM requests WHERE status = ? ORDER BY requestId LIMIT 1";
        db.get(query, [status], (err, row) => {
            if (err) {
                console.error('Error getting request:', err);
                reject(err);
            } else {
                console.log('Request ditemukan:', row);
                resolve(row);
            }
        });
    });
};

const close = () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Close the database connection.');
  });
}

module.exports = { createRequest, updateRequestStatus, saveQris, getRequest, close };
