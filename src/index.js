require("dotenv").config();
const cron = require("node-cron");

const {
  Client,
  IntentsBitField,
  Partials,
  PermissionsBitField,
} = require("discord.js");
const {
  handleSubmit,
  unsubmit,
  viewMyResults,
  handleCurrentRankingsCommand,
  handleComp,
} = require("./comp");
const {
  adminDeleteResult,
  getRankedResults,
  getWeek,
  saveWeek,
  getBurgerInfo,
} = require("./db");
const { registerCommands } = require("./commands");
const {
  burger,
  burgerLb,
  burgerMsg,
  burgerLbMsg,
  updateBurgerRoles,
} = require("./burger");
const { getFilteredRecords, fetchRecentRecords } = require("./megaRecords");
const { checkRankings } = require("./megaTopResults");

const { sendPodium, scrambles, currentRankings } = require("./comp");
const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.login(process.env.botToken).then(() => {
  console.log("MegaBot is online!");
});

client.on("ready", async () => {
  const burgerEmoji = "🍔";
  await handleComp(client); // await registerCommands(client);
  // await fetchRecentRecords(client);
  client.user.setPresence({
    activities: [{ name: burgerEmoji }],
    // status: "idle",
  });
});

client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot) return;
    if (
      message.content.toLowerCase() === "s!burger" &&
      message.channel.id === process.env["bot-channel"]
    ) {
      await burgerMsg(message);
    } else if (
      message.content.toLowerCase() === "s!burgertop" &&
      message.channel.id === process.env["bot-channel"]
    ) {
      await burgerLbMsg(message);
    }
  } catch (error) {
    console.error(error);
  }
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (!interaction.isCommand()) return;

    const commandName = interaction.commandName;
    switch (commandName) {
      case "submit":
        await handleSubmit(interaction);
        break;
      case "unsubmit":
        await unsubmit(interaction);
        break;
      case "cr":
        await handleCurrentRankingsCommand(interaction);
        break;
      case "view":
        await viewMyResults(interaction);
        break;
      default:
        break;
    }
  } catch (error) {
    console.error(error);
  }
});

// “At 22:00 on Tuesday.”
cron.schedule("0 22 * * 1", () => {
  try {
    manageComp();
  } catch (error) {
    console.error(error);
  }
});

// every 12 hours get all top player results
cron.schedule("0 */12 * * *", () => {
  console.log("Checking for top player results...");

  const recordsChannel = client.channels.cache.get(
    process.env.megaRecordsChannelId
  );
  try {
    checkRankings(recordsChannel);
  } catch (error) {
    console.error(error);
  }
});

// Every 15 minutes check for records
cron.schedule("*/15 * * * *", async () => {
  try {
    const date = new Date().setSeconds(0, 0);
    await fetchRecentRecords(client, date);
  } catch (error) {
    console.error(error);
  }
});

async function manageComp() {
  // var guild = client.guilds.cache.get(process.env.guildId);
  const results = await getRankedResults();
  const resultsChannel = client.channels.cache.get(
    process.env.resultsChannelId
  );
  const scramblesChannel = client.channels.cache.get(
    process.env.scrambleChannelId
  );
  const adminChannel = client.channels.cache.get(process.env.adminChannelId);
  var week = await getWeek();
  if (week === 35) {
    week++;
    saveWeek(week);
    scrambles(week, scramblesChannel);
  } else {
    sendPodium(results, resultsChannel, scramblesChannel, adminChannel);
  }
}
