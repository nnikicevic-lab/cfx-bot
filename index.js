const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();

// --- KONFIGURACIJA ---
const DISCORD_TOKEN = process.env.DISCORD_TOKEN; 
const CFX_URL = process.env.CFX_URL || "http://45.151.44.139:30120/players.json";

// --- BAZA ---
const db = new sqlite3.Database('./players.db');
db.run("CREATE TABLE IF NOT EXISTS players (name TEXT UNIQUE)");

// --- DISCORD BOT ---
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once('ready', () => {
  console.log(`Bot je online kao ${client.user.tag}`);
});

// --- FUNKCIJA ZA DODAVANJE IGRAČa ---
async function fetchPlayers() {
  try {
    const res = await axios.get(CFX_URL);
    const players = res.data;

    players.forEach(player => {
      db.run("INSERT OR IGNORE INTO players(name) VALUES(?)", [player.name]);
    });
  } catch (err) {
    console.error("Greška pri dohvaćanju igrača:", err.message);
  }
}

// --- PERIODIČNO DOHVATANJE ---
setInterval(fetchPlayers, 60000); // svakih 60 sekundi

// --- KOMANDE ---
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
