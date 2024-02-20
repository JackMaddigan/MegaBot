function handleResult(interaction) {
  var rawSolves = [
    interaction.options.getString("solve-1"),
    interaction.options.getString("solve-2"),
    interaction.options.getString("solve-3"),
    interaction.options.getString("solve-4"),
    interaction.options.getString("solve-5"),
  ];
  console.log(rawSolves);
  var isSolvesValid = validateSolves(rawSolves);
  if (isSolvesValid[0] === false) {
    // invalid solves
    interaction.reply({
      ephemeral: true,
      content: `Invalid solves: ${isSolvesValid[1]}`,
    });
  } else {
    // solves are all valid
    const formattedTimes = [
      formatTime(rawSolves[0]),
      formatTime(rawSolves[1]),
      formatTime(rawSolves[2]),
      formatTime(rawSolves[3]),
      formatTime(rawSolves[4]),
    ];
    console.log(formattedTimes);
    interaction.reply({
      ephemeral: true,
      content: `Submitted`,
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
    console.log(parts);
    if (parts.length > 3 && solve.toLowerCase() != "dnf") {
      valid = false;
      invalidSolves += solve + " ";
    }
  });
  return [valid, invalidSolves];
}

function formatTime(solve) {
  var totalSeconds = timeToSeconds(solve);
  if (totalSeconds === 10000) return "DNF";
  var minutes = Math.floor(totalSeconds / 60);
  var seconds = Math.floor(totalSeconds - minutes * 60);
  var milliseconds = Math.round(
    (totalSeconds - minutes * 60 - Math.floor(totalSeconds - minutes * 60)) *
      100
  )
    .toString()
    .padStart(2, "0");
  console.log(minutes, seconds, milliseconds);
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

module.exports = {
  handleResult,
};
