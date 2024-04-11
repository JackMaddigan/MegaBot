// Import the GraphQLClient class from graphql-request
const { GraphQLClient } = require("graphql-request");
const { getData, saveData } = require("./db");
const { EmbedBuilder } = require("discord.js");
// Define your GraphQL endpoint
const endpoint = "https://live.worldcubeassociation.org/api/graphql"; // Replace with your actual GraphQL endpoint
const missingAvatar =
  "https://www.worldcubeassociation.org/assets/missing_avatar_thumb-d77f478a307a91a9d4a083ad197012a391d5410f6dd26cb0b0e3118a5de71438.png";
// Define your GraphQL query
const query = `
  {
    recentRecords{
      type
      tag
      id
      attemptResult
      result {
        attempts{
          result
        }
        person {
          name
          wcaId
          avatar{
            thumbUrl
          }
          country {
            iso2
            name
          }
        }
        round {
          id
          competitionEvent{
            event {
              id
              name
            }
            competition {
              id
              name
            }
          }
        }
      }
    }
  }
`;

async function fetchRecords() {
  try {
    // Create a new GraphQLClient instance with your endpoint
    const client = new GraphQLClient(endpoint);
    // Execute the GraphQL query
    const data = await client
      .request(query)
      .catch((error) => console.error("Error:", error));
    return data.recentRecords;
  } catch (error) {
    console.error(error);
  }
}

async function getFilteredRecords(recordsChannel) {
  const oldRecordsPath = "/oldRecords/";
  // get data from wca live
  const data = await fetchRecords();
  // get old records from db
  var oldRecords = (await getData(oldRecordsPath)) || {};

  //   add all old records ids to an array
  var oldRecordIds = [];
  if (Object.keys(oldRecords).length > 0) {
    for (const key in oldRecords) {
      oldRecordIds.push(key);
    }
  }

  //   Save all records that are megaminx and not an old record to filteredRecords
  const filteredRecords = data.filter((record) => {
    return (
      record.result.round.competitionEvent.event.id === "minx" &&
      !oldRecordIds.includes(record.id)
    );
  });
  //   records are all new and need to be sent
  console.log(JSON.stringify(filteredRecords, null, 2));

  const timestamp = Date.now();

  //    Add all the new records to the old records and save to db and send embed
  for (let i = 0; i < filteredRecords.length; i++) {
    oldRecords[filteredRecords[i].id] = timestamp;
    createAndSendEmbed(filteredRecords[i], recordsChannel);
  }
  saveData(oldRecordsPath, oldRecords);

  //    Loop through records and create embed and send
}

async function createAndSendEmbed(record, recordsChannel) {
  const roleToPing = getRoleToPing[record.tag];
  console.log(record.result.attempts);
  const timeList = `*(${centiToTime(
    record.result.attempts[0].result
  )}, ${centiToTime(record.result.attempts[1].result)}, ${centiToTime(
    record.result.attempts[2].result
  )}, ${centiToTime(record.result.attempts[3].result)}, ${centiToTime(
    record.result.attempts[4].result
  )})*`;

  const recordEmbed = new EmbedBuilder()
    .setColor(getColorOfTag[record.tag])
    .setTitle(`Megaminx ${record.type} of ${centiToTime(record.attemptResult)}`)
    .setURL(
      `https://live.worldcubeassociation.org/competitions/${record.result.round.competitionEvent.competition.id}/rounds/${record.result.round.id}`
    )
    .setAuthor({
      name: record.result.person.name,
      iconURL: record.result.person.avatar.thumbUrl || missingAvatar,
      url: `https://www.worldcubeassociation.org/persons/${record.result.person.wcaId}`,
    })
    .setDescription(
      `${
        record.result.person.country.name
      } :flag_${record.result.person.country.iso2.toLowerCase()}:\n${timeList}\n<@&${
        process.env.top25Ping
      }>`
    )
    .setThumbnail(getPicPath[record.tag])
    .setTimestamp();

  recordsChannel.send({ embeds: [recordEmbed] });
}

const getColorOfTag = {
  WR: "#f44336",
  CR: "#ffeb3b",
  NR: "#00e676",
};

const getPicPath = {
  WR: "https://raw.githubusercontent.com/JackMaddigan/images/main/wr.png",
  CR: "https://raw.githubusercontent.com/JackMaddigan/images/main/cr.png",
  NR: "https://raw.githubusercontent.com/JackMaddigan/images/main/nr.png",
};

const getRoleToPing = {
  WR: process.env.wrPing,
  CR: process.env.crPing,
  NR: process.env.nrPing,
};

// console.log(centiToTime(6303));

function centiToTime(centi) {
  if (centi === 0 || centi === -2) {
    return "DNS";
  } else if (centi === -1) {
    return "DNF";
  } else {
    const seconds = ((centi % 6000) / 100).toFixed(2);
    const minutes = Math.floor(centi / 6000);
    const display =
      minutes === 0 ? seconds : minutes + ":" + seconds.padStart(5, 0);
    return display;
  }
}

module.exports = {
  getFilteredRecords,
  centiToTime,
};
