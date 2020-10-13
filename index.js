const Discord = require("discord.js");
const fs = require("fs");
const level = require("./level.js");

const botConfig = JSON.parse(fs.readFileSync("config.json"));
const PREFIX = botConfig["general"]["prefix"];
const TOKEN = botConfig["general"]["token"];

const bot = new Discord.Client();
module.exports.bot = bot;
bot.commands = new Discord.Collection();

const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith('.js'));

if (commandFiles.length <= 0) { //exit the bot if no commands found
    console.log("No commands found to load!")
    return;
}

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	bot.commands.set(command.name, command);
}

bot.on('message', async msg=>{

    let args = msg.content.substring(PREFIX.length).split(" ");
    let message = msg.content.substring(0);

    for (var i = 0; i < args.length; i++){
        var a = args[i].split("+");
        if(a.length > 1){
            args[i] = a.join(" ");
        }
    }

    
})

bot.on('message', msg => {
    if(msg.author.bot) return;

    let data = JSON.parse(fs.readFileSync("data.json"));
    //if member not in list, add entry
    if(!data[msg.author.id]){
        data[msg.author.id] = {
            "name": msg.member.displayName,
            "currency": {
                "value": 0,
                "hasCollectedDaily": false
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
    if (bot.commands.has(args[0])){
        try {
            bot.commands.get(args[0]).execute(msg, args);
        } catch (error) {
            console.error(error);
            message.reply(`There was an error trying to execute the ${args[0]} command!`);
        }
    }
    else{
        if(message[0] != PREFIX){
            level.addXp(msg,args);
        }
    }
    
});

bot.once('ready', async() => {
    console.log('Ready!');
    setInterval(()=>{
        let data = JSON.parse(fs.readFileSync("data.json"));
        for(let element in data){
            if(data[element]["level"]["cooldown"] > 0){
                data[element]["level"]["cooldown"] = 0; //FOR TESTING
                //data[element]["level"]["cooldown"]--;
            }
        }

        let internalData = JSON.parse(fs.readFileSync("internal-data.json"));
        let today = new Date();
        let date = today.getDate();
        if(date != internalData["last-date"]){
            for(let element in data){
                data[element]["currency"]["has-collected-daily"] = false;
            }
            internalData["last-date"] = date;
            fs.writeFileSync("internal-data.json", JSON.stringify(internalData, null, 4))
        }

        fs.writeFileSync("data.json", JSON.stringify(data, null, 4))
    }, 1000);
});
bot.once('reconnecting', () => {
    console.log('Reconnecting!');
});
bot.once('disconnect', () => {
    console.log('Disconnect!');
});

bot.on('shardError', console.log)

bot.on('unhandledRejection', error => {
    console.log(error);
});

bot.login(TOKEN);