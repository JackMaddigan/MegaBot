const {
  getBurgerInfo,
  saveBurgerInfo,
  getBurgerLbInfo,
  getTimeSinceThisUserBurger,
  saveUserBurgerTime,
} = require("./db");

async function burger(interaction) {
  const burgerWaitDuration = 21600000;
  await interaction.deferReply();
  const timeNow = Date.now();
  var timeSinceThisUserBurger = await getTimeSinceThisUserBurger(
    interaction.user.id
  );
  var coolDownTime = timeNow - timeSinceThisUserBurger;
  if (coolDownTime < 15000) {
    interaction.editReply({
      content: `Please wait ${
        Math.round((15000 - coolDownTime) / 100) / 10
      } more seconds before you try to call burger again.
`,
      ephemeral: true,
    });
    // cooldown
  } else {
    saveUserBurgerTime(interaction.user.id, timeNow);
    var burgerInfo = await getBurgerInfo();
    var difference;
    if (burgerInfo === null) {
      difference = burgerWaitDuration;
    } else {
      difference = timeNow - burgerInfo.lastTime;
    }
    if (difference >= burgerWaitDuration) {
      // yes
      const uid = interaction.user.id;
      const username = interaction.member.displayName;
      interaction.editReply(":hamburger:");
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
      interaction.editReply(
        `Burger was already called by **${
          burgerInfo.lastUsername
        }**. and can be called again in ${
          Math.round((timeTillBurger / 3600) * 100) / 100
        } hours.`
      );
    }
  }
}

async function burgerLb(interaction) {
  await interaction.deferReply();
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
  interaction.editReply({
    embeds: [
      {
        color: 0xe5cb7a, // Hex color code
        title: ":hamburger: Burger Leaderboard :hamburger:",
        description: text,
      },
    ],
  });
}

async function burgerMsg(msg) {
  const burgerWaitDuration = 21600000;
  const timeNow = Date.now();
  var coolDownTime = await getTimeSinceThisUserBurger(msg.author.id);
  if (coolDownTime < 15000) {
    msg.channel
      .send(
        `Please wait ${
          Math.round((15000 - coolDownTime) / 100) / 10
        } more seconds before you try to call burger again.
`
      )
      .then((sentMessage) => {
        setTimeout(() => {
          sentMessage.delete();
          msg.delete();
        }, 3000);
      })
      .catch((error) => {
        console.log(error);
      });
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
      const username = msg.author.displayName;
      msg.channel.send(":hamburger:");
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
      msg.channel.send(
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
  msg.channel.send({
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
  burger,
  burgerLb,
  burgerMsg,
  burgerLbMsg,
};
