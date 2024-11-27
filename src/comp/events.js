const { processAoN, AoN_Result } = require("./formats/aoN");

const events = {
  minx: {
    name: "Megaminx",
    short: "megaminx",
    process: processAoN,
    scr: ["333ni", "0"],
    attempts: 5,
    obj: AoN_Result,
  },
};

const eventShortNameToId = {
  megaminx: "minx",
};

module.exports = {
  eventShortNameToId,
  events,
};
