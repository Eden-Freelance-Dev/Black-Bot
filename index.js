const Discord = require("discord.js");
const fs = require("fs");
const level = require("./level.js");
const autoRole = require("./autorole.js");

const botConfig = JSON.parse(fs.readFileSync("config.json"));
const PREFIX = botConfig["general"]["prefix"];
const TOKEN = botConfig["general"]["token"];

const bot = new Discord.Client({ partials: ["MESSAGE", "REACTION"] });
module.exports.bot = bot;
bot.commands = new Discord.Collection();

const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));

if (commandFiles.length <= 0) { //exit the bot if no commands found
    console.log("No commands found to load!")
    return;
}

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	bot.commands.set(command.name, command);
}


bot.on("message", async msg => {
    if(msg.author.bot) return;

    let data = JSON.parse(fs.readFileSync("data.json"));
    //if member not in list, add entry
    if(!data[msg.author.id]){
        data[msg.author.id] = {
            "name": msg.member.displayName,
            "currency": {
                "value": 0,
                "payday-cooldown": 0, 
                "has-collected-daily": false
            },
            "level": {
                "xp": 0,
                "cooldown": 0
            }
        }
    }

    //renew username
    if(data[msg.author.id]["name"] != msg.member.displayName){
        data[msg.author.id]["name"] = msg.member.displayName;
    }

    fs.writeFileSync("data.json", JSON.stringify(data, null, 4));

    let args = msg.content.substring(PREFIX.length).split(" ");
    let message = msg.content.substring(0);

    for (var i = 0; i < args.length; i++){
        var a = args[i].split("+");
        if(a.length > 1){
            args[i] = a.join(" ");
        }
    }
    if(message.substring(0, PREFIX.length) == PREFIX){
        if (bot.commands.has(args[0])){
            try {
                await bot.commands.get(args[0]).execute(msg, args);
            } catch (error) {
                console.error(error);
                await msg.reply(`There was an error trying to execute the ${args[0]} command!`);
            }
        }
    }
    else{
        level.addXp(msg,args);
    }
});

bot.once("ready", async() => {
    console.log("Ready!");
    setInterval(()=>{
        //cooldown for xp
        let data = JSON.parse(fs.readFileSync("./data.json"));
        for(let element in data){
            if(data[element]["level"]["cooldown"] > 0){
                data[element]["level"]["cooldown"]--;
            }
            if(data[element]["currency"]["payday-cooldown"] > 0){
                data[element]["currency"]["payday-cooldown"]--;
            }
        }

        //update daily reward
        let internalData = JSON.parse(fs.readFileSync("./internal-data.json"));
        let today = new Date();
        let date = today.getDate();
        if(date != internalData["last-date"]){
            for(let element in data){
                data[element]["currency"]["has-collected-daily"] = false;
            }
            internalData["last-date"] = date;
            fs.writeFileSync("./internal-data.json", JSON.stringify(internalData, null, 4));
        }
        
        fs.writeFileSync("./data.json", JSON.stringify(data, null, 4))
    }, 1000);
});

bot.on("messageReactionAdd", async (reaction, user) => {
    await autoRole.onReactionAdd(reaction, user);
})

bot.on("messageReactionRemove", async (reaction, user) => {
    await autoRole.onReactionRemove(reaction, user);
})

bot.on("guildMemberAdd", async member => {
    const role = await member.guild.roles.fetch(botConfig["roles"]["join-role"]);
    member.roles.add(role)
    .catch(error => {
        console.log(error);
    });
    let internalData = JSON.parse(fs.readFileSync("internal-data.json"));
    internalData["newcomers"][member.id] = false;

    const channel = await bot.channels.cache.get(botConfig["channels"]["agree-channel"]);
    await channel.send(`<@${member.id}>, welcome to the server! Please type "${PREFIX}agree" to agree to the rules and gaining access to the rest of the server! `);

    channel.awaitMessages(msg => {return msg.content == `${PREFIX}agree` && msg.author.id == member.id}, {max: 1, time: 3600000, errors: ["time"]})
    .then(async collected => {
        member.roles.remove(role)
        .catch(error => {
            console.log(error);
        });
        const general = await bot.channels.cache.get(botConfig["channels"]["general"]);
        await general.send(`${member.displayName} has joined the server!`);
    })
    .catch(async collected => {
        await member.kick("Timed out.")
        .catch(error => {
            console.log(error);
        })
    })
})

bot.once("reconnecting", () => {
    console.log("Reconnecting!");
});
bot.once("disconnect", () => {
    console.log("Disconnect!");
});
bot.on("shardError", error => {
    console.log(error);
});
bot.on("unhandledRejection", error => {
    console.log(error);
});

bot.login(TOKEN);