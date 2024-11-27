const { saveData, readData, deleteData } = require("../db");
const { events } = require("./events");
const cstimer = require("cstimer_module");
const fs = require("fs");
const { EmbedBuilder } = require("@discordjs/builders");
const Submission = require("./Submission");

async function handleWeeklyComp(client) {
  let week = await getWeek();
  const resultsChannel = client.channels.cache.get(
    process.env.podiumsChannelId
  );
  const adminChannel = client.channels.cache.get(process.env.adminChannelId);
  const rankedResultsData = await generateRankedResults();
  const podiumsTitle = `Week ${week} results!`;
  await sendPodiums(resultsChannel, rankedResultsData, podiumsTitle);
  await sendResultsFile(adminChannel, rankedResultsData);
  await deleteData(`DELETE FROM results WHERE eventId != ?`, ["extra"]);
  week++;
  const submitChannel = client.channels.cache.get(process.env.submitChannelId);
  await submitChannel.send(`## Week ${week}`);
  await sendScrambles(
    client.channels.cache.get(process.env.scramblesChannelId)
  );
  await saveData(
    `INSERT INTO key_value_store (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
    ["week", week]
  );
}

async function handleSubmit(int) {
  const sub = new Submission(int);

  if (sub.error) {
    await int.reply({ ephemeral: true, content: sub.error });
    return;
  }

  await int.reply({
    ephemeral: sub.showSubmitFor,
    content: sub.response.text,
  });

  await saveData(
    `INSERT INTO results (userId, username, eventId, attempts, best, average) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(userId, eventId) DO UPDATE SET username = excluded.username, attempts = excluded.attempts, best = excluded.best, average = excluded.average`,
    sub.data
  );
}

async function handleUnsubmit(int) {
  const isMod = int.member.roles.cache.has(process.env.modRoleId);
  if (!isMod) {
    await int.reply({ ephemeral: true, content: "Missing permission!" });
    return;
  }
  const user = int.options.getUser("user");
  if (!user) return;
  const eventId = int.options.getString("event");

  await deleteData(`DELETE FROM results WHERE userId=? AND eventId=?`, [
    user.id,
    eventId,
  ]);
  await int.reply({ ephemeral: true, content: "Removed successfully!" });
}

async function handleView(int) {
  const data = await readData(`SELECT * FROM results WHERE userId=?`, [
    int.member.id,
  ]);
  const fields = [];
  for (const result of data) {
    fields.push({
      name: events[result.eventId].name,
      value: new events[result.eventId].obj(
        result.userId,
        result.username,
        result.eventId,
        result.attempts,
        result.best,
        result.average
      ).toViewString(),
      inline: true,
    });
  }
  const embed = new EmbedBuilder()
    .setTitle(`Results for ${int.member.displayName}`)
    .setColor(0x7289dd);

  if (fields.length === 0) {
    embed.setDescription("No results yet!");
  } else {
    embed.addFields(fields);
  }
  await int.reply({ ephemeral: true, embeds: [embed] });
}

async function sendPodiums(resultsChannel, rankedResultsData, title) {
  // make podium text
  await resultsChannel.send(title);
  for (const eventId in rankedResultsData) {
    const results = rankedResultsData[eventId];
    // no results or first one is dnf
    if (results.length == 0 || results[0]?.isDnf) continue;
    let text = ""; //`**${events[eventId].name}**`;
    for (const result of results) {
      // only include podium places
      if (result.placing > 3) break;
      text += result.toPodiumString();
    }
    await resultsChannel.send(text);
  }
}

async function sendResultsFile(adminChannel, rankedResultsData) {
  let text = "Placing,Name,Average,Best,Solves";
  for (const eventId in rankedResultsData) {
    const results = rankedResultsData[eventId];
    if (results.length == 0) continue;
    // text += `${events[eventId].name}\n`;
    for (const result of results) {
      text += result.toTxtFileString();
    }
    text += "\n\n";
  }
  text = text.trim();
  fs.writeFile("results.txt", text || "No Results", function (err) {
    if (err) throw err;
  });
  await adminChannel.send({ files: ["results.txt"] });
}

async function sendScrambles(scrambleChannel) {
  try {
    const scrambles = 5;
    let scrambleText =
      "<@&" + process.env.weeklyCompRole + "> New scrambles are up!```";
    for (let i = 0; i < scrambles; i++) {
      let scramble = cstimer.getScramble("mgmp", 70);
      var linesArray = scramble.split("\n");
      for (let j = 1; j < linesArray.length - 1; j++) {
        linesArray[j] = "\t" + linesArray[j];
      }
      scramble = linesArray.join("\n\u200B");
      scrambleText += `${i + 1}.  ${scramble}\n`;
    }
    scrambleText +=
      "```\nSend your results in <#" +
      process.env.submitChannelId +
      "> using the /submit command. New scrambles will be posted every Monday at 10pm UTC. You can find results from last week's competition in the pinned message in <#" +
      process.env.resultsChannelId +
      ">";
    await scrambleChannel.send(scrambleText);
  } catch (error) {
    console.error(error);
  }
}

async function generateRankedResults() {
  const allResults = await readData(`SELECT * FROM results`);
  // make key value object with all event ids from the event-info file
  const eventResults = {};
  Object.keys(events).forEach((key) => (eventResults[key] = []));

  // add all the results as new result objects to their corresponding arrays
  for (const result of allResults) {
    const resultConstructor = events[result.eventId].obj;
    // skip if it is an extra event result when there is no valid extra event, although this shouldn't happen
    if (resultConstructor == null) continue;
    eventResults[result.eventId].push(
      new resultConstructor(
        result.userId,
        result.username,
        result.eventId,
        result.attempts,
        result.best,
        result.average
      )
    );
  }

  // sort and give places
  for (const eventId in eventResults) {
    eventResults[eventId].sort((a, b) => a.compare(b));
    for (let i = 0; i < eventResults[eventId].length; i++) {
      if (i == 0) {
        eventResults[eventId][i].placing = 1;
        continue;
      }
      eventResults[eventId][i].givePlacing(eventResults[eventId][i - 1], i);
    }
  }
  return eventResults;
}

async function handleCurrentRankings(int) {
  const rankedResults = await generateRankedResults();
  let text = "";
  for (const [eventId, eventResults] of Object.entries(rankedResults)) {
    if (eventResults.length === 0) continue;
    text += `**${events[eventId].name}**`;
    for (const eventResult of eventResults) {
      text += `\n${eventResult.toCRString()}`;
    }
    text += "\n";
  }
  const embed = new EmbedBuilder()
    .setTitle("Current Weekly Comp Rankings")
    .setDescription(text.length === 0 ? "No results yet!" : text)
    .setColor(0x7289dd);
  await int.reply({ ephemeral: true, embeds: [embed] });
}

async function getWeek() {
  const weekData = await readData(
    `SELECT value FROM key_value_store WHERE key=?`,
    ["week"]
  );
  let week = 75; // set as default week
  if (weekData.length > 0) week = weekData[0].value;
  return week;
}

module.exports = {
  handleCurrentRankings,
  handleSubmit,
  handleUnsubmit,
  handleView,
  handleWeeklyComp,
};
