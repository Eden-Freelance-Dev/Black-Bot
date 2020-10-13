const Discord = require("discord.js");
const fs = require("fs");
const rank = require("./rank.js");

module.exports = {
    name: 'leaderboard',
	description: 'Sends a leaderboard embed.',
	execute(msg, args) {
        
        const data = JSON.parse(fs.readFileSync("data.json"));
        let embed = new Discord.MessageEmbed()
        .setTitle("Leaderboard");
        const users = rank.getSortedUsers();
        for(let i = 0; i < users.length && i < 10; ++i){
            embed.addField(`Rank ${i + 1}`, `${data[users[i]["ID"]]["name"]}: **level ${rank.getLevel(data[users[i]["ID"]]["level"]["xp"])}**`);
        }

        msg.channel.send(embed);
	},
}