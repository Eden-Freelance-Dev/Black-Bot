const fs = require("fs");
const botConfig = require("./../config.json");

module.exports = {
    name: 'give',
	description: 'Gives away some currency',
	execute(msg, args) {
        const data = JSON.parse(fs.readFileSync("./data.json"));
		if(!args[1] || !msg.mentions.members.first()){
            msg.channel.send(`Please specify an amount and who to give to.`);
            return;
        }
        if(isNaN(args[1])){
            msg.channel.send("Invalid amount.");
            return;
        }
        if(parseInt(args[1]) > data[msg.author.id]["currency"]["value"]){
            msg.channel.send(`Not enough ${botConfig["currency"]["currency-name"]}`);
            return;
        }

        data[msg.author.id]["currency"]["value"] -= args[1];
        data[msg.mentions.members.first().id]["currency"]["value"] += args[1];

        msg.channel.send(`${args[1]} ${botConfig["currency"]["currency-name"]} has been given to ${msg.mentions.members.first().displayName}.`);
	},
}