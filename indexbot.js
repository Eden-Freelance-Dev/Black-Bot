//const {Client, Attachment, RichEmbed} = require('discord.js');
const Discord = require("discord.js");
const botSettings = require("./botsettings.json");
const fs = require("fs");
const random = require('random');
const ms = require("ms");
const jsonfile = require('jsonfile');
const count = require("./count.json");


const CMDS_PATH = `./cmds`;
const PREFIX = botSettings.PREFIX;
const CMD_DEFAULT_COOLDOWN = 60; //in seconds; that's the default cooldown for commands if they don't have a specific time set in their own command js file

//Chat spam protection constants:
const usersMap = new Map(); //map to keep track of chatting users
const LIMIT = 5; //how many messages
const TIME = 7000; //window of time to test frequency
const DIFF = 3000; //how often can they be entered

const bot = new Discord.Client({
    disableEveryone: true,
    partials: ['MESSAGE', 'REACTION']
});
bot.commands = new Discord.Collection();

//Command folder parsing
const commandFiles = fs.readdirSync(CMDS_PATH).filter(file => file.endsWith('.js')); //read the directory specified by CMDS_PATH to look for command files, check only for javascript files (.js)

if (commandFiles.length <= 0) { //exit the bot if no commands found
    console.log(`No commands found to load in ` + CMDS_PATH + `!`)
    return;
}

for (const file of commandFiles) {//mount read commands into the bot
    const command = require(CMDS_PATH+`/${file}`);
    bot.commands.set(command.help.name, command);
    console.log((commandFiles.indexOf(file) + 1) + ". " + file + ` loaded!`);
}

const cooldowns = new Discord.Collection(); //initialise command cooldown collection

//Welcome function - unhandled promise, commented out
/*
bot.on('guildMemberAdd' , member => {

    const channel = member.guild.channels.cache.find(channel => channel.name === 'newcomers');
    if(!channel) return;

    channel.send(`Welcome to the server, ${member}, please read the rules in the rules channel!`).then(msg => msg.delete(20000))
});
*/
//User Roles functions START
// bot.on('messageReactionAdd', async (reaction, user) => {
//     const ROLE_MENU = botSettings.roleMenus;
//     let applyRole = async () => {
//         let emojiName = reaction.emoji.name;
//         let role = reaction.message.guild.roles.cache.find(role => role.name.toLowerCase() === emojiName.toLowerCase());
//         let member = reaction.message.guild.members.cache.find(member => member.id === user.id);
//         try {
//             if (role && member) {
//                 await member.roles.add(role);
//                 console.log(`Added role ${role.name} to user ${member.displayName}`);
//             }
//
//         } catch(error) {
//             console.log(error)
//         }
//     }
//
//     //when we receive a reaction we check if it is partial or not (partial is without complete info, only ID is guaranteed then)
//     if (reaction.message.partial) {
//         //if the message this reaction belongs to was removed, the fetching might result in an API error, which we need to handle
//         try {
//             let fullMsg = await reaction.message.fetch();
//             if (ROLE_MENU.includes(fullMsg.id)) {
//                 applyRole();
//             }
//         } catch (error) {
//             console.log('Something went wrong when fetching the message: ', error);
//             //return as `reaction.message.author` may be undefined/null
//             return;
//         }
//     } else {
//         if (ROLE_MENU.includes(reaction.message.id)) {
//             applyRole();
//         }
//     }
//
// });

// bot.on('messageReactionRemove', async (reaction, user) => {
//     const ROLE_MENU = botSettings.roleMenus;
//     let removeRole = async () => {
//         let emojiName = reaction.emoji.name;
//         let role = reaction.message.guild.roles.cache.find(role => role.name.toLowerCase() === emojiName.toLowerCase());
//         let member = reaction.message.guild.members.cache.find(member => member.id === user.id);
//         try {
//             if (role && member) {
//                 await member.roles.remove(role);
//                 console.log(`Removed role ${role.name} from user ${member.displayName}`);
//             }
//
//         } catch(error) {
//             console.log(error)
//         }
//     }
//
//     //when we receive a reaction we check if it is partial or not (partial is without complete info, only ID is guaranteed then)
//     if (reaction.message.partial) {
//         //if the message this reaction belongs to was removed, the fetching might result in an API error, which we need to handle
//         try {
//             let fullMsg = await reaction.message.fetch();
//             if (ROLE_MENU.includes(fullMsg.id)){
//                 removeRole();
//             }
//         } catch (error) {
//             console.log('Something went wrong when fetching the message: ', error);
//             //return as `reaction.message.author` may be undefined/null
//             return;
//         }
//     } else {
//         if (ROLE_MENU.includes(reaction.message.id)) {
//             removeRole();
//         }
//     }
//
// });
//User Roles functions STOP

