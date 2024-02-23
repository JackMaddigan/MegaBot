const {
  getWeek,
  deleteAllResults,
  saveWeek,
  getRankedResults,
} = require("./db");
const { formatTime } = require("./submit");
const cube = require("scrambler-util");

async function sendPodium(
  results,
  resultsChannel,
  scramblesChannel,
  adminChannel
) {
  var week = await getWeek();
  const medals = [":first_place:", ":second_place:", ":third_place:"];
  var title = `Week ${week} podium:`;
  const footer = {
    text: "Congrats to the podium winners! All results can be found in the pinned Google Sheet.",
  };
  var podiumText = "";
  for (let i = 0; i < Math.min(3, results.length); i++) {
    podiumText += `${medals[results[i].placing - 1]} <@${
      results[i].uid
    }> **${formatTime(results[i].average)}** average\n${
      results[i].timeList
    }\n\n`;
  }
  const embedContent = {
    color: 0xe5cb7a, // Hex color code
    title: title,
    description: podiumText,
    footer: footer,
  };
  resultsChannel
    .send({
      embeds: [embedContent],
    })
    .then(() => {
      deleteAllResults();
      week++;
      sendAdminFullResults(results, adminChannel);
      saveWeek(week);
      scrambles(week, scramblesChannel);
    })
    .catch((error) => {
      console.log(error);
    });
}

async function scrambles(week, scramblesChannel) {
  const scrambles = cube("mega", 5);

  let scrambleText =
    "<@&" + process.env.weeklyCompPingRole + "> New scrambles are up!```";
  for (let i = 0; i < scrambles.length; i++) {
    console.log(scrambles[i]);
    var linesArray = scrambles[i].split("\n");
    console.log(linesArray);
    for (let j = 1; j < linesArray.length - 1; j++) {
      linesArray[j] = "\t" + linesArray[j];
    }
    scrambles[i] = linesArray.join("\n\u200B");
    scrambleText += `${i + 1}.  ${scrambles[i]}\n`;
  }
  scrambleText +=
    "```\nSend your results in <#" +
    process.env.submitTimesChannelId +
    "> using the /submit command. New scrambles will be posted every Monday at 10pm UTC. You can find results from last week's competition in the pinned message in <#" +
    process.env.resultsChannelId +
    ">";
  scramblesChannel.send(scrambleText);
}

async function sendAdminFullResults(results, adminChannel) {
  var text = "";
  var data = [
    [
      "Rank",
      "Name",
      " Solve 1",
      "Solve 2",
      "Solve 3",
      "Solve 4",
      " Solve 5",
      "Average",
    ],
  ];
  for (let i = 0; i < results.length; i++) {
    data.push([
      results[i].placing,
      results[i].username,
      formatTime(results[i].solves[0]),
      formatTime(results[i].solves[1]),
      formatTime(results[i].solves[2]),
      formatTime(results[i].solves[3]),
      formatTime(results[i].solves[4]),
      formatTime(results[i].average),
    ]);
  }
  console.log(data);
  // Format data into columns and rows for Google Sheets
  const formattedText = data.map((row) => row.join(";")).join("\n");

  // Send the message with the formatted text
  adminChannel.send(
    `\`\`\`${formattedText}\`\`\`\nAfter pasting into google sheets, click data -> split text to columns -> and select the separator as a semicolon`
  );
}

async function currentRankings(interaction) {
  const results = await getRankedResults();
  var rankingsText = "";
  for (let i = 0; i < results.length; i++) {
    rankingsText += `> #${results[i].placing}. ${
      results[i].username
    } **${formatTime(results[i].average)}** average\n> *${
      results[i].timeList
    }*\n\n`;
  }

  interaction.reply({
    embeds: [
      {
        color: 0xe5cb7a, // Hex color code
        title: "Current Comp Rankings",
        description: rankingsText,
      },
    ],
  });
}

module.exports = { sendPodium, scrambles, currentRankings };
