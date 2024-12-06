const { saveData } = require("./db");

const data = [
  { id: "1011884318848733234", score: 2, userName: "ihtsolves" },
  { id: "1012747304480034907", score: 35, userName: "ali_the_goat_" },
  {
    id: "1061666891422249181",
    score: 38,
    userName: "Ismaele chiarella",
  },
  { id: "1064991259980206231", score: 1, userName: "a_cuber123" },
  { id: "1093669666280456343", score: 71, userName: "not sub 40 on 4x4 😔" },
  { id: "1096293504386342952", score: 2, userName: "Smijo's Rubikzz" },
  { id: "1109241515403911249", score: 28, userName: "alessandrobucko" },
  {
    id: "1138246054744178788",
    score: 9,
    userName: "skewbycuber_34500",
  },
  {
    id: "1209939284396744724",
    score: 74,
    userName: "IntergalacticGustavo (42/151)",
  },
  { id: "401500275799752704", score: 3, userName: "Sean_M" },
  { id: "432960409788481547", score: 10, userName: "cuberstache" },
  {
    id: "474178859584061461",
    score: 598,
    userName: "DACHI (112/178) (151/151)",
  },
  { id: "497869768271986709", score: 8, userName: "person ig idk" },
  { id: "542768282101612547", score: 56, userName: "meowdaskatze" },
  { id: "584949989516771328", score: 1, userName: "AntiCactus" },
  { id: "592784278362914818", score: 2, userName: "Duck" },
  { id: "628693710368014365", score: 1, userName: "3DegreeK" },
  { id: "637117513729048616", score: 8, userName: "jackmaddigan" },
  { id: "721577970472452127", score: 2, userName: "Kaivalya" },
  {
    id: "729534269369876531",
    score: 32,
    userName: "2019JYOT01 (151/151) (178/178)",
  },
  { id: "758932649338863616", score: 2, userName: "LittleBob10" },
  { id: "767693039669215253", score: 11, userName: "anja.k4" },
  {
    id: "772590541266485329",
    score: 6,
    userName: "________.__________________._",
  },
  { id: "781909283943874560", score: 2, userName: "catfurryface" },
  { id: "801942351236169750", score: 1, userName: "RobotMania" },
  { id: "812401144797593620", score: 2, userName: "AlexTheGreat" },
  {
    id: "814035642195509261",
    score: 1,
    userName: "that short event guy",
  },
  { id: "816731205524258847", score: 1, userName: "minitymon" },
  { id: "869485374894903338", score: 10, userName: "Rory" },
  { id: "871566415772139520", score: 19, userName: "jamy" },
  { id: "874358539810902026", score: 1, userName: "TheQuietKid" },
  { id: "909438741351895050", score: 13, userName: "DRZL" },
  {
    id: "912138426847989810",
    score: 2,
    userName: "An Animating Cuber | 2023COTT01",
  },
  { id: "931724117814698064", score: 9, userName: "berrystraw4573" },
  { id: "962895306553430016", score: 6, userName: "Chip" },
  { id: "999401341619277955", score: 1, userName: "jokazoo" },
  {
    id: "995170154872836156",
    score: 77,
    userName: "sss497 (33/178 oll) wr2330",
  },
  { id: "1107814672834515025", score: 1, userName: "penalty_r" },
];

async function test() {
  for (const item of data) {
    await saveData(
      `INSERT INTO burgerLeaderboard (id, score, username) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET score = excluded.score, username = excluded.username`,
      [item.id, item.score, item.userName]
    );
  }

  await saveData(`INSERT INTO key_value_store (key, value) VALUES (?, ?)`, [
    "lastBurger",
    "1733467860508",
  ]);

  await saveData(`INSERT INTO key_value_store (key, value) VALUES (?, ?)`, [
    "lastBurgerUser",
    "2019JYOT01 (151/151) (178/178)",
  ]);
}

test();
