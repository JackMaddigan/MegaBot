const { saveAverage } = require("./db");

function handleResult(interaction) {
  var submitForElse = false;
  var uid = interaction.user.id;
  var displayName = interaction.member.displayName;
  var addon = "";
  var rawSolves = [
    interaction.options.getString("solve-1"),
    interaction.options.getString("solve-2"),
    interaction.options.getString("solve-3"),
    interaction.options.getString("solve-4"),
    interaction.options.getString("solve-5"),
  ];
  if (interaction.member.roles.cache.has(process.env.adminRoleId)) {
    var submitFor = interaction.options.getUser("admin");
    if (submitFor !== null) {
      submitForElse = true;
      uid = submitFor.id;
      displayName = submitFor.displayName;
      addon = ` for ${submitFor}`;
    }
  }
  var isSolvesValid = validateSolves(rawSolves);
  if (isSolvesValid[0] === false) {
    // invalid solves
    interaction.reply({
      ephemeral: true,
      content: `Invalid solves: ${isSolvesValid[1]}`,
    });
  } else {
    // solves are all valid

    const timesInSec = [
      timeToSeconds(rawSolves[0]),
      timeToSeconds(rawSolves[1]),
      timeToSeconds(rawSolves[2]),
      timeToSeconds(rawSolves[3]),
      timeToSeconds(rawSolves[4]),
    ];

    const average = calcAvg(timesInSec);
    const timeList = returnCircledTimeList(timesInSec);
    const bestTime = Math.min(...timesInSec);
    // Save data to db here
    saveAverage(timesInSec, average, uid, displayName, bestTime, timeList);

    interaction.reply({
      ephemeral: false,
      content: `${timeList} = ${formatTime(average)} average${addon}`,
    });
  }
}

function validateSolves(solves) {
  var valid = true;
  var invalidSolves = "";
  solves.forEach((solve) => {
    // Check valid characters
    let containsValidChars = /^[0-9:.]+$/.test(solve);
    if (!containsValidChars && solve.toLowerCase() != "dnf") {
      valid = false;
      invalidSolves += solve + " ";
    }
    // Check valid number of parts
    let parts = solve.split(/[:.]/);
    if (parts.length > 3 && solve.toLowerCase() != "dnf") {
      valid = false;
      invalidSolves += solve + " ";
    }
  });
  return [valid, invalidSolves];
}

function formatTime(solve) {
  // Assuming time is already in seconds
  //   solve = timeToSeconds(solve);

  if (solve === 10000) return "DNF";
  var minutes = Math.floor(solve / 60);
  var seconds = Math.floor(solve - minutes * 60);
  var milliseconds = Math.round(
    (solve - minutes * 60 - Math.floor(solve - minutes * 60)) * 100
  )
    .toString()
    .padStart(2, "0");
  seconds =
    seconds < 10 && minutes > 0
      ? seconds.toString().padStart(2, "0") + "."
      : seconds.toString() + ".";
  minutes = minutes === 0 ? "" : minutes.toString() + ":";
  return `${minutes}${seconds}${milliseconds}`;
}

function timeToSeconds(solve) {
  solve = String(solve);

  if (solve.toLowerCase() === "dnf" || solve.toLowerCase() === "dns") {
    return 10000;
  }
  var parts = solve.split(":");
  var totalSeconds;
  if (parts.length === 1) {
    // seconds only
    totalSeconds = Number(parts[0]);
  } else if (parts.length === 2) {
    // minutes and seconds
    let minutes = Number(parts[0]);
    let seconds = Number(parts[1]);
    totalSeconds = minutes * 60 + seconds;
  } else if (parts.length === 3) {
    // hours minutes and seconds
    let hours = Number(parts[0]);
    let minutes = Number(parts[1]);
    let seconds = Number(parts[2]);
    totalSeconds = hours * 3600 + minutes * 60 + seconds;
  }
  totalSeconds = Math.round(totalSeconds * 100) / 100;
  return totalSeconds;
}

function calcAvg(solves) {
  // solves.slice means solves wont get affected by sorting
  var times = solves.slice();
  times.sort((a, b) => a - b);
  if (times[3] === 10000 && times[4] === 10000) {
    return 10000;
  }
  return Math.round(((times[1] + times[2] + times[3]) / 3) * 100) / 100;
}

function returnCircledTimeList(solves) {
  var bestTimeIndex = 0;
  var worstTimeIndex = 4;
  for (let i = 0; i < 5; i++) {
    if (solves[i] > solves[worstTimeIndex]) {
      worstTimeIndex = i;
    }
    if (solves[i] < solves[bestTimeIndex]) {
      bestTimeIndex = i;
    }
  }
  let timeList = [];
  for (let j = 0; j < 5; j++) {
    if (j === bestTimeIndex || j === worstTimeIndex) {
      timeList.push(`(${formatTime(solves[j])})`);
    } else {
      timeList.push(formatTime(solves[j]));
    }
  }
  return `${timeList[0]}, ${timeList[1]}, ${timeList[2]}, ${timeList[3]}, ${timeList[4]}`;
}

module.exports = {
  handleResult,
  formatTime,
};
