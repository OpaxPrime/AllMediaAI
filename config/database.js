const sqlite3 = require('sqlite3').verbose();
const path = require('path');

let db;

const initDB = () => {
  return new Promise((resolve, reject) => {
    // Connect to SQLite database (creates file if it doesn't exist)
    db = new sqlite3.Database(path.join(__dirname, 'database.db'), (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
        reject(err);
        return;
      }
      
      console.log('Connected to SQLite database');
      
      // Create users table if it doesn't exist
      const createUserTableQuery = `
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      db.run(createUserTableQuery, (err) => {
        if (err) {
          console.error('Error creating users table:', err.message);
          reject(err);
          return;
        }
        
        console.log('Users table ready');
        resolve(db);
      });
    });
  });
};

const getDB = () => {
  return db;
};

module.exports = { initDB, getDB };