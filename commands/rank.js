const Discord = require("discord.js");
const fs = require("fs");

module.exports = {
    name: 'rank',
    description: 'Constructs a embed of your rank!',
    
	execute(msg, args) {
        const data = JSON.parse(fs.readFileSync("./data.json"));
        const xp = data[msg.author.id]["level"]["xp"];

        let embed = new Discord.MessageEmbed()
        .setTitle(`${msg.author.username}`)
        .addField("Level", `${getLevel(xp)}`)
        .addField("Rank", `#${getUserRank(msg.author.id)}`)
        .addField("XP", `${xp}/${getXp(getLevel(xp) + 1)} (${getXp(getLevel(xp) + 1) - xp} away from **level ${getLevel(xp) + 1})**`)
        .setThumbnail(msg.author.displayAvatarURL());
        msg.channel.send(embed);
	},
}

function getLevel(xp){
    for(let i = 100; i >= 0 ; --i){
        if(xp >= 5 * (Math.pow(i, 2)) + 50 * i + 100){
            return i;
        }
    }
    return 0;
}
module.exports.getLevel = getLevel;

function getXp(level){
    return 5 * (Math.pow(level, 2)) + 50 * level + 100;
}

function getSortedUsers(){
    let data = JSON.parse(fs.readFileSync("./data.json"));

    let users = [];
    for(let element in data){
        users.push({"ID": element,"xp": data[element]["level"]["xp"]});
    }
    users.sort((a, b)=>{return b["xp"] - a["xp"]});

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