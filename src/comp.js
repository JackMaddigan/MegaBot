const { EmbedBuilder } = require("@discordjs/builders");
const cstimer = require("cstimer_module");
const fs = require("fs");
const {
  checkModRole,
  replyToInt,
  checkIfSubbed,
  getEventInfo,
  validateResults,
  calculateRI,
  makeSubmissionReplyMsg,
  eventIdToName,
  toDisp,
} = require("./compHelpers");
const { saveData, deleteData, readData } = require("./db");

async function handleSubmit(int) {
  try {
    const isMod = await checkModRole(int);
    const eventId = "minx";
    const user = int.options.getUser("submit-for");
    const results = int.options
      .getString("results")
      .split(/[,\s]+/)
      .map((result) => result.toLowerCase()); // split when there is a tab, space, comma
    const ui = {
      submitFor: user && isMod ? true : false,
      user: user && isMod ? user : int.user,
    };
    ui.ephemeral = ui.submitFor ? true : false;
    const ei = getEventInfo(eventId);
    if (await checkIfSubbed(ui.user.id, eventId)) {
      return await replyToInt(
        int,
        `You have already submitted results for ${ei.eventDisplayName} this week!`,
        true
      );
    }
    const errorMsg = validateResults(results, ei);
    if (errorMsg.length > 0) {
      return await replyToInt(int, errorMsg, true);
    }
    // results are all valid, calculate stats
    const ri = calculateRI(results, ei);
    const replyMsg = makeSubmissionReplyMsg(ei, ri, ui);
    await replyToInt(int, replyMsg, ui.ephemeral);
    const query = `INSERT INTO results (userId, userName, eventId, list, best, average, eventFormat) VALUES (?,?,?,?,?,?,?)`;
    const parameters = [
      ui.user.id,
      ui.user.username,
      ei.eventId,
      ri.list,
      ri.best,
      ri.average,
      ei.format,
    ];
    await saveData(query, parameters);
  } catch (error) {
    console.error(error);
  }
}

async function unsubmit(int) {
  try {
    const isMod = await checkModRole(int);
    if (!isMod) return;
    const userToUnsub = int.options.getUser("user");
    const eventId = "minx"; // int.options.getString("event");
    await deleteData(`DELETE FROM results WHERE eventId=? AND userId=?`, [
      eventId,
      userToUnsub.id,
    ]);
    await int.reply({ content: "Deleted", ephemeral: true });
  } catch (error) {
    throw error;
  }
}

async function viewMyResults(int) {
  try {
    const results = await readData(`SELECT * FROM results WHERE userId=?`, [
      int.user.id,
    ]);
    const fields = [];
    // { name: 'Inline field title', value: 'Some value here', inline: true },
    for (const result of results) {
      const text =
        result.eventFormat === "bo3"
          ? `Best: ${toDisp(result.best)}\nAvg: ${toDisp(
              result.average
            )}\n*-# (${result.list})*`
          : `Avg: ${toDisp(result.average)}\nBest: ${toDisp(
              result.best
            )}\n-# *(${result.list})*`;
      fields.push({
        name: `**${eventIdToName[result.eventId]}**`,
        value: text,
        inline: true,
      });
    }
    const embed = new EmbedBuilder()
      .setColor(0xec2d01)
      .addFields(fields)
      .setTitle(`Results for ${int.user.username}`);
    await int
      .reply({ embeds: [embed], ephemeral: true })
      .catch((error) => console.error(error));
  } catch (error) {
    console.error(error);
  }
}

// async function handleScrambleCommand(int) {
//   try {
//     await int.deferReply().catch((error) => console.error(error));
//     const [scrCode, scrLength] = int.options.getString("event").split(" ");
//     const quantity = int.options.getInteger("quantity");
//     var msg = "";
//     for (let i = 0; i < quantity; i++)
//       msg += `${i + 1}) ${cstimer.getScramble(scrCode, scrLength)}\n`;
//     await int.editReply(msg).catch((error) => console.error(error));
//   } catch (error) {
//     console.error(error);
//   }
// }

async function postScrambles(scrambleChannel) {
  try {
    const scrambles = 5;
    let scrambleText =
      "<@&" + process.env.weeklyCompPingRoleId + "> New scrambles are up!```";
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
      process.env.submitTimesChannelId +
      "> using the /submit command. New scrambles will be posted every Monday at 10pm UTC. You can find results from last week's competition in the pinned message in <#" +
      process.env.resultsChannelId +
      ">";
    await scrambleChannel.send(scrambleText);
  } catch (error) {
    console.error(error);
  }
}

async function handleComp(client) {
  try {
    let week = await readData(`SELECT week FROM comp LIMIT 1`);
    if (week.length === 0) week = 62;
    else week = week[0].week;
    // get ranked results
    const eventArrays = await getRankedResults();
    // post results
    await sendResults(client, eventArrays, week);
    // update week
    week++;
    const scrambleChannel = client.channels.cache.get(
      process.env.scrambleChannelId
    );
    // delete old scrambles
    // await deleteLast50Messages(scrambleChannel);
    // send scrambles
    await postScrambles(scrambleChannel);
    // delete old results
    await deleteData(`DELETE FROM results`, []);
    await saveData(
      `INSERT INTO comp (compData, week) VALUES(?, ?) ON CONFLICT(compData) DO UPDATE SET week=excluded.week`,
      ["compData", week]
    );
  } catch (error) {
    console.error(error);
  }
}

async function getRankedResults() {
  try {
    const eventArrays = {};
    for (const eventId in eventIdToName) {
      const eventResults = await readData(
        `SELECT * FROM results WHERE eventId=?`,
        [eventId]
      );
      const ei = getEventInfo(eventId);
      const rankedResultsArray = rankEventArray(eventResults, ei);
      if (rankedResultsArray.length > 0)
        eventArrays[eventId] = rankedResultsArray;
    }
    return eventArrays;
  } catch (error) {
    console.error(error);
  }
}

function rankEventArray(eventResults, ei) {
  try {
    let finalRankedResultsArray = [];
    let dnfSingles = [];
    // split dnfs / dns from eventResults into dnfs array
    for (let i = 0; i < eventResults.length; i++) {
      const result = eventResults[i];
      if (result.best < 0) dnfSingles.push(...eventResults.splice(i, 1));
    }
    // add placings to dnfs
    for (const dnfResult of dnfSingles) {
      dnfResult.placing = eventResults.length + 1;
    }

    let dnfAverages = [];
    // move all dnf averages from eventResults into dnfAverages, so they can be sorted by single
    for (let i = 0; i < eventResults.length; i++) {
      const result = eventResults[i];
      if (result.average < 0) dnfAverages.push(eventResults.splice(i, 1));
    }
    dnfAverages = dnfAverages.sort((a, b) => a.best - b.best);
    eventResults = eventResults.sort((a, b) => {
      if (a.average === b.average) {
        return a.best - b.best;
      } else {
        return a.average - b.average;
      }
    });
    eventResults = eventResults.concat(...dnfAverages);
    addPlacingsToAvgEventResults(eventResults);
    // addPlacingsToBestEventResults(dnfAverages);
    finalRankedResultsArray = eventResults.concat(...dnfSingles);
    return finalRankedResultsArray;
  } catch (error) {
    console.error(error);
  }
}

function addPlacingsToAvgEventResults(eventResults) {
  for (let i = 0; i < eventResults.length; i++) {
    if (i === 0) {
      eventResults[i].placing = 1;
    }
    // if first in sorted list then give rank 1 regardless
    else if (eventResults[i].best < 0) {
      // dnf single and average, give last place possible
      eventResults[i].placing = eventResults.length + 1;
    } else if (
      eventResults[i].average > eventResults[i - 1].average ||
      eventResults[i].average < 0
    ) {
      eventResults[i].placing = i + 1;

      // if avg slower than previous rank or avg is dnf, give next rank
    } else if (eventResults[i].best > eventResults[i - 1].best) {
      // if single greater than other single then give next rank since averages must be the same
      eventResults[i].placing = i + 1;
    } else {
      eventResults[i].placing = eventResults[i - 1].placing; // else give same placing
    }
  }
}

function addPlacingsToBestEventResults(eventResults) {
  for (let i = 0; i < eventResults.length; i++) {
    if (i === 0) eventResults[i].placing = 1;
    else if (eventResults[i].best > eventResults[i - 1].best)
      eventResults[i].placing = i + 1;
    else eventResults[i].placing = eventResults[i - 1].placing;
  }
}

async function handleCurrentRankingsCommand(int) {
  try {
    let text = "";
    await int
      .deferReply({ ephemeral: true })
      .catch((error) => console.error(error));
    const eventArrays = await getRankedResults();
    for (const eventId in eventIdToName) {
      if (!eventArrays[eventId]) continue;
      const eventArray = eventArrays[eventId];
      if (eventArray[0].best < 0) continue;
      text += `**${eventIdToName[eventId]}**`;
      for (const result of eventArray) {
        text += `\n#${result.placing} ${result.userName} `;
        const resultText =
          result.eventFormat === "bo3"
            ? `**${toDisp(result.best)}**`
            : `**${toDisp(result.average)}**`;
        text += resultText; // + `\n-# *(${result.list})*`;
      }
      text += "\n\n";
    }

    if (text.length === 0) text += "No results yet!";
    const embed = new EmbedBuilder()
      .setTitle("Current Weekly Comp Rankings")
      .setDescription(text)
      .setColor(0xec2d01);
    await int
      .editReply({ embeds: [embed] })
      .catch((error) => console.error(error));
  } catch (error) {
    console.error(error);
  }
}

function placingToMedal(placing) {
  return placing === 1
    ? ":first_place:"
    : placing === 2
    ? ":second_place:"
    : ":third_place:";
}

async function sendResults(client, eventArrays, week) {
  try {
    const eventId = "minx";
    const resultsChannel = client.channels.cache.get(
      process.env.resultsChannelId
    );

    // Podiums
    // resultsChannel.send(`Week ${week} Results!`);
    // for (const [eventId] of compEvents) {
    let text = `Week ${week} Results!\n`;
    // let title = `**${eventIdToName[eventId]}**`;
    const eventArray = eventArrays[eventId];
    if (!eventArray) return;
    if (eventArray[0].best < 0) return;
    const firsts = eventArray.filter((result) => result.placing === 1);
    const seconds = eventArray.filter((result) => result.placing === 2);
    const thirds = eventArray.filter((result) => result.placing === 3);
    const resultsOnPodium =
      firsts.length >= 3
        ? firsts
        : firsts.length + seconds.length >= 3
        ? firsts.concat(...seconds)
        : firsts.concat(...seconds).concat(...thirds);
    for (const result of resultsOnPodium) {
      if (result.best < 0) break;
      const resultText = `**${toDisp(result.average)}** average`;
      text += `\n${placingToMedal(result.placing)} <@${
        result.userId
      }> ${resultText}\n-# *(${result.list})*`;
    }
    if (text.length > 0)
      await resultsChannel.send(text).catch((error) => console.error(error));
    // }

    // Text file
    let textFileText = "Placing,Name,Average,Best,Solves";
    // text += eventIdToName[eventId];
    for (const result of eventArray) {
      textFileText += `\n#${result.placing},${result.userName},${toDisp(
        result.average
      )},${toDisp(result.best)},${result.list}`;
    }
    // }
    fs.writeFileSync("./results.txt", textFileText);
    const adminChannel = await client.channels.cache.get(
      process.env.adminChannelId
    );
    await adminChannel
      .send({ files: ["./results.txt"] })
      .catch((error) => console.error(error));
  } catch (error) {
    console.error(error);
  }
}

module.exports = {
  handleSubmit,
  unsubmit,
  viewMyResults,
  handleComp,
  handleCurrentRankingsCommand,
};

/**
 * NOTE TO SELF
 * fix tiebreak on single
 *
 *
 */
