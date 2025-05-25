const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database(
  "./megabot.db",
  sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
  (err) => {
    if (err) return console.error(err.message);
  }
);

// db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, rows) => {
//   if (err) {
//     console.error("Error fetching tables:", err.message);
//   } else {
//     console.log("Tables in the database:");
//     rows.forEach((row) => console.log(row.name));
//   }
// });
//
// db.run(`DROP TABLE IF EXISTS burgerLeaderboard`);

db.run(`
        CREATE TABLE IF NOT EXISTS results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId TEXT NOT NULL,
            username TEXT NOT NULL,
            eventId TEXT NOT NULL,
            attempts TEXT NOT NULL,
            best INTEGER,
            average INTEGER,
            UNIQUE(userId, eventId)

        )
    `);

db.run(
  `CREATE TABLE IF NOT EXISTS key_value_store (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT UNIQUE, value TEXT)`
);

db.run(`
        CREATE TABLE IF NOT EXISTS burgerLeaderboard (
            id TEXT PRIMARY KEY UNIQUE,
            score INTEGER,
            username TEXT
        )
    `);

db.run(`
        CREATE TABLE IF NOT EXISTS burgerLastRoleHavers (
            id TEXT PRIMARY KEY UNIQUE,
            roleId TEXT
        )
    `);

db.run(`CREATE TABLE IF NOT EXISTS announcedRecords (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT
  )`
)

async function saveData(query, parameters) {
  try {
    return await new Promise((resolve, reject) => {
      db.run(query, parameters, function (err) {
        if (err) {
          console.error(err.message);
          reject();
        }
        resolve();
      });
    });
  } catch (err_1) {
    return console.error(err_1);
  }
}

function readData(query, parameters) {
  return new Promise((resolve, reject) => {
    db.all(query, parameters, function (err, rows) {
      if (err) {
        console.error(err.message);
        reject(err);
      }
      resolve(rows);
    });
  });
}

function deleteData(query, parameters) {
  return new Promise((resolve, reject) => {
    db.run(query, parameters, function (err) {
      if (err) {
        console.error(err.message);
        reject(err);
      }
      resolve();
    });
  });
}

async function bulkSaveData(query, data) {
  try {
    // Prepare the SQL statement
    let stmt = db.prepare(query);
    // Use a loop to insert each array into the database
    data.forEach((row) => {
      stmt.run(row, (err) => {
        if (err) {
          return console.log(err.message);
        }
      });
    });

    // Finalize the statement
    stmt.finalize();
  } catch (err_1) {
    return console.error(err_1);
  }
}

module.exports = {
  readData,
  saveData,
  deleteData,
  bulkSaveData,
};
