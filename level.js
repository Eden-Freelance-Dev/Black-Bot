const fs = require("fs");
const index = require("./index.js");

const botConifg = JSON.parse(fs.readFileSync("./config.json"));

module.exports.addXp = function addXp(msg, args){
    let data = JSON.parse(fs.readFileSync("./data.json"));
    let random = Math.random() * 100;

    if(data[msg.author.id]["level"]["cooldown"] > 0) return;

    // if random draw is succesful 
    if(random >= botConifg["level"]["percentage-chance"]){

        // calculate the amount of xp to reward
        let xpGained = Math.round(Math.random() * (botConifg["level"]["max-xp-gained"] - botConifg["level"]["min-xp-gained"]) + botConifg["level"]["min-xp-gained"]);
        data[msg.author.id]["level"]["xp"] += xpGained;

        // rank up!
        if(getLevel(data[msg.author.id]["level"]["xp"] - xpGained) != getLevel(data[msg.author.id]["level"]["xp"])){
            //if there is a specific role for this level
            if(botConifg["roles"]["level"][
                getLevel(data[msg.author.id]["level"]["xp"])
            ]){ 
                // remove all level related roles
                for(let element in botConifg["roles"]["level"]){
                    element = botConifg["roles"]["level"][element];

                    for(let i = 0; i < element.length; ++i){
                        removeRole(element[i]["server"], msg.author.id, element[i]["roleID"]);
                    }
                }
                // add the new level role
                let roles = botConifg["roles"]["level"][getLevel(data[msg.author.id]["level"]["xp"])];
                for(let i = 0; i < roles.length; ++i){
                    addRole(roles[i]["server"], msg.author.id, roles[i]["roleID"]);
                }
            }
            // if we have specified a channel for the level up messages
            const channels = botConifg["channels"]["level-up"];
            for(let i = 0; i < channels.length; ++i){
                const channel = index.bot.channels.cache.get(channels[i]);
                channel.send(`${msg.author.username} has leveled up to **level ${getLevel(data[msg.author.id]["level"]["xp"])}**!`);
            }
        }
        data[msg.author.id]["level"]["cooldown"] = botConifg["level"]["xp-cooldown"];
    }
    fs.writeFileSync("./data.json", JSON.stringify(data, null, 4));
}

function getLevel(xp){
    for(let i = 100; i >= 0 ; --i){
        if(xp >= 5 * (Math.pow(i, 2)) + 50 * i + 100){
            return i;
        }
    }
    return 0;
}

function addRole(server, memberID, role){
    if(!server || !memberID || !role) return;
    const guild = index.bot.guilds.cache.get(server);
    guild.members.fetch(memberID).then((member) => {
        member.roles.add(role);
    });
}

function removeRole(server, memberID, role){
    if(!server || !memberID || !role) return;
    const guild = index.bot.guilds.cache.get(server);
    guild.members.fetch(memberID).then((member) => {
        member.roles.remove(role);
    });
}