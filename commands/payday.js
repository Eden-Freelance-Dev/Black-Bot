const Discord = require("discord.js");
const fs = require("fs");
const botConfig = JSON.parse(fs.readFileSync("config.json"));

module.exports = {
    name: 'payday',
    description: 'Gives you some money',
    
	execute(msg, args) {
        const data = JSON.parse(fs.readFileSync("./data.json"));
        if(!data[msg.author.id]) return;

        let user = data[msg.author.id];

        if(user["currency"]["payday-cooldown"] <= 0){
            user["currency"]["value"] += botConfig["currency"]["payday-amount"];
            user["currency"]["payday-cooldown"] = botConfig["currency"]["payday-cooldown"];
            msg.channel.send(`You have successfully collected your payday! ${botConfig["currency"]["payday-amount"]} ${botConfig["currency"]["currency-name"]} has been added to your balance.`);
        }
        else{
            
            const seconds = user["currency"]["payday-cooldown"] % 60;
            const minutes = (user["currency"]["payday-cooldown"] - seconds) / 60
            msg.channel.send(`Your next payday is in ${minutes} minutes and ${seconds} seconds.`)
        }

        fs.writeFileSync("./data.json", JSON.stringify(data, null, 4));
    }
}