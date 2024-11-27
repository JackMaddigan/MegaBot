const { toCenti, centiToDisplay } = require("../../helpers");

/**
 * Validate aoN result text, return array of [data, error, response]
 * Data is a 3 item long array of the columns of data to save to db
 * attempts, best, average
 */
function processAoN(resultText, sub) {
  let solves = resultText.split(/[ ,]+/);
  let errors = [];
  if (solves.length != sub.event.attempts) {
    errors.push(
      `Invalid number of attempts!\nExpected: ${sub.event.attempts}, received: ${solves.length}`
    );
  }

  const regex = /^(dnf|dns|\d{1,2}(:\d{1,2}){0,2}(\.\d+)?)$/i;
  for (const solve of solves) {
    if (!solve.match(regex)) {
      errors.push(`Invalid time: ${solve}`);
    }
  }

  if (errors.length > 0) {
    return [[], errors.join("\n"), {}];
  }
  solves = solves.map((solve) => toCenti(solve));
  const list = solves.map((solve) => centiToDisplay(solve)).join(", ");
  const trimEachEnd = Math.ceil(sub.event.attempts * 0.05);
  solves.sort((a, b) => {
    if (a < 0 && b >= 0) return 1;
    if (a >= 0 && b < 0) return -1;
    return a - b;
  });
  const countingSolves = solves.slice(trimEachEnd, solves.length - trimEachEnd);
  const isDnfAverage = countingSolves.some((item) => item <= 0);
  const average = isDnfAverage
    ? -1
    : Math.round(
        countingSolves.reduce((acc, curr) => acc + curr, 0) /
          countingSolves.length
      );

  solves = solves.filter((item) => item > 0);
  const best = solves.length === 0 ? -1 : solves[0];

  const data = [list, best, average];
  const a = `(${list}) = ${centiToDisplay(average)} average`;
  const b = sub.showSubmitFor ? ` for <@${sub.userId}>` : "";
  const response = { text: a + b, react: null };
  return [data, null, response];
}

/**
 * Make result object from info from db
 */
class AoN_Result {
  placing;
  constructor(userId, username, eventId, list, best, average) {
    this.userId = userId;
    this.username = username;
    this.eventId = eventId;
    this.list = list;
    this.best = best;
    this.average = average;
    this.isDnf = best <= 0;
  }

  compare(other) {
    if (this.average <= 0 && other.average > 0) {
      return 1;
    }
    if (this.average > 0 && other.average <= 0) {
      return -1;
    }
    if (this.average === other.average) {
      return this.best - other.best;
    }
    return this.average - other.average;
  }

  givePlacing(inFront, index) {
    if (inFront.compare(this) < 0) {
      this.placing = index + 1;
    } else {
      this.placing = inFront.placing;
    }
  }

  toViewString() {
    return `Average: **${centiToDisplay(
      this.average
    )}**\nBest: **${centiToDisplay(this.best)}**\n(*${this.list}*)`;
  }

  toCRString() {
    return `#${this.placing} ${this.username} **${centiToDisplay(
      this.average
    )}**\n⤷ (*${this.list}*)`;
  }

  toTxtFileString() {
    return `\n#${this.placing},${this.username},${centiToDisplay(
      this.average
    )},${centiToDisplay(this.best)},${this.list}`;
  }

  toPodiumString() {
    const medals = [":first_place:", ":second_place:", ":third_place:"];
    return `\n${medals[this.placing - 1]} <@${this.userId}> **${centiToDisplay(
      this.average
    )}** average\n-# *(${this.list})*`;
  }
}

module.exports = {
  processAoN,
  AoN_Result,
};
