require("dotenv").config();
const cron = require("node-cron");

const { Client, IntentsBitField, Partials } = require("discord.js");
const {
  handleSubmit,
  handleUnsubmit,
  handleView,
  handleCurrentRankings,
  handleWeeklyComp,
} = require("./comp/comp");

const { registerCommands } = require("./commands");
const { burgerMsg, burgertop } = require("./burger");
const { fetchRecentRecords } = require("./megaRecords");
const { updateBurgerRoles } = require("./burger");

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.once("ready", async () => {
  try {
    console.log("MegaBot is online!");
    await fetchRecentRecords(client, false);
    // await registerCommands(client);
    const burgerEmoji = "🍔";
    client.user.setPresence({
      activities: [{ name: burgerEmoji }],
    });
  } catch (error) {
    console.error(error);
  }
});

client.on("messageCreate", async (msg) => {
  try {
    if (msg.author.bot || msg.channel.id !== process.env.burgerChannelId)
      return;
    switch (msg.content.toLowerCase()) {
      case "s!burger":
        await burgerMsg(msg);
        break;
      case "s!burgertop":
        await burgertop(msg);
        break;

      default:
        break;
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
        await handleUnsubmit(interaction);
        break;
      case "cr":
        await handleCurrentRankings(interaction);
        break;
      case "view":
        await handleView(interaction);
        break;
      case "run-comp":
        await interaction.deferReply();
        await handleWeeklyComp(client);
        console.info(new Date().toString(), interaction.user.username, "Manual weekly comp run");
        await interaction.editReply("Done");
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
    console.info(new Date().toString(), "Automated weekly comp run");
    await handleWeeklyComp(client);
  } catch (error) {
    console.error(error);
  }
});

// Every 15 minutes check for records
cron.schedule("*/15 * * * *", async () => {
  try {
    await fetchRecentRecords(client);
  } catch (error) {
    console.error(error);
  }
});

client.login(process.env.botToken);
