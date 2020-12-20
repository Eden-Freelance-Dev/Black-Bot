let recentGiveaways = [];
const fs = require("fs");
const botConfig = JSON.parse(fs.readFileSync("config.json"));

module.exports = {
    name: 'giveaway',
	async execute(msg, args) {
		
		let links = JSON.parse(fs.readFileSync("nitro-links.json"));
		if(links.length <= 0) return msg.channel.send("There is no prize to be given at the moment.");
		if(recentGiveaways.includes(msg.author.id)) return msg.channel.send("Please wait 24 hours before you use this command again.");


		if(Math.random() < botConfig["giveaway"]["chance"]){
			try{
				await msg.member.send(`Congrats! Here is your nitro link: ${links[0]}.`)
			}
			catch{
				return msg.channel.send("I cannot DM you. Please enable your DMs before generating.");
			}
			await msg.channel.send(`Congrats, ${msg.member} has won the giveaway!`);
			links = links.splice(1);
			fs.writeFileSync("nitro-links.json", JSON.stringify(links, null, 4));
		}
		else{
			msg.channel.send("Generation unsuccessful. Try again tomorrow!");
		}

		recentGiveaways.push(msg.author.id);
	},
}