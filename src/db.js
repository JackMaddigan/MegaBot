var admin = require("firebase-admin");

var serviceAccount = require("../db.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://megabot-d13ca-default-rtdb.firebaseio.com",
});

const db = admin.database();

async function saveAverage(solves, average, uid, username, bestTime, timeList) {
  db.ref(`/results/${uid}`)
    .set({
      average: average,
      username: username,
      solves: solves,
      bestTime: bestTime,
      timeList: timeList,
    })
    .catch((error) => {
      console.log(error);
    });
}

async function adminDeleteResult(uid) {
  db.ref(`/results/${uid}`)
    .remove()
    .catch((error) => {
      console.log(error);
    });
}

async function getRankedResults() {
  return new Promise((resolve, reject) => {
    db.ref("/results/")
      .once("value", (snapshot) => {
        const resultsDump = snapshot.val();
        if (resultsDump === null) {
          resolve([]);
          return;
        } else {
          const results = [];
          for (let uid in resultsDump) {
            results.push({
              uid: uid,
              solves: resultsDump[uid].solves,
              username: resultsDump[uid].username,
              average: resultsDump[uid].average,
              single: resultsDump[uid].bestTime,
              timeList: resultsDump[uid].timeList,
            });
          }
          results.sort((a, b) => {
            if (a.average === b.average) {
              return a.single - b.single;
            } else {
              return a.average - b.average;
            }
          });
          // results are now sorted, now add placing index to each item of the array
          var lastAverage = 100000; //more than dnf
          var lastSingle = 100000;
          for (let i = 0; i < results.length; i++) {
            if (
              results[i].average === lastAverage &&
              results[i].single === lastSingle
            ) {
              // single and average are tied so they get the same placing
              results[i].placing = results[i - 1].placing;
            } else {
              // else either the average is faster or the average is the same and the single is faster since it was already sorted like that
              results[i].placing = i + 1;
            }
            lastAverage = results[i].average;
            lastSingle = results[i].single;
          }
          //   results now have a placing index
          resolve(results);
        }
      })
      .catch((error) => {
        console.log(error);
      });
  });
}

async function getWeek() {
  return new Promise((resolve, reject) => {
    db.ref("/week")
      .once("value", (snapshot) => {
        resolve(snapshot.val());
      })
      .catch((error) => {
        console.log(error);
      });
  });
}

async function saveWeek(week) {
  db.ref("/week").set(week);
}

async function deleteAllResults() {
  db.ref("/results/").remove();
}

async function getBurgerInfo() {
  return new Promise((resolve, reject) => {
    db.ref("/burger/")
      .once("value", (snapshot) => {
        var data = snapshot.val();
        resolve(data);
      })
      .catch((error) => {
        console.log(error);
      });
  });
}

async function saveBurgerInfo(burgerInfo) {
  db.ref("/burger/").set(burgerInfo);
}

async function getBurgerLbInfo() {
  return new Promise((resolve, reject) => {
    db.ref("/burger/leaderboard")
      .once("value", (snapshot) => {
        var data = snapshot.val();
        resolve(data);
      })
      .catch((error) => {
        console.log(error);
      });
  });
}

module.exports = {
  saveAverage,
  adminDeleteResult,
  getRankedResults,
  getWeek,
  deleteAllResults,
  saveWeek,
  getBurgerInfo,
  saveBurgerInfo,
  getBurgerLbInfo,
};
