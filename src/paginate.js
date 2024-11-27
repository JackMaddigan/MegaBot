const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");

/**
 * Paginate through an array of embeds with buttons.
 * @param {Message} msg - The original message object triggering the pagination.
 * @param {EmbedBuilder[]} pages - An array of EmbedBuilder objects to paginate through.
 * @param {number} timeout - The timeout (in milliseconds) for pagination interactions.
 */
async function paginateMessage(msg, pages, timeout = 60000) {
  if (!pages || pages.length === 0)
    throw new Error("No pages provided for pagination.");

  let currentPage = 0;

  // Create navigation buttons
  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("prev")
      .setLabel("Previous")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(true), // Initially disabled
    new ButtonBuilder()
      .setCustomId("next")
      .setLabel("Next")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(pages.length === 1) // Disabled if there's only one page
  );

  // Send the initial message with the first embed and buttons
  const sentMessage = await msg.channel.send({
    embeds: [pages[currentPage]],
    components: [buttons],
  });

  // Create a collector for button interactions
  const collector = sentMessage.createMessageComponentCollector({
    filter: (interaction) => interaction.user.id === msg.author.id, // Only the original author can interact
    time: timeout,
  });

  // Handle button clicks
  collector.on("collect", async (interaction) => {
    if (interaction.customId === "prev") currentPage--;
    else if (interaction.customId === "next") currentPage++;

    // Update button states
    buttons.components[0].setDisabled(currentPage === 0);
    buttons.components[1].setDisabled(currentPage === pages.length - 1);

    // Update the embed and buttons
    await interaction.update({
      embeds: [pages[currentPage]],
      components: [buttons],
    });
  });

  // Handle timeout
  collector.on("end", () => {
    buttons.components.forEach((button) => button.setDisabled(true)); // Disable buttons
    sentMessage.edit({
      components: [buttons],
    });
  });
}

module.exports = paginateMessage;
