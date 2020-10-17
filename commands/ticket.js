const Discord = require("discord.js");
const fs = require("fs");
const index = require("./../index.js");
const botConfig = JSON.parse(fs.readFileSync("config.json"));

module.exports = {
    name: 'ticket',
	description: 'Creates a new ticket channel.',
	async execute(msg, args) {
        if(!args[1]) return;
        if(args[1] == "open"){
            let internalData = JSON.parse(fs.readFileSync("./internal-data.json"));
                if(internalData["ticket-data"][msg.author.id]){
                    msg.channel.send("You already have a ticket channel opened!");
                    return;
                }

                const channel = await msg.guild.channels.create(`Ticket ${msg.author.tag}`, {
                    parent: botConfig["categories"]["ticket"]
                })
                .catch(console.log);
                await channel.updateOverwrite(msg.author, {VIEW_CHANNEL: true, SEND_MESSAGES: true})
                .catch(console.log);

                botConfig["roles"]["mods"].forEach(async element => {
                    const role = await msg.guild.roles.fetch(element);
                    await channel.updateOverwrite(role, {VIEW_CHANNEL: true, SEND_MESSAGES: true})
                    .catch(console.log);
                });

                internalData["ticket-data"][msg.author.id] = channel.id;
                fs.writeFileSync("./internal-data.json", JSON.stringify(internalData, null, 4));

                await msg.channel.send(`#${channel.name} has successfuly been opened!`);
        }
        else if(args[1] == "close"){
            let internalData = JSON.parse(fs.readFileSync("./internal-data.json"));
            if(internalData["ticket-data"][msg.author.id]){
                const channel = await index.bot.channels.fetch(internalData["ticket-data"][msg.author.id]).catch(console.log);
                await channel.delete().catch(console.log);;
                await msg.channel.send(`#${channel.name} has been closed!`);
                delete internalData["ticket-data"][msg.author.id];
                fs.writeFileSync("./internal-data.json", JSON.stringify(internalData, null, 4));
            }
            else if(msg.mentions.channels.first()){
                if(msg.member.hasPermission("MANAGE_CHANNELS")){
                    for(let member in internalData["ticket-data"]){
                        if(msg.mentions.channels.first().id == internalData["ticket-data"][member]){
                            const channel = msg.mentions.channels.first();
                            channel.delete();
                            msg.channel.send(`#${channel.name} has been closed!`);
                            delete internalData["ticket-data"][member];
                            fs.writeFileSync("./internal-data.json", JSON.stringify(internalData, null, 4));
                        }
                    }
                }
            }
            else{
                msg.channel.send("You currently dont have any tickets opened!");
            }
        }
	},
}