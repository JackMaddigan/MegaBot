function centiToDisplay(centi, removeDecimals) {
  if (centi == -1) return "DNF";
  if (centi == -2) return "DNS";
  if (centi == 0) return "N/A";
  const hours = Math.floor(centi / 360000);
  const minutes = Math.floor((centi - hours * 360000) / 6000);
  const seconds = Math.floor((centi - hours * 360000 - minutes * 6000) / 100);
  const centiseconds =
    centi - (hours * 360000 + minutes * 6000 + seconds * 100);
  let stringCentiseconds =
    centiseconds < 10 ? ".0" + centiseconds : "." + centiseconds;
  let stringSeconds =
    (minutes > 0 || hours > 0) && seconds < 10
      ? "0" + seconds + ""
      : seconds + "";
  let stringMinutes =
    hours > 0 && minutes < 10
      ? "0" + minutes + ":"
      : minutes == 0
      ? ""
      : minutes + ":";
  let stringHours = hours > 0 ? hours + ":" : "";
  return (
    stringHours +
    stringMinutes +
    stringSeconds +
    (removeDecimals ? "" : stringCentiseconds)
  );
}

function toCenti(str) {
  str = str.toLowerCase();
  if (str == "dnf") return -1;
  if (str == "dns") return -2;

  let parts = str.split(/:/).reverse();
  let centi = 0;
  if (parts[0].includes(".")) {
    let [str_sec, str_centi] = parts[0].split(".");
    centi = Number(str_centi.padEnd(2, 0).slice(0, 2));
    parts[0] = str_sec;
  }
  parts = parts.map((item) => Number(item));
  let multiplier = 100;
  let factor = 60;
  for (let part of parts) {
    centi += part * multiplier;
    multiplier *= factor;
  }
  return centi;
}

module.exports = { toCenti, centiToDisplay };
