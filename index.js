const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
const { Client: PgClient } = require('pg');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const SERVER_URL = process.env.SERVER_URL || "https://frontend.cfx-services.net/api/servers/single/3mlymr";
const DATABASE_URL = process.env.DATABASE_URL;

// konekcija na PostgreSQL
const db = new PgClient({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
db.connect();

// kreiraj tabelu ako ne postoji
db.query("CREATE TABLE IF NOT EXISTS players (name TEXT UNIQUE)");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', () => {
  console.log(`Bot je online kao ${client.user.tag}`);
});

// povlačenje igrača svakih 60 sekundi
async function fetchPlayers() {
  try {
    const res = await axios.get(SERVER_URL);
    const data = res.data;
    const players = data.Data.players || [];

    for (const player of players) {
      await db.query(
        "INSERT INTO players(name) VALUES($1) ON CONFLICT DO NOTHING",
        [player.name]
      );
    }

    console.log("Dohvaćeni igrači:", players.map(p => p.name));
  } catch (err) {
    console.error("Greška pri dohvaćanju igrača:", err.message);
  }
}

setInterval(fetchPlayers, 60000);

// komanda !igraci
client.on('messageCreate', async msg => {
  if (msg.content === "!igraci") {
    try {
      const result = await db.query("SELECT name FROM players");
      if (!result.rows.length) {
        return msg.reply("Trenutno nema podataka o igračima.");
      }

      // povuci trenutne igrače sa API-ja
      let currentPlayers = [];
      try {
        const res = await axios.get(SERVER_URL);
        currentPlayers = res.data.Data.players.map(p => p.name);
      } catch (err) {
        console.error("Greška pri dohvaćanju trenutnih igrača:", err.message);
      }

      // bolduj one koji su trenutno online i formatiraj kao listu
      const names = result.rows.map((r, i) => {
        const displayName = currentPlayers.includes(r.name) ? `**${r.name}**` : r.name;
        return `${i + 1}. ${displayName}`;
      }).join("\n");

      msg.reply("Lista svih igrača (trenutno online boldovani):\n" + names);
    } catch (err) {
      console.error("Greška u bazi:", err.message);
      msg.reply("Greška u bazi.");
    }
  }
});

client.login(DISCORD_TOKEN);
