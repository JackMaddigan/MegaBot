const { EmbedBuilder } = require("@discordjs/builders");
const { readData, saveData, deleteData } = require("./db");
const burgerWaitDuration = 21600000; // 21600000

const lastBurgerTimes = {};
let lastBurger = null;
let lastBurgerUser = null;

const roles = [
  process.env["burger-leader"],
  process.env["burger-second"],
  process.env["burger-third"],
];

async function burgerMsg(msg) {
  try {
    const timeNow = Date.now();
    const userLastBurgerTime = lastBurgerTimes[msg.author.id];
    var coolDownTime = userLastBurgerTime
      ? timeNow - userLastBurgerTime
      : timeNow;
    if (coolDownTime < 15000) {
      try {
        const sentMessage = await msg.reply(
          `Please wait ${
            Math.round((15000 - coolDownTime) / 100) / 10
          } more seconds before you try to call burger again.`
        );
        await delay(3000);
        await Promise.all([sentMessage.delete(), msg.delete()]);
      } catch (error) {
        console.error(error);
      }
    } else {
      if (lastBurger == null) {
        // bot must have started up and lost the variable values
        let lastBurgerInfo = (
          await readData(`SELECT * FROM burger LIMIT 1`)
        )[0];
        if (!lastBurgerInfo) {
          // nothing in db so first ever burger
          lastBurger = 0;
        } else {
          // update variables to what the database had
          lastBurger = lastBurgerInfo.time;
          lastBurgerUser = lastBurgerInfo.lastCalledUser;
        }
      }
      var difference = timeNow - lastBurger;
      // set last burger time for the user for the cooldown
      lastBurgerTimes[msg.author.id] = timeNow;
      if (difference >= burgerWaitDuration) {
        // it has been 6 hours
        const uid = msg.author.id;
        const userName = msg.author.username;
        lastBurger = timeNow;
        lastBurgerUser = userName;
        await msg.reply(":hamburger:");
        // update last burger info in db
        await saveData(
          `INSERT INTO burger (id, time, lastCalledUser)
VALUES (?, ?, ?)
ON CONFLICT(id) 
DO UPDATE SET time = excluded.time, lastCalledUser = excluded.lastCalledUser`,
          [1, timeNow, userName]
        );
        // add to leaderboard
        await saveData(
          `INSERT INTO burgerLeaderboard (id, score, userName)
VALUES (?, ?, ?)
ON CONFLICT(id) 
DO UPDATE SET score = score + excluded.score, userName = excluded.userName`,
          [uid, 1, userName]
        );

        await updateBurgerRoles(msg.guild);
      } else {
        var timeTillBurger = Math.round(
          (burgerWaitDuration - difference) / 1000
        );
        await msg.reply(
          `Burger was already called by **${lastBurgerUser}**, and can be called again in ${
            Math.round((timeTillBurger / 3600) * 100) / 100
          } hours.`
        );
      }
    }
  } catch (error) {
    console.error(error);
  }
}

async function burgerLbMsg(msg) {
  const size = 10;
  let lbDataArray = await orderBurgerRankings();
  let parts = msg.content.split(" ");
  let startRank = 1;
  if (parts.length > 1)
    if (!isNaN(parts[1])) startRank = Math.abs(Number(parts[1]));
  if (startRank > lbDataArray.length) startRank = 1;
  const ranksToShow = [];
  for (
    let i = Math.max(startRank - 1, 0);
    i < Math.min(startRank + size - 1, lbDataArray.length);
    i++
  )
    ranksToShow.push(lbDataArray[i]);

  let text = "";
  for (const item of ranksToShow) {
    text += `#${item.placing}. ${item.userName} **${item.score}**\n`;
  }
  await msg.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle(":hamburger: Burger Leaderboard :hamburger:")
        .setDescription(text || " ")
        .setFooter({
          text: `${startRank}-${Math.min(
            startRank + size - 1,
            lbDataArray.length
          )} of ${lbDataArray.length}`,
        }),
    ],
  });
}

async function orderBurgerRankings() {
  try {
    const data = await readData(
      `SELECT * FROM burgerLeaderboard ORDER BY score DESC`,
      []
    );
    let lastScore = -1;
    for (let i = 0; i < data.length; i++) {
      let entry = data[i];
      if (lastScore === entry.score) {
        entry.placing = data[i - 1].placing;
      } else {
        entry.placing = i + 1;
      }
      lastScore = entry.score;
    }
    return data;
  } catch (error) {
    console.error(error);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function updateBurgerRoles(guild) {
  try {
    const oldRoleHavers = await readData(
      `SELECT * FROM burgerLastRoleHavers`,
      []
    );
    const burgerRankings = await orderBurgerRankings();
    let podium = burgerRankings.filter((item) => item.placing === 1);
    podium.forEach((item) => {
      item.roleId = roles[item.placing - 1]; // Update each item’s roleId
    });
    let secondPlaces = burgerRankings.filter((item) => item.placing === 2);
    secondPlaces.forEach((item) => {
      item.roleId = roles[item.placing - 1]; // Update each item’s roleId
    });
    let thirdPlaces = burgerRankings.filter((item) => item.placing === 3);
    thirdPlaces.forEach((item) => {
      item.roleId = roles[item.placing - 1]; // Update each item’s roleId
    });
    if (podium.length < 3) podium = podium.concat(secondPlaces);
    if (podium.length < 3) podium = podium.concat(thirdPlaces);
    // podium contains all it needs and roleId contains necessary role
    // need to decide toAdd and toRemove
    for (const item of podium) {
      const uid = item.id;
      const user = await guild.members.fetch(uid);
      const hasRole = user.roles.cache.has(roles[item.placing - 1]);
      // if not has role, add the role
      if (!hasRole) {
        await addRole(user, roles[item.placing - 1]);
        await saveData(
          `INSERT INTO burgerLastRoleHavers (id, roleId) VALUES (?, ?)`,
          [item.id, item.roleId]
        );
      }
    }
    for (const item of oldRoleHavers) {
      // {id: text, roleId: text}
      // check to see if item is in podium with correct role
      // if so dont remove, else remove
      let remove = true;
      for (const podiumItem of podium) {
        if (podiumItem.id === item.id && podiumItem.roleId === item.roleId) {
          remove = false; // they are in the podium with the same role, so it does not need to be removed (also wont be included in toAdd as it checks if they have it already before adding)
        }
      }

      if (remove) {
        // Fetch the role object
        const role = guild.roles.cache.get(item.roleId);
        const user = await guild.members.fetch(item.id);
        if (!role) throw new Error("Role not found");
        await user.roles.remove(role);
        console.info(`Removed ${role.name} from ${user.user.username}`);
        await deleteData(`DELETE FROM burgerLastRoleHavers WHERE id=?`, [
          item.id,
        ]);
      }
    }
  } catch (error) {
    console.error(error);
  }
}

async function addRole(user, roleId) {
  try {
    const role = guild.roles.cache.get(roleId);
    if (!role) throw new Error("Role not found");
    // Add the role to the member
    await user.roles.add(role);
    console.info(`Added role ${role.name} to user ${user.user.tag}`);
  } catch (error) {
    console.error(error);
  }
}

module.exports = {
  burgerMsg,
  burgerLbMsg,
};
