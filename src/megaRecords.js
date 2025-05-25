const { EmbedBuilder } = require("discord.js");
const { toDisp } = require("./compHelpers");
const { recentRecordsQuery } = require("./queries");
const { readData, saveData } = require("./db");
const missingAvatar =
  "https://www.worldcubeassociation.org/assets/missing_avatar_thumb-d77f478a307a91a9d4a083ad197012a391d5410f6dd26cb0b0e3118a5de71438.png";

const getColorOfTag = {
  WR: "#f44336",
  CR: "#ffeb3b",
  NR: "#00e676",
};

const eventIds = new Set(["minx"]);

const getPicPath = {
  WR: "https://raw.githubusercontent.com/JackMaddigan/images/main/wr.png",
  CR: "https://raw.githubusercontent.com/JackMaddigan/images/main/cr.png",
  NR: "https://raw.githubusercontent.com/JackMaddigan/images/main/nr.png",
};

const roles = {
  WR: process.env.wrPing,
  CR: process.env.crPing,
  NR: process.env.nrPing,
};

const interval = 900000; // One hour in milliseconds is 3600000, 1 day is 8.64e+7, 1 week is 6.048e+8, 15 min 900000

async function fetchRecentRecords(client) {
  try {
    console.log(await readData(`SELECT * FROM announcedRecords`));
    console.log(eventIds);
    const data = await fetchWCALiveQuery(recentRecordsQuery);

    // Sort data to include only events in the eventIds set
    const recentRecords = data.data.recentRecords.filter((recentRecord) =>  
      eventIds.has(recentRecord.result.round.competitionEvent.event.id)
    );

    for (const recentRecord of recentRecords) {
      console.log(await readData(`SELECT * FROM announcedRecords`));

      // Make result id key
      const resultKey = 
        `${recentRecord.type}_${recentRecord.attemptResult}_${recentRecord.result.person.wcaId}_${recentRecord.result.round.id}`;
      
      // Skip if it was already announced
      const skip = (await readData(`SELECT id FROM announcedRecords WHERE key=?`, [resultKey])).length > 0;
      if(skip) { continue; }

      // Save new record to db
      await saveData(`INSERT INTO announcedRecords (key) VALUES (?)`, [resultKey]);

      const result = toDisp(recentRecord.attemptResult);
      const embed = new EmbedBuilder()
        .setAuthor({
          name: recentRecord.result.person.name,
          iconURL: recentRecord.result.person.avatar?.thumbUrl || missingAvatar,
          url: `https://www.worldcubeassociation.org/persons/${recentRecord.result.person.wcaId}`,
        })
        .setColor(getColorOfTag[recentRecord.tag])
        .setTitle(`Megaminx ${recentRecord.type} of ${result}`)
        .setURL(
          `https://live.worldcubeassociation.org/competitions/${recentRecord.result.person.competition.id}/rounds/${recentRecord.result.round.id}`
        )
        .setDescription(
          `${
            recentRecord.result.person.country.name
          } :flag_${recentRecord.result.person.country.iso2.toLowerCase()}:\n${
            "(" +
            recentRecord.result.attempts
              .map((attempt) => toDisp(attempt.result, 1))
              .join(", ") +
            ")"
          }`
        )
        .setThumbnail(getPicPath[recentRecord.tag])
        .setTimestamp();
      const rolePing = `<@&${roles[recentRecord.tag]}>`;
      await client.channels.cache
        .get(process.env.recordsChannelId)
        .send({ embeds: [embed], content: rolePing })
        .catch((error) => console.error(error));
    }
  } catch (error) {
    console.error(error);
  }
}

async function fetchWCALiveQuery(query) {
  try {
    const url = "https://live.worldcubeassociation.org/api";
    const headers = {
      "Content-Type": "application/json",
    };
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({
        query: query,
      }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(error);
  }
}

module.exports = { fetchRecentRecords };
