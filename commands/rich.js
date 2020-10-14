const Discord = require("discord.js");
const fs = require("fs");
const bal = require("./bal.js");
const botConfig = require("./../config.json");

module.exports = {
    name: 'rich',
	description: 'Sends the leaderboard in terms of currency.',
	execute(msg, args) {
        const data = JSON.parse(fs.readFileSync("./data.json"));
		let embed = new Discord.MessageEmbed()
        .setTitle("Richities");
        const users = bal.getSortedUsers();
        for(let i = 0; i < users.length && i < 10; ++i){
            embed.addField(`#${i + 1}: **${data[users[i]["ID"]]["name"]}**`, `with a whopping **${data[users[i]["ID"]]["currency"]["value"]}** ${botConfig["currency"]["currency-name"]}.`);
        }
        msg.channel.send(embed);
	},
}