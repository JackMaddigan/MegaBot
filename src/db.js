const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database(
  "./megabot.db",
  sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
  (err) => {
    if (err) return console.error(err.message);
  }
);
// db.run(`DROP TABLE IF EXISTS burger`);
// db.run(`DROP TABLE IF EXISTS results`);
// db.run(`DROP TABLE IF EXISTS comp`);
// db.run(`DROP TABLE IF EXISTS burgerLeaderboard`);
// db.run(`DROP TABLE IF EXISTS burgerLastRoleHavers`);
// db.run(`DROP TABLE IF EXISTS lastTopPlayers`);

async function test() {
  const data = {
    "1011884318848733234": { score: 2, username: "ihtsolves" },
    "1012747304480034907": { score: 22, username: "Ali" },
    "1061666891422249181": { score: 38, username: "Ismaele chiarella" },
    "1064991259980206231": { score: 1, username: "a_cuber123" },
    "1093669666280456343": { score: 50, username: "mogomonx" },
    "1096293504386342952": { score: 2, username: "Smijo's Rubikzz" },
    "1109241515403911249": { score: 27, username: "Alessandro" },
    "1138246054744178788": { score: 5, username: "skewbycuber" },
    "1209939284396744724": { score: 30, username: "IntergalacticPhillippooo" },
    "401500275799752704": { score: 3, username: "Sean_M" },
    "432960409788481547": { score: 9, username: "Cuberstache" },
    "474178859584061461": { score: 384, username: "DACHI" },
    "497869768271986709": { score: 8, username: "person ig idk" },
    "542768282101612547": { score: 55, username: "Meow" },
    "584949989516771328": { score: 1, username: "AntiCactus" },
    "592784278362914818": { score: 2, username: "Duck" },
    "628693710368014365": { score: 1, username: "3DegreeK" },
    "637117513729048616": { score: 7, username: "Jack Maddigan" },
    "721577970472452127": { score: 2, username: "Kaivalya" },
    "729534269369876531": { score: 21, username: "DosaEnjoyer" },
    "758932649338863616": { score: 2, username: "LittleBob10" },
    "767693039669215253": { score: 11, username: "anja.k4" },
    "772590541266485329": { score: 4, username: "҈" },
    "781909283943874560": { score: 2, username: "catfurryface" },
    "801942351236169750": { score: 1, username: "RobotMania" },
    "812401144797593620": { score: 2, username: "AlexTheGreat" },
    "814035642195509261": { score: 1, username: "that short event guy" },
    "816731205524258847": { score: 1, username: "minitymon" },
    "869485374894903338": { score: 10, username: "Rory" },
    "871566415772139520": { score: 19, username: "jamy" },
    "874358539810902026": { score: 1, username: "TheQuietKid" },
    "909438741351895050": { score: 13, username: "DRZL" },
    "912138426847989810": {
      score: 2,
      username: "An Animating Cuber | 2023COTT01",
    },
    "931724117814698064": { score: 8, username: "petah" },
    "962895306553430016": { score: 6, username: "Chip" },
    "999401341619277955": { score: 1, username: "jokazoo" },
  };
  for (const key in data) {
    const info = data[key];
    await saveData(
      `INSERT INTO burgerLeaderboard (id, score, userName) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET score=excluded.score, userName = excluded.userName`,
      [key, info.score, info.username]
    );
  }

  const lastRoleHavers = {
    "1093669666280456343": "1213417016715640852",
    "474178859584061461": "1213416586862665789",
    "542768282101612547": "1213416776713642004",
  };
  for (const uid in lastRoleHavers) {
    const role = lastRoleHavers[uid];
    await saveData(
      `INSERT INTO burgerLastRoleHavers (id, roleId) VALUES (?, ?)`,
      [uid, role]
    );
  }

  const burgInfo = {
    lastTime: 1724984280792,
    lastUsername: "DosaEnjoyer",
  };
  await saveData(
    `INSERT INTO burger (id, time, lastCalledUser) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET time=excluded.time, lastCalledUser=excluded.lastCalledUser`,
    [1, burgInfo.lastTime, burgInfo.lastUsername]
  );
}

test();
// db.run(`DROP TABLE IF EXISTS burgerLeaderboard`);

// Initialise results table
db.run(`
        CREATE TABLE IF NOT EXISTS results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId TEXT NOT NULL,
            userName TEXT NOT NULL,
            eventId TEXT NOT NULL,
            list TEXT NOT NULL,
            best INTEGER,
            average INTEGER,
            eventFormat STRING
        )
    `);

db.run(`
        CREATE TABLE IF NOT EXISTS comp (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            compData TEXT UNIQUE,
            week INTEGER
        )
    `);

db.run(`
        CREATE TABLE IF NOT EXISTS burger (
            id INTEGER UNIQUE,
            time INTEGER,
            lastCalledUser TEXT
        )
    `);

db.run(`
        CREATE TABLE IF NOT EXISTS burgerLeaderboard (
            id TEXT PRIMARY KEY UNIQUE,
            score INTEGER,
            userName TEXT
        )
    `);

db.run(`
        CREATE TABLE IF NOT EXISTS burgerLastRoleHavers (
            id TEXT PRIMARY KEY UNIQUE,
            roleId TEXT
        )
    `);

db.run(`CREATE TABLE IF NOT EXISTS lastTopPlayers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          wcaId TEXT,
          type TEXT,
          result INTEGER
  )`);

// test();

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