// INPUT COMMAND PROCESSOR - splits command cue into the command word and arguments
bot.on('message', async message => {

    if(!message.content.startsWith(PREFIX) || message.author.bot || message.channel.type === "dm") return;

    

    const args = message.content.slice(PREFIX.length).split(/ +/); //cut the command prefix and split the arguments, ignoring spaces between them if multiple (/ +/)
    const commandName = args.shift().toLowerCase(); //lower case everything to make comparisons easier

    const command = bot.commands.get(commandName)
        || bot.commands.find(cmd => cmd.help.aliases && cmd.help.aliases.includes(commandName)); //find a matching command.help.name by full or by alias

    if (!command) return; //if no such command found, exit

    //server-only commands(always true because of a conditional above)
    /*
    if (command.guildOnly && message.channel.type !== 'text') {
        return message.reply('I can\'t execute that command inside DMs!');
    }
    */

    //mod permission requirement
    if (command.help.mod) {
        if (!message.member.hasPermission("MANAGE_MESSAGES")) {
            return message.channel.send(`You don't have permissions required to run ${PREFIX}${command.help.name}, ${message.author}`);
        }
    }

    //only in bot channel filtering
    if (command.help.nsfw && message.channel.id != botSettings.botchannel){
        return message.channel.send(`Use this command only in <#${botSettings.botchannel}>`);
    }

    //ARGUMENTS
    if (command.help.args && !args.length) {
        let reply = `You didn't provide any arguments, ${message.author}!`;

        if (command.help.usage) { //if command has usage string defined, this will print it out
            reply += `\nThe proper usage would be:\n\`${PREFIX}${command.help.name} ${command.help.usage}\``;
        }

        return message.channel.send(reply);
    }

    //cooldowns
    if (!message.member.hasPermission("MANAGE_MESSAGES")) { //cooldowns do not affect moderators
        if (message.channel.id != botSettings.botchannel) { //and do not get enforced in #spam CHANGE THIS!!!
            if (!cooldowns.has(command.help.name)) { //track command.help.usage for cooldown purposes
                cooldowns.set(command.help.name, new Discord.Collection());
            }

            const now = Date.now();
            const timestamps = cooldowns.get(command.help.name);
            const cooldownAmount = (command.help.cooldown || CMD_DEFAULT_COOLDOWN) * 1000; //times 1000 because it's in miliseconds. each command can have its own cooldown set in their .js file, in case it doesn't have one the default will be used

            if (timestamps.has(message.author.id)) {
                const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

                if (now < expirationTime) {
                    const timeLeft = (expirationTime - now) / 1000; //1000 because miliseconds
                    return message.reply(`please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.help.name}\` command.`);
                }
            }

            timestamps.set(message.author.id, now);
            setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
        }
    }
    try {
        command.run(bot, message, args);//TODO remove not needed "bot" from here and all module.export.run codes
    } catch (error) {
        console.error(error);
        message.reply('there was an error trying to execute that command!');
    }
});


//Blacklist/word censor/spam protection
bot.on('message', async message=>{

    

    if(message.author.bot || message.channel.type === "dm") return;

    // blacklist word censor START
    let messageArray = message.content.split(" ")
    let command = messageArray[0].toLowerCase();
    let args = messageArray.slice(1);

    let blacklisted = ['fag','nigger','nigga','whore', 'wh0re'];
    let foundInText = false;

    for (var i in blacklisted) {
        if (message.content.toLowerCase().includes(blacklisted[i].toLowerCase())) foundInText = true;
    }
    if(foundInText){
        message.delete();
        message.channel.send('You just used a very bad word, you naughty person!');
    }
    // blacklist word censor FINISH



    //chat spam protection - frequency checking
    if (message.member.hasPermission("MANAGE_MESSAGES") || message.channel.id == botSettings.botchannel) return;//mods and #town immune to this spam protection
    if (usersMap.has(message.author.id)) {
        const userData = usersMap.get(message.author.id);
        const { lastMessage, timer } = userData;
        const difference = message.createdTimestamp - lastMessage.createdTimestamp;
        let msgCount = userData.msgCount;
        console.log(difference);
        if(difference > DIFF) { //if a member chats too often add them to the cache tracking message outputs. Else, reset their cached info
            clearTimeout(timer);
            console.log('Cleared timeout');
            userData.msgCount = 1;
            userData.lastMessage = message;
            userData.timer = setTimeout(() => {
                usersMap.delete(message.author.id);
                console.log('Removed from RESET.');
            }, TIME);
            usersMap.set(message.author.id, userData);
        }
        else {
            ++msgCount;
            if(parseInt(msgCount) === LIMIT) { //if cached info on a user says they have passed the LIMIT, they get a short mute
                const role = message.guild.roles.cache.find(r => r.name === "🔇 Muted");
                message.member.roles.add(role);
                message.channel.send('You have been muted for excessive chat spamming');
                setTimeout(() => {
                    message.member.roles.remove(role);
                    message.channel.send('You have been unmuted');
                }, TIME);
            } else {
                userData.msgCount = msgCount;
                usersMap.set(message.author.id, userData);
            }
        }
    }
    else {
        let fn = setTimeout(() => {
            usersMap.delete(message.author.id);
            console.log('Removed from map.');
        }, TIME);
        usersMap.set(message.author.id, {
            msgCount: 1,
            lastMessage: message,
            timer: fn
        });
    }

})

// Member joins, give role
bot.on('guildMemberAdd', async member => {
  await member.roles.add(botSettings.unverifiedrole);
  await member.roles.add(botSettings.notificationrole);

});



//Bot connection/readiness
bot.once('ready', async() => {
    console.log('Ready!');

    try{
        let link = await bot.generateInvite(["ADMINISTRATOR"]);
        console.log(link);
    } catch(e){
        console.log(e.stack);
    }

});
bot.once('reconnecting', () => {
    console.log('Reconnecting!');
});
bot.once('disconnect', () => {
    console.log('Disconnect!');
});

bot.login(botSettings.token);
