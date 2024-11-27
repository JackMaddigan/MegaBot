const { SlashCommandBuilder, PermissionsBitField } = require("discord.js");
const { events } = require("./comp/events");

async function registerCommands(client) {
  try {
    // Define your slash commands
    const submitCommand = new SlashCommandBuilder()
      .setName("submit")
      .setDescription("Submit results for the weekly comp!");
    for (const eventId in events) {
      if (eventId === "extra") continue;
      const event = events[eventId];
      submitCommand.addSubcommand((sub) =>
        sub
          .setName(event.short)
          .setDescription(`Submit results for ${event.short}`)
          .addStringOption((option) =>
            option
              .setName("results")
              .setDescription("Enter your results separated by a space")
              .setRequired(true)
          )
          .addUserOption((option) =>
            option
              .setName("submit-for")
              .setDescription("The user")
              .setRequired(false)
          )
      );
    }

    const unsubmitCommand = new SlashCommandBuilder()
      .setName("unsubmit")
      .setDefaultMemberPermissions(PermissionsBitField.Flags.KickMembers)
      .setDescription("Unsubmit results")
      .addUserOption((option) =>
        option.setName("user").setRequired(true).setDescription("The user")
      )
      .addStringOption((option) =>
        option
          .setName("event")
          .setRequired(true)
          .setDescription("Event to unsubmit")
          .setChoices(
            Object.entries(events).map(([eventId, event]) => ({
              name: event.short || eventId,
              value: eventId,
            }))
          )
      );

    const currentRankingsCommand = new SlashCommandBuilder()
      .setName("cr")
      .setDescription("See the current competition rankings")
      .setDefaultMemberPermissions(PermissionsBitField.Flags.KickMembers);

    const viewCommand = new SlashCommandBuilder()
      .setName("view")
      .setDescription("See your results for the weekly comp");

    // Register the slash commands
    await client.application.commands.set([
      submitCommand,
      unsubmitCommand,
      currentRankingsCommand,
      viewCommand,
    ]);
    console.log("Slash commands registered successfully.");
  } catch (error) {
    console.error("Failed to register slash commands:", error);
  }
}

module.exports = {
  registerCommands,
};
