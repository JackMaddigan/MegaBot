const {
  getBurgerInfo,
  saveBurgerInfo,
  getBurgerLbInfo,
  getTimeSinceThisUserBurger,
  saveUserBurgerTime,
  saveUsersRoles,
} = require("./db");

const roles = [
  process.env["burger-leader"],
  process.env["burger-second"],
  process.env["burger-third"],
];

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
      try {
        updateBurgerRoles(burgerInfo, msg.guild);
      } catch (error) {
        console.log(error);
      }
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
  const lbDataArray = await orderBurgerRankings();
  var text = "";

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

async function orderBurgerRankings() {
  const rawLbData = await getBurgerLbInfo();
  var lbDataArray = [];
  for (const key in rawLbData) {
    rawLbData[key].uid = key;
    lbDataArray.push(rawLbData[key]);
  }
  lbDataArray.sort((a, b) => {
    return b.score - a.score;
  });
  // now sorted, add placing index
  var lastScore = -1;
  for (let i = 0; i < lbDataArray.length; i++) {
    if (lastScore === lbDataArray[i].score) {
      lbDataArray[i].placing = lbDataArray[i - 1].placing;
    } else {
      lbDataArray[i].placing = i + 1;
    }
    lastScore = lbDataArray[i].score;
  }
  return lbDataArray;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function updateBurgerRoles(burgerInfo, guild) {
  const oldRoleHavers = burgerInfo.lastRoleHavers;
  if (oldRoleHavers !== undefined) {
    // remove old roles

    for (const uid in oldRoleHavers) {
      await removeRolesFromUser(guild, uid);
    }
  }
  // now give the roles to the new top ones

  const burgerRankings = await orderBurgerRankings();
  var placingsArray = [[], [], []];
  for (let i = 0; i < burgerRankings.length; i++) {
    if (burgerRankings[i].placing === 1) {
      placingsArray[0].push(burgerRankings[i].uid);
    } else if (burgerRankings[i].placing === 2) {
      placingsArray[1].push(burgerRankings[i].uid);
    } else if (burgerRankings[i].placing === 3) {
      placingsArray[2].push(burgerRankings[i].uid);
    }
  }
  // placingsArray contains 3 arrays, each with all the uids of that placing
  // now get the right amount of podium people for roles to be added and add them to the rolestogiveobject
  var rolesToGiveObject = {};
  for (let j = 0; j < placingsArray[0].length; j++) {
    rolesToGiveObject[placingsArray[0][j]] = roles[0];
  }
  if (placingsArray[0].length < 3) {
    for (let j = 0; j < placingsArray[1].length; j++) {
      rolesToGiveObject[placingsArray[1][j]] = roles[1];
    }
    if (placingsArray[0].length + placingsArray[1].length < 3) {
      for (let j = 0; j < placingsArray[2].length; j++) {
        rolesToGiveObject[placingsArray[2][j]] = roles[2];
      }
    }
  }
  // object might look something like this
  /**
   {
    '474178859584061461': 1,
    '542768282101612547': 2,
    '909438741351895050': 2
  `}
 */
  var data = {};
  for (const uid in rolesToGiveObject) {
    await giveUsersRoles(guild, uid, rolesToGiveObject[uid]);
    data[uid] = roles[rolesToGiveObject[uid]];
  }
  // now save to lastRoleHavers
  console.log(data);
  saveUsersRoles(data);
}

async function removeRolesFromUser(guild, uid) {
  try {
    // Fetch the member using the user ID
    const member = await guild.members.fetch(uid);

    // Remove the specified roles
    await member.roles.remove(roles);

    console.log(`Removed roles from ${member.user.tag}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

async function giveUsersRoles(guild, uid, role) {
  try {
    // Fetch the member using the user ID
    const member = await guild.members.fetch(uid);

    // Remove the specified roles
    await member.roles.add(role);

    console.log(`Added role for ${member.user.tag}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

module.exports = {
  burgerMsg,
  burgerLbMsg,
  updateBurgerRoles,
};
