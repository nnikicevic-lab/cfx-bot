const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
const cheerio = require('cheerio');
const sqlite3 = require('sqlite3').verbose();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN; 
const SERVER_URL = process.env.SERVER_URL || "https://servers.redm.net/servers/detail/3mlymr";

const db = new sqlite3.Database('./players.db');
db.run("CREATE TABLE IF NOT EXISTS players (name TEXT UNIQUE)");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once('ready', () => {
  console.log(`Bot je online kao ${client.user.tag}`);
});

async function fetchPlayers() {
  try {
    const res = await axios.get(SERVER_URL);
    const $ = cheerio.load(res.data);

    const players = [];

    // ⚠️ Ovdje moraš prilagoditi selektor prema tačnoj strukturi stranice
    // Primjer: ako su imena u tabeli, koristi $("table tr td.player-name")
    $("div.players-tab li, div.players-tab table tr td").each((i, el) => {
      const name = $(el).text().trim();
      if (name) players.push(name);
    });

    players.forEach(player => {
      db.run("INSERT OR IGNORE INTO players(name) VALUES(?)", [player]);
    });

    console.log("Dohvaćeni igrači:", players);
  } catch (err) {
    console.error("Greška pri dohvaćanju igrača:", err.message);
  }
}

setInterval(fetchPlayers, 60000);

client.on('messageCreate', msg => {
  if (msg.content === "!igraci") {
    db.all("SELECT name FROM players", [], (err, rows) => {
      if (err) return msg.reply("Greška u bazi.");
      const names = rows.map(r => r.name).join(", ");
      msg.reply("Lista svih igrača: " + names);
    });
  }
});

client.login(DISCORD_TOKEN);
