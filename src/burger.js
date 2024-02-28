const {
  getBurgerInfo,
  saveBurgerInfo,
  getBurgerLbInfo,
  getTimeSinceThisUserBurger,
  saveUserBurgerTime,
} = require("./db");

async function burgerMsg(msg) {
  const burgerWaitDuration = 21600000;
  const timeNow = Date.now();
  var coolDownTime = await getTimeSinceThisUserBurger(msg.author.id);
  if (coolDownTime < 15000) {
    try {
      const sentMessage = await msg.reply(
        `Please wait ${
          Math.round((15000 - coolDownTime) / 100) / 10
        } more seconds before you try to call burger again.`
      );

      // Use async function with setTimeout
      // Use async function with setTimeout
      // Wait for the delay to complete
      await delay(3000);
      sentMessage.delete();
      msg.delete();

      // Perform deletions concurrently
      // await Promise.all([sentMessage.delete(), msg.delete()]);

      // await delay(3000);

      // // Delete messages after the delay
      // await sentMessage.delete();
      // await msg.delete();
    } catch (error) {
      console.error(error);
    }
  } else {
    saveUserBurgerTime(msg.author.id, timeNow);

    var burgerInfo = await getBurgerInfo();
    var difference;
    if (burgerInfo === null) {
      difference = burgerWaitDuration;
    } else {
      difference = timeNow - burgerInfo.lastTime;
    }
    if (difference >= burgerWaitDuration) {
      // yes
      const uid = msg.author.id;
      const username = msg.author.globalName;
      msg.reply(":hamburger:");
      // add to leaderboard
      var userScore = { score: 0, username: username };
      if (burgerInfo === null) {
        // start of burger and nothing in db
        burgerInfo = { leaderboard: {} };
      } else {
        if (burgerInfo.leaderboard[`${uid}`] !== undefined) {
          if (burgerInfo.leaderboard[`${uid}`].score !== null) {
            // if the user has an existing score then save that to userScore.score
            userScore.score = burgerInfo.leaderboard[`${uid}`].score;
          }
        } else {
          burgerInfo.leaderboard[`${uid}`] = {};
        }
      }
      userScore.score++;
      burgerInfo.lastTime = timeNow;
      burgerInfo.lastUsername = username;
      burgerInfo.leaderboard[`${uid}`] = userScore;
      saveBurgerInfo(burgerInfo);
    } else {
      var timeTillBurger = Math.round((burgerWaitDuration - difference) / 1000);
      // no
      msg.reply(
        `Burger was already called by **${
          burgerInfo.lastUsername
        }**, and can be called again in ${
          Math.round((timeTillBurger / 3600) * 100) / 100
        } hours.`
      );
    }
  }
}

async function burgerLbMsg(msg) {
  const rawLbData = await getBurgerLbInfo();
  var lbDataArray = [];
  for (const key in rawLbData) {
    lbDataArray.push(rawLbData[key]);
  }
  lbDataArray.sort((a, b) => {
    return b.score - a.score;
  });
  // now sorted, add placing index
  var lastScore = -1;
  var text = "";
  for (let i = 0; i < lbDataArray.length; i++) {
    if (lastScore === lbDataArray[i].score) {
      lbDataArray[i].placing = lbDataArray[i - 1].placing;
    } else {
      lbDataArray[i].placing = i + 1;
    }
    lastScore = lbDataArray[i].score;
  }
  for (let i = 0; i < lbDataArray.length; i++) {
    text += `#${lbDataArray[i].placing}. ${lbDataArray[i].username} **${lbDataArray[i].score}**\n`;
  }
  msg.reply({
    embeds: [
      {
        color: 0x00ff00, // Hex color code
        title: ":hamburger: Burger Leaderboard :hamburger:",
        description: text,
      },
    ],
  });
}

module.exports = {
  burgerMsg,
  burgerLbMsg,
};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
