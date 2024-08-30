const { readData } = require("./db");

const eventIdToName = { minx: "Megaminx" };

function toCenti(s) {
  solve = s.toString();
  if (solve === "dnf" || solve === "-1") return -1;
  if (solve === "dns" || solve === "-2") return -2;
  var parts = solve.split(/[:.]/).reverse();
  var centi = 0;
  if (solve.includes(".")) {
    if (parts[0].length > 2) parts[0] = parts[0].slice(0, 2);
    centi += Number(parts[0]);
    parts.splice(0, 1);
  }
  for (let i = 0; i < parts.length; i++) {
    centi += Number(parts[i]) * Math.pow(60, i) * 100;
  }
  return Math.floor(centi); // get rid of after 3rd dp
}

function toDisp(centi) {
  if (centi === -1 || centi === 0) return "DNF";
  if (centi === -2) return "DNS";
  const hours = Math.floor(centi / 360000);
  const minutes = Math.floor((centi - 360000 * hours) / 6000);
  const seconds = Math.floor((centi - 360000 * hours - 6000 * minutes) / 100);
  const centiseconds = centi - 360000 * hours - 6000 * minutes - 100 * seconds;
  const dHours = hours > 0 ? hours + ":" : "";
  const dMinutes =
    hours > 0
      ? minutes.toString().padStart(2, "0") + ":"
      : minutes > 0
      ? minutes + ":"
      : "";
  const dSeconds =
    hours > 0 || minutes > 0 ? seconds.toString().padStart(2, "0") : seconds;
  const dCentiseconds = "." + centiseconds.toString().padStart(2, "0");
  return dHours + dMinutes + dSeconds + dCentiseconds;
}

function checkModRole(int) {
  return int.guild.members.cache
    .get(int.user.id)
    .roles.cache.has(process.env.modRoleId);
}

async function replyToInt(int, content, ephemeral) {
  try {
    const reply = await int.reply({
      ephemeral: ephemeral,
      content: content,
    });
    return reply;
  } catch (err) {
    console.error("Error replying to interaction:", err);
    throw err;
  }
}

async function checkIfSubbed(uid, eventId) {
  // If the first element of the array returned exists, true : false
  return (
    await readData(`SELECT best FROM results WHERE eventId=? AND userId=?`, [
      eventId,
      uid,
    ])
  )[0]
    ? true
    : false;
}

function validateResults(splitRawResults, ei) {
  if (splitRawResults.length !== ei.numAttempts)
    return `Invalid number of attempts!\nExpected: ${ei.numAttempts}\nSubmitted: ${splitRawResults.length}`;
  const regex = /^(?!.*\..*:)[\d:.]*$/;
  let errorMsg = "";
  for (const result of splitRawResults) {
    if (!regex.test(result) && result !== "dnf" && result !== "dns")
      errorMsg += `\nInvalid time: ${result}`;
  }
  return errorMsg;
}

function calculateRI(splitValidatedResults, ei) {
  // splitValidatedResults is validated, all values are lowercase
  const numDnfOrDns = splitValidatedResults.filter(
    (value) => value === "dns" || value === "dnf"
  ).length;
  splitValidatedResults = splitValidatedResults.map((element) => {
    return toCenti(element);
  });
  const nonDnfResults = splitValidatedResults.filter((value) => value > 0);
  const best = nonDnfResults.length === 0 ? -1 : Math.min(...nonDnfResults);
  const average = calculateAo5(splitValidatedResults, numDnfOrDns, best);
  const list = splitValidatedResults.map((centi) => toDisp(centi)).join(", ");
  return { best, average, list };
}

function calculateAo5(splitValidatedResults, numDnfOrDns, best) {
  // splitValidatedResults is in centi
  if (numDnfOrDns > 1) return -1;
  const worst =
    numDnfOrDns > 0
      ? Math.min(...splitValidatedResults)
      : Math.max(...splitValidatedResults);
  const average = Math.round(
    (splitValidatedResults.reduce(
      (accumulator, currentValue) => accumulator + currentValue,
      0
    ) -
      best -
      worst) /
      3
  );
  return average;
}

function getEventInfo(eventId) {
  const ei = {
    numAttempts: 5,
    format: "ao5",
    eventId: eventId,
    eventDisplayName: eventIdToName[eventId],
  };
  return ei;
}

function makeSubmissionReplyMsg(ei, ri, ui) {
  const submitForPart = ui.submitFor ? ` for ${ui.user}` : "";
  const eventPart = ` for ${ei.eventDisplayName}`;
  return (
    `(${ri.list}) = ${toDisp(ri.average)} average` + eventPart + submitForPart
  );
}

module.exports = {
  toDisp,
  toCenti,
  getEventInfo,
  validateResults,
  calculateRI,
  makeSubmissionReplyMsg,
  checkModRole,
  checkIfSubbed,
  replyToInt,
  eventIdToName,
};
