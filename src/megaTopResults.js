const { getData, saveData } = require("./db");
const { EmbedBuilder } = require("discord.js");
const { centiToTime } = require("./megaRecords");

async function fetchNewRankings(type) {
  try {
    const response = await fetch(
      "https://raw.githubusercontent.com/robiningelbrecht/wca-rest-api/master/api/rank/world/" +
        type +
        "/minx.json"
    );

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const data = await response.json();
    return data; // Optionally return the data
  } catch (error) {
    console.error("There was a problem fetching the data:", error);
    return null; // Return null or handle the error as needed
  }
}
async function checkRankings(channel) {
  var fullSingleData = await fetchNewRankings("single");
  var singleData = fullSingleData.items;
  var singleTop25 = [];
  for (let i = 0; i < 25; i++) {
    if (i > 0) {
      if (singleData[i].personId === singleData[i - 1].personId) {
        // remove duplicate
        singleData.splice(i, 1);
      }
    }
    // add to array
    singleTop25.push(singleData[i]);
  }
  var fullAverageData = await fetchNewRankings("average");
  var averageData = fullAverageData.items;
  var averageTop25 = [];
  for (let i = 0; i < 25; i++) {
    if (i > 0) {
      if (averageData[i].personId === averageData[i - 1].personId) {
        // remove duplicate
        singleData.splice(i, 1);
      }
    }

    averageTop25.push(averageData[i]);
  }

  //   for each type check if wcaid and time !matches an old entry
  //   returns array of all new records and also saves up to date records to db
  const newTop25Results = await getNewTopResults(averageTop25, singleTop25);
  //   send new top results
  sendTopResultEmbeds(newTop25Results, channel);
}

async function getNewTopResults(averageTop25, singleTop25) {
  const oldTop25Single = await getData("/oldRankings/oldTop25Single");
  const oldTop25Average = await getData("/oldRankings/oldTop25Average");
  var newTop25Averages = returnNewTop25Results(oldTop25Average, averageTop25);
  var newTop25Singles = returnNewTop25Results(oldTop25Single, singleTop25);
  var newTop25Results = newTop25Averages.concat(newTop25Singles);

  //   newTop25Results now has all the new top 25 results
  //   Save most recent data to db
  var singlesToSave = {};
  var averagesToSave = {};
  for (let i = 0; i < averageTop25.length; i++) {
    singlesToSave[singleTop25[i]["personId"]] = singleTop25[i]["best"];
    averagesToSave[averageTop25[i]["personId"]] = averageTop25[i]["best"];
  }
  saveData("/oldRankings/oldTop25Single", singlesToSave);
  saveData("/oldRankings/oldTop25Average", averagesToSave);
  return newTop25Results;
}

function returnNewTop25Results(oldData, newData) {
  // used for both single and average and returns that to getNewTopResults which combines into one array
  var newTop25Results = [];
  for (let i = 0; i < newData.length; i++) {
    if (oldData) {
      let uid = newData[i]["personId"];
      if (oldData[uid]) {
        if (oldData[uid] > newData[i]["best"]) {
          // new top 25 result
          newTop25Results.push(newData[i]);
        }
      } else {
        // not in oldData so new top 25 result
        newTop25Results.push(newData[i]);
      }
    } else {
      // all new top 25 results - oldData does not exist
      newTop25Results.push(newData[i]);
    }
  }
  return newTop25Results;
}

async function sendTopResultEmbeds(results, channel) {
  console.log(`Sending ${results.length} embeds minus the records...`);
  for (let i = 0; i < results.length; i++) {
    // fetch user info from api
    const userData = await fetchUserInfo(results[i].personId);
    // create and send the embed
    // exclude records
    if (results[i].rank.country !== 1) {
      const resultEmbed = new EmbedBuilder()
        .setColor("#1976d2")
        .setTitle(
          `Megaminx ${results[i].rankType} of ${centiToTime(results[i].best)}`
        )
        .setAuthor({
          name: `${userData.name}`,
          //   iconURL: record.result.person.avatar.thumbUrl || missingAvatar,
          //   url: `https://www.worldcubeassociation.org/persons/${record.result.person.wcaId}`,
        })
        .setDescription(
          ` :flag_${userData.country.toLowerCase()}: WR${
            results[i].rank.world
          } CR${results[i].rank.continent} NR${results[i].rank.country}`
        )
        .setTimestamp()
        .setFooter({
          text: "Recently ",
        });

      // .setThumbnail(getPicPath[record.tag])
      // .setTimestamp();

      channel
        .send({
          embeds: [resultEmbed],
          content: `<@&${process.env.top25Ping}>`,
        })
        .catch((error) => {
          console.error(error);
        });
    }
  }
}

async function fetchUserInfo(wcaId) {
  try {
    const response = await fetch(
      "https://raw.githubusercontent.com/robiningelbrecht/wca-rest-api/master/api/persons/" +
        wcaId +
        ".json"
    );

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const data = await response.json();
    return { name: data.name, country: data.country }; // Optionally return the data
  } catch (error) {
    console.error("There was a problem fetching the data:", error);
    return null; // Return null or handle the error as needed
  }
}

module.exports = { checkRankings };
