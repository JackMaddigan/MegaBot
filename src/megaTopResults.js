const { readData, deleteData, bulkSaveData } = require("./db");
const { EmbedBuilder } = require("discord.js");
const { toDisp } = require("./compHelpers");

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
    return data;
  } catch (error) {
    console.error("There was a problem fetching the data:", error);
    return null;
  }
}

async function checkRankings(channel) {
  try {
    const toNotify = [];
    const newTopPlayerResultsArrayToSaveToDB = [];
    const types = ["single", "average"];
    for (const type of types) {
      var newTopPlayerResults = (await fetchNewRankings(type))?.items.splice(
        0,
        25
      );
      const oldTopPlayerResults = await readData(
        `SELECT * FROM lastTopPlayers WHERE type=?`,
        [type]
      );
      // console.log("oldTopPlayerResults", oldTopPlayerResults);
      for (const newResult of newTopPlayerResults) {
        // Make item to put in array to save to db
        newTopPlayerResultsArrayToSaveToDB.push([
          newResult.personId,
          type,
          newResult.best,
        ]);

        // Add new things to save but don't add anything to toNotify because the db will be empty and it will spam old records
        if (oldTopPlayerResults.length === 0) continue;

        // for each newResult check if oldTopPlayerResults already has the newResult meaning it would not be new
        const newResultIsOld = oldTopPlayerResults.some((oldResult) => {
          return (
            oldResult.wcaId === newResult.personId &&
            oldResult.result === newResult.best
          );
        });

        // Add to array to notify only if not a record NOTE this contains records, need to filter in sendTopResultEmbeds so China records can be included after finding nationality
        if (!newResultIsOld) {
          toNotify.push(newResult);
        }
      }
    }
    await sendTopResultEmbeds(toNotify, channel);
    await deleteData(`DELETE FROM lastTopPlayers`, []);
    await bulkSaveData(
      `INSERT INTO lastTopPlayers (wcaId, type, result) VALUES (?, ?, ?)`,
      newTopPlayerResultsArrayToSaveToDB
    );
  } catch (error) {
    console.error(error);
  }
}

async function sendTopResultEmbeds(results, channel) {
  try {
    const top25Ping = process.env.top25Ping;
    for (const result of results) {
      // fetch user info from api
      const userData = await fetchUserInfo(result.personId);
      // create and send the embed
      // exclude records
      if (result.rank.country !== 1 || userData.country === "CN") {
        const color =
          result.rank.world === 1
            ? "#f44336"
            : result.rank.continent === 1
            ? "#ffeb3b"
            : result.rank.country === 1
            ? "00e676"
            : "#1976d2";
        const resultEmbed = new EmbedBuilder()
          .setColor(color)
          .setTitle(`Megaminx ${result.rankType} of ${toDisp(result.best)}`)
          .setAuthor({
            name: `${userData.name}`,
          })
          .setDescription(
            ` :flag_${userData.country.toLowerCase()}: WR${
              result.rank.world
            } CR${result.rank.continent} NR${result.rank.country}`
          )
          .setTimestamp();

        await channel
          .send({
            embeds: [resultEmbed],
            content: `<@&${top25Ping}>`,
          })
          .catch((error) => {
            console.error(error);
          });
      }
    }
  } catch (error) {
    console.error(error);
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
