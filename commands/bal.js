const Discord = require("discord.js");
const fs = require("fs");
const botConfig = require("./../config.json");

module.exports = {
    name: 'bal',
	description: 'Sends out your balance.',
	execute(msg, args) {
        const data = JSON.parse(fs.readFileSync("./data.json"));

        let embed = new Discord.MessageEmbed()

        if(msg.mentions.members.first()){
            const currency = data[msg.mentions.members.first().id]["currency"]["value"];

            embed.setTitle(`${msg.mentions.members.first().displayName}`)
            .addField(`${capFirst(botConfig["currency"]["currency-name"])}`, `${currency}`)
            .addField("Rank", `#${getUserRank(msg.mentions.members.first().id)}`)
            .setThumbnail(msg.mentions.members.first().user.displayAvatarURL());
        }
        else{
            const currency = data[msg.author.id]["currency"]["value"];
            embed.setTitle(`${msg.author.username}`)
            .addField(`${capFirst(botConfig["currency"]["currency-name"])}`, `${currency}`)
            .addField("Rank", `#${getUserRank(msg.author.id)}`)
            .setThumbnail(msg.author.displayAvatarURL());
        }
        msg.channel.send(embed);
	},
}

function getSortedUsers(){
    let data = JSON.parse(fs.readFileSync("./data.json"));

    let users = [];
    for(let element in data){
        users.push({"ID": element,"currency": data[element]["currency"]["value"]});
    }
    users.sort((a, b)=>{return b["currency"] - a["currency"]});

    return users;
}
module.exports.getSortedUsers = getSortedUsers;

function getUserRank(userID){
    let users = getSortedUsers();
    for(let i = 0; i < users.length; ++i){
        if(users[i]["ID"] == userID){
            return i + 1;
        }
    };
    return undefined;
}

function capFirst(str){
    return str.charAt(0).toUpperCase() + str.slice(1);
}