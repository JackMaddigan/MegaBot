require("dotenv").config();
const cron = require("node-cron");

const { Client, IntentsBitField, Partials } = require("discord.js");
const { handleResult } = require("./submit");
const {
  adminDeleteResult,
  getRankedResults,
  getWeek,
  saveWeek,
  getBurgerInfo,
} = require("./db");
const {
  burger,
  burgerLb,
  burgerMsg,
  burgerLbMsg,
  updateBurgerRoles,
} = require("./burger");
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

client.on("ready", () => {
  const burgerEmoji = "🍔";
  client.user.setPresence({
    activities: [{ name: burgerEmoji }],
    // status: "idle",
  });
});

client.on("messageCreate", async (message) => {
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
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const commandName = interaction.commandName;
  if (commandName === "submit") {
    handleResult(interaction);
  } else if (commandName === "unsubmit") {
    const user = interaction.options.getUser("user");
    adminDeleteResult(user.id);
    interaction.reply({
      content: `Removed results for ${user.displayName}`,
      ephemeral: true,
    });
  } else if (commandName === "burger") {
    burger(interaction, true);
  } else if (commandName === "burgertop") {
    burgerLb(interaction);
  } else if (commandName === "cr") {
    currentRankings(interaction);
  }
});

// “At 22:00 on Tuesday.”
cron.schedule("0 22 * * 1", () => {
  manageComp();
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

// async function initialRoles() {
//   const burgerInfo = await getBurgerInfo();
//   const guild = client.guilds.cache.get(process.env.guildId);
//   try {
//     updateBurgerRoles(burgerInfo, guild);
//   } catch (error) {
//     console.log(error);
//   }
// }
