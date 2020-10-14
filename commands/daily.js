const Discord = require("discord.js");
const fs = require("fs");
const botConfig = JSON.parse(fs.readFileSync("config.json"));

module.exports = {
    name: 'daily',
    description: 'Collects your daily reward',
    
	execute(msg, args) {
        const data = JSON.parse(fs.readFileSync("./data.json"));
        if(!data[msg.author.id]) return;

        let user = data[msg.author.id];

        if(!user["currency"]["has-collected-daily"]){
            user["currency"]["value"] += botConfig["currency"]["daily-amount"];
            user["currency"]["has-collected-daily"] = true;
            msg.channel.send(`You have successfully collected your daily reward! ${botConfig["currency"]["daily-amount"]} ${botConfig["currency"]["currency-name"]} has been added to your balance.`);
        }
        else{
            msg.channel.send(`You have already collected your daily reward.`)
        }

        fs.writeFileSync("./data.json", JSON.stringify(data, null, 4));
    }
}