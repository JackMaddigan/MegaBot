require("dotenv").config();

const { Client, IntentsBitField, Partials } = require("discord.js");
const { handleResult } = require("./submit");
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

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const commandName = interaction.commandName;
  console.log(commandName);
  if (commandName === "submit") {
    handleResult(interaction);
  }
});
