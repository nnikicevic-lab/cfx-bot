const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN; 
// Ovdje stavi URL koji vraća JSON (onaj koji si našao u Network tabu ili koji si mi poslao)
const SERVER_URL = process.env.SERVER_URL || "https://servers-frontend.fivem.net/api/servers/3mlymr";

const db = new sqlite3.Database('./players.db');
db.run("CREATE TABLE IF NOT EXISTS players (name TEXT UNIQUE)");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once('ready', () => {
  console.log(`Bot je online kao ${client.user.tag}`);
});

async function fetchPlayers() {
  try {
    const res = await axios.get(SERVER_URL);
    const data = res.data;

    // JSON ima polje "Data.players" → uzimamo imena
    const players = data.Data.players || [];

    players.forEach(player => {
      db.run("INSERT OR IGNORE INTO players(name) VALUES(?)", [player.name]);
    });

    console.log("Dohvaćeni igrači:", players.map(p => p.name));
  } catch (err) {
    console.error("Greška pri dohvaćanju igrača:", err.message);
  }
}

// povlači svakih 60 sekundi
setInterval(fetchPlayers, 60000);

client.on('messageCreate', msg => {
  if (msg.content === "!igraci") {
    db.all("SELECT name FROM players", [], (err, rows) => {
      if (err) return msg.reply("Greška u bazi.");
      if (!rows.length) return msg.reply("Trenutno nema podataka o igračima.");
      const names = rows.map(r => r.name).join(", ");
      msg.reply("Lista svih igrača: " + names);
    });
  }
});

client.login(DISCORD_TOKEN);
