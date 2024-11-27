const { EmbedBuilder } = require("@discordjs/builders");
const { readData, saveData, deleteData } = require("./db");
const { sendPaginatedEmbeds } = require("discord.js-embed-pagination");
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
    let coolDownTime = userLastBurgerTime
      ? timeNow - userLastBurgerTime
      : 15000;

    // Already called burger in last 15 seconds
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
      return;
    }

    // Bot must have started up and lost the variable values
    if (lastBurger == null) {
      lastBurger =
        Number(
          (
            await readData(
              `SELECT value FROM key_value_store WHERE key=? LIMIT 1`,
              "lastBurger"
            )
          )[0]?.value
        ) || 0;

      lastBurgerUser =
        (
          await readData(`SELECT * FROM key_value_store WHERE key=? LIMIT 1`, [
            "lastBurgerUser",
          ])
        )[0]?.value || null;
    }

    let difference = timeNow - lastBurger;
    // set last burger time for the user for the cooldown
    lastBurgerTimes[msg.author.id] = timeNow;
    if (difference >= burgerWaitDuration) {
      // it has been 6 hours
      const uid = msg.author.id;
      const username = msg.member.displayName;
      lastBurger = timeNow;
      lastBurgerUser = username;
      await msg.reply(":hamburger:");

      const query = `
  INSERT INTO key_value_store (key, value)
  VALUES (?, ?)
  ON CONFLICT(key) 
  DO UPDATE SET value=excluded.value
`;

      await Promise.all([
        saveData(query, ["lastBurger", timeNow]),
        saveData(query, ["lastBurgerUser", lastBurgerUser]),
      ]);

      await saveData(
        `INSERT INTO burgerLeaderboard (id, score, username)
VALUES (?, ?, ?)
ON CONFLICT(id) 
DO UPDATE SET score = score + excluded.score, username = excluded.username`,
        [uid, 1, username]
      );

      await updateBurgerRoles(msg.guild);
    } else {
      let timeTillBurger = Math.round((burgerWaitDuration - difference) / 1000);
      await msg.reply(
        `Burger was already called by **${lastBurgerUser}**, and can be called again in ${
          Math.round((timeTillBurger / 3600) * 100) / 100
        } hours.`
      );
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
    text += `#${item.placing}. ${item.username} **${item.score}**\n`;
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
    let secondPlaces = burgerRankings.filter((item) => item.placing === 2);
    let thirdPlaces = burgerRankings.filter((item) => item.placing === 3);

    if (podium.length < 3) podium = podium.concat(secondPlaces);
    if (podium.length < 3) podium = podium.concat(thirdPlaces);
    for (const item of podium) {
      item.roleId = roles[item.placing - 1];
    }

    // remove where podium does not have the oldRoleHaver
    const toRemove = oldRoleHavers.filter(
      (oldRoleHaver) =>
        !podium.some(
          (podiumItem) =>
            podiumItem.id === oldRoleHaver.id &&
            podiumItem.roleId === oldRoleHaver.roleId
        )
    );

    // include where oldRoleHavers does not have the role and user pair
    const toAdd = podium.filter(
      (podiumer) =>
        !oldRoleHavers.some(
          (oldRoleHaver) =>
            oldRoleHaver.id === podiumer.id &&
            oldRoleHaver.roleId === podiumer.roleId
        )
    );

    // remove roles from toRemove
    await Promise.all(
      toRemove.map(async (item) => {
        const user = await guild.members.fetch(item.id);
        await removeRole(user, item.roleId, guild);
      })
    );

    // add roles from toAdd
    await Promise.all(
      toAdd.map(async (item) => {
        const user = await guild.members.fetch(item.id);
        await addRole(user, item.roleId, guild);
      })
    );
  } catch (error) {
    console.error(error);
  }
}

async function addRole(user, roleId, guild) {
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

async function removeRole(user, roleId, guild) {
  try {
    const role = guild.roles.cache.get(roleId);
    if (!role) throw new Error("Role not found");
    // Add the role to the member
    await user.roles.remove(role);
    console.info(`Removed role ${role.name} to user ${user.user.tag}`);
  } catch (error) {
    console.error(error);
  }
}

module.exports = {
  burgerMsg,
  burgerLbMsg,
  updateBurgerRoles,
};
