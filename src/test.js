const { readData } = require("./db");

async function test() {
  console.log(await readData(`SELECT * FROM burgerLastRoleHavers`, []));
}

test();
