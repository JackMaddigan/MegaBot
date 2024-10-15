require("dotenv").config();
const cron = require("node-cron");

const { Client, IntentsBitField, Partials, Guild } = require("discord.js");
const {
  handleSubmit,
  unsubmit,
  viewMyResults,
  handleCurrentRankingsCommand,
  handleComp,
} = require("./comp");

const { registerCommands } = require("./commands");
const { burgerMsg, burgerLbMsg } = require("./burger");
const { fetchRecentRecords } = require("./megaRecords");
const { checkRankings } = require("./megaTopResults");

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
  // await checkRankings(client.channels.cache.get(process.env.recordsChannelId));
  // await registerCommands(client);
  // await handleComp(client);

  const burgerEmoji = "🍔";
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
      message.channel.id === process.env.botChannelId
    ) {
      await burgerMsg(message);
    } else if (
      message.content.toLowerCase().startsWith("s!burgertop") &&
      message.channel.id === process.env.botChannelId
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

// At 22:00 on Tuesday Handle Comp
cron.schedule("0 22 * * 1", async () => {
  try {
    await handleComp(client);
  } catch (error) {
    console.error(error);
  }
});

// every 2:30pm utc check and send new top player results
cron.schedule("30 14 * * *", async () => {
  try {
    console.log("Checking for top player results...");
    const recordsChannel = client.channels.cache.get(
      process.env.megaRecordsChannelId
    );
    await checkRankings(recordsChannel);
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
