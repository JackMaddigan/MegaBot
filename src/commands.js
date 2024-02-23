require("dotenv").config();
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const rest = new REST({ version: "10" }).setToken(process.env.botToken);

const commands = [
  {
    name: "burger",
    description: "burger",
  },
  {
    name: "cr",
    description: "Current rankings for the weekly comp",
  },
  {
    name: "burgertop",
    description: "burger leaderboard",
  },
  {
    name: "unsubmit",
    description: "Admin unsubmit results",
    options: [
      {
        name: "user",
        description: "User to unsubmit results for",
        type: 6, // Type 6 is a user
        required: true,
      },
    ],
  },
  {
    name: "submit",
    description: "Submit Megaminx results for the weekly comp!",
    options: [
      {
        name: "solve-1",
        description: "solve 1",
        type: 3, // 3 represents a string type
        required: true,
      },
      {
        name: "solve-2",
        description: "solve 2",
        type: 3, // 3 represents a string type
        required: true,
      },
      {
        name: "solve-3",
        description: "solve 3",
        type: 3, // 3 represents a string type
        required: true,
      },
      {
        name: "solve-4",
        description: "solve 4",
        type: 3, // 3 represents a string type
        required: true,
      },
      {
        name: "solve-5",
        description: "solve 5",
        type: 3, // 3 represents a string type
        required: true,
      },
      {
        name: "admin",
        description: "submit for",
        type: 6, // 3 represents a string type
        required: false,
      },
    ],
  },
];

(async () => {
  try {
    console.log("Started registering application (/) commands.");

    await rest.put(Routes.applicationCommands(process.env.clientId), {
      body: commands,
    });

    console.log("Successfully registered application (/) commands.");
  } catch (error) {
    console.error(error);
  }
})();
