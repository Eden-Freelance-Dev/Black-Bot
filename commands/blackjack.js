const Discord = require("discord.js");
const fs = require("fs");
const botConfig = JSON.parse(fs.readFileSync("./config.json"));
const main = require("./../index.js");
let isBlackjackRunning = false;

module.exports = {
    name: "blackjack",
	description: "Starts a blackjack game: !blackjack [bet]",
	async execute(msg, args) {
		let internalData = JSON.parse(fs.readFileSync("./internal-data.json"));
		let data = JSON.parse(fs.readFileSync("./data.json"));
		const author = data[msg.author.id];
		const bet = parseInt(args[1]);

		if(isBlackjackRunning){
			msg.channel.send("There is already a blackjack game in progress! Type !join to join it!");
			return;
		}

		if(!args[1]) {
			msg.channel.send("Please specify a bet!");
			return;
		}
		if(isNaN(args[1])) {
			msg.channel.send("Invalid bet.")
			return;
		}
		if(parseInt(args[1]) < botConfig["blackjack"]["min-bet"] || parseInt(args[1]) > botConfig["blackjack"]["max-bet"]){
			msg.channel.send(`Bet must be in between ${botConfig["blackjack"]["min-bet"]} and ${botConfig["blackjack"]["max-bet"]}`);
			return;
		}
		if(author["currency"]["value"] < bet){
			msg.channel.send("Insufficient currency.");
			return;
		}

		let users = [];
		users.push(msg.author.id);

		await msg.channel.send("A blackjack game has begun! Type !join in the next minute to join it! Type !addbot to add a bot, and !forcestart to force start the game!");
		isBlackjackRunning = true;
		
		const userFilter = response =>{
			if("!join" == response.content) return true;
			if(response.author.id != msg.author.id) return false;
			if("!addbot" == response.content) return true;
			if("!forcestart" == response.content) return true;
		}
		const userCollector = await msg.channel.createMessageCollector(userFilter, { max: 1000, time: botConfig["blackjack"]["join-time"]});
		let collected = 1;

		let bot = 0;

		userCollector.on("collect", async collectedMessage => {
			if(collectedMessage.content == "!forcestart"){
				await userCollector.stop();
				return;
			}

			if(collected >= botConfig["blackjack"]["max-room-size"]){
				await collectedMessage.channel.send("Room is full!");
				userCollector.stop();
				return;
			}

			if(collectedMessage.content == "!addbot"){
				bot++;
				await collectedMessage.channel.send(`Bot${bot} added to game.`);
				users.push(`BOT${bot}`);
				collected++;
				return;
			}

			const user = data[msg.author.id];

			if(user["currency"]["value"] < bet){
				await collectedMessage.channel.send(`Insufficient ${botConfig["currency"]["currency-name"]}.`);
				return;
			}
			if(users.some((element)=>{return element == collectedMessage.author.id})){
				await collectedMessage.channel.send("You already joined the game.");
				return;
			}
			users.push(collectedMessage.author.id);
			collected++;
			await collectedMessage.channel.send(`User ${collectedMessage.member.displayName} has been added to the game.`);

			if(collected >= botConfig["blackjack"]["max-room-size"]){
				await userCollector.stop();
			}
		});

		userCollector.on("end", async (collectedMessages) => {
			//if not enough players
			if(collected < botConfig["blackjack"]["min-room-size"]){
				await msg.channel.send(`${botConfig["blackjack"]["min-room-size"] - collected} bot(s) added to game to avoid abuse.`);
				for(let i = collected + 1; i <= botConfig["blackjack"]["min-room-size"]; ++i){
					bot++;
					users.push(`BOT${bot}`);
					collected++;
				}
			}

			//setup
			let internalData = JSON.parse(fs.readFileSync("./internal-data.json"));
			internalData["blackjack-data"] = [];
			
			users.forEach(element => {
				internalData["blackjack-data"].push({
					"ID": element,
					"deck": [],
					"stand": false,
					"dead": false
				});
			});

			internalData["blackjack-deck"] = getAllCards();
			fs.writeFileSync("./internal-data.json", JSON.stringify(internalData, null, 4));

			//gameplay loop
			await msg.channel.send("Game has started.");

			let cardsToDraw = 2;
			//draw cards on start
			
			users.forEach(async user =>{
				let currentUser;
				internalData["blackjack-data"].forEach(element =>{
					if(element["ID"] == user){
						currentUser = element;
					}
				})
				for(let i = 0; i < cardsToDraw; ++i){
					let random = Math.floor(Math.random() * internalData["blackjack-deck"].length);
					//add to bot deck
					currentUser["deck"].push(internalData["blackjack-deck"][random]);
					//remove from public deck
					internalData["blackjack-deck"].splice(random, 1);
				}
				if(user.substring(0,3) != "BOT"){
					let embed = new Discord.MessageEmbed()
					.setTitle("Your current deck")
					.addField("Deck", getDeckString(currentUser["deck"]))
					.addField("Total value", getTotal(currentUser["deck"]));
					await main.bot.users.cache.get(currentUser["ID"]).send(embed)
					.catch(async err=>{
						await msg.channel.send(`Unable to DM deck to <@${currentUser["ID"]}>. Please enable your DMs to play this game.`);
					});
				}
			});

			fs.writeFileSync("./internal-data.json", JSON.stringify(internalData, null, 4));

			await msg.channel.send("Two cards have automatically been draw for you.");
			let currentIndex = 0;
			while(true){
				internalData = JSON.parse(fs.readFileSync("./internal-data.json"));
				if(internalData["blackjack-data"].every(element => { return element["stand"] || element["dead"]; })){
					await msg.channel.send("Everyone has decided to stand or have died. Now lets sum up the scores.");

					internalData["blackjack-data"].sort((a, b) =>{
						return getTotal(b["deck"]) - getTotal(a["deck"]);
					});
					
					await podium(internalData["blackjack-data"], msg, bet);
					isBlackjackRunning = false;
					
					break;
				}

				await round(users[currentIndex], msg);
				
				currentIndex++;
				if(currentIndex >= collected){
					currentIndex = 0;
				}
			}
			
		});
		
	},
}

async function round(user, msg){
	let internalData = JSON.parse(fs.readFileSync("./internal-data.json"));

	let currentUser;
				
	internalData["blackjack-data"].forEach(element =>{
		if(element["ID"] == user){
			currentUser = element;
		}
	})
	if(!currentUser["stand"] && !currentUser["dead"]){
		let isEndRound = false;

		//if it is the bot's turn
		if(user.substring(0,3) == "BOT"){
			//console.log(`It is ${currentUser["ID"]}'s turn.`);
			await msg.channel.send(`It is ${currentUser["ID"]}'s turn.`);
			const value = getTotal(currentUser["deck"]);
			if(value >= 17){ // stand
				//console.log(`${currentUser["ID"]} has decided to stand.`);
				await msg.channel.send(`${currentUser["ID"]} has decided to stand.`);
				currentUser["stand"] = true;
			}
			else{ // hit
				//console.log(`${currentUser["ID"]} has decided to hit.`);
				await msg.channel.send(`${currentUser["ID"]} has decided to hit.`);

				let random = Math.floor(Math.random() * internalData["blackjack-deck"].length);
				//add to bot deck
				currentUser["deck"].push(internalData["blackjack-deck"][random]);
				//remove from public deck
				internalData["blackjack-deck"].splice(random, 1);

				//check if user has died
				if(getTotal(currentUser["deck"]) > 21){
					await msg.channel.send(`${currentUser["ID"]} has died. Their cards added up to ${getTotal(currentUser["deck"])}. R.I.P.`);
					currentUser["dead"] = true;
				}
			}
		}
		else{ //if it is a player's turn
			await msg.channel.send(`<@${currentUser["ID"]}>, it is your turn. Please type "!h" to hit or "!s" to stand.`);

			const filter = collectedMessage =>{
				if(collectedMessage.author != currentUser["ID"]) return false;
				if(collectedMessage.content == "!s") return true;
				if(collectedMessage.content == "!h") return true;
				return false;
			};

			await msg.channel.awaitMessages(filter, { max: 1, time: botConfig["blackjack"]["turn-time"], errors: ["time"]})
			.then(async collected => {
				const cmd = collected.first();
				if(cmd.content == "!h"){
					await cmd.channel.send(`<@${currentUser["ID"]}> has decided to hit. Check DMs for your new deck.`);

					let random = Math.round(Math.random() * internalData["blackjack-deck"].length);
					//add to user deck
					currentUser["deck"].push(internalData["blackjack-deck"][random]);
					//remove from public deck
					internalData["blackjack-deck"].splice(random, 1);

					//dm deck to user
					const user = main.bot.users.cache.get(currentUser["ID"]);
					let embed = new Discord.MessageEmbed()
					.setTitle("Your current deck")
					.addField("Deck", getDeckString(currentUser["deck"]))
					.addField("Total value", getTotal(currentUser["deck"]));
					await user.send(embed)
					.catch(async err=>{
						await msg.channel.send(`Unable to DM deck to <@${currentUser["ID"]}>. Please enable your DMs to play this game.`);
					});

					//check if user has died
					if(getTotal(currentUser["deck"]) > 21){
						msg.channel.send(`<@${currentUser["ID"]}> has died. Their cards added up to ${getTotal(currentUser["deck"])}. R.I.P.`);
						currentUser["dead"] = true;
					}
				}
				else if(cmd.content == "!s"){
					await cmd.channel.send(`<@${currentUser["ID"]}> has decided to stand.`);
					currentUser["stand"] = true;
				}
				isEndRound = true;
			})
			.catch(async collected => {
				await msg.channel.send(`Time has ran out. By default, <@${currentUser["ID"]}> will be forced to stand.`);
				currentUser["stand"] = true;
				isEndRound = true;
			})

			//wait untill round end
			while(!isEndRound){}
		}

		fs.writeFileSync("./internal-data.json", JSON.stringify(internalData, null, 4));
	}
}

async function podium(sortedData, msg, bet){
	

	let deadList = [];
	let winnerList = [];
	for(let i = sortedData.length - 1; i >= 0; --i){
		if(sortedData[i]["dead"]){
			deadList.push(sortedData[i]);
			sortedData.splice(i,1);
		}
	}
	const winningScore = getTotal(sortedData[0]["deck"]);
	for(let i = sortedData.length - 1; i >= 0; --i){
		if(getTotal(sortedData[i]["deck"]) == winningScore){
			winnerList.push(sortedData[i]);
			sortedData.splice(i,1);
		}
	}

	const award = Math.round(bet * (sortedData.length + deadList.length + winnerList.length) / winnerList.length);

	let deadEmbed = new Discord.MessageEmbed()
	.setTitle("Disqualified")
	.setColor("#ff0000");
	let leaderBoard = new Discord.MessageEmbed()
	.setTitle("Leaderboard")
	.setColor("#0099ff");
	let winner = new Discord.MessageEmbed()
	.setTitle("And the winner is...")
	.setColor("#00ff00");
	
	deadList.forEach(element => {
		if(element["ID"].substring(0,3) == "BOT"){
			deadEmbed.addField(element["ID"], `Deck: ${getDeckString(element["deck"])}\nTotal: ${getTotal(element["deck"])}`);
			return;
		}
		const deadMember = msg.guild.members.cache.get(element["ID"]);
		deadEmbed.addField(deadMember.displayName, `Deck: ${getDeckString(element["deck"])}\nTotal: ${getTotal(element["deck"])}`);
	});

	winnerList.forEach(element => {
		if(element["ID"].substring(0,3) == "BOT"){
			winner.addField(element["ID"], `Deck: ${getDeckString(element["deck"])}\nTotal: ${getTotal(element["deck"])}`);
			return;
		}
		const winnerMember = msg.guild.members.cache.get(element["ID"]);
		winner.addField(winnerMember.displayName, `Deck: ${getDeckString(element["deck"])}\nTotal: ${getTotal(element["deck"])}`);
	});

	sortedData.forEach(element => {
		if(element["ID"].substring(0,3) == "BOT"){
			leaderBoard.addField(element["ID"], `Deck: ${getDeckString(element["deck"])}\nTotal: ${getTotal(element["deck"])}`);
			return;
		}
		const member = msg.guild.members.cache.get(element["ID"]);
		leaderBoard.addField(member.displayName, `Deck: ${getDeckString(element["deck"])}\nTotal: ${getTotal(element["deck"])}`)
	});

	if(deadList.length > 0){
		await msg.channel.send(deadEmbed);
	}

	if(sortedData.length > 0){
		await msg.channel.send(leaderBoard);
	}	

	if(winnerList.length > 0){
		await msg.channel.send(winner);
		await msg.channel.send(`${bet * (sortedData.length + deadList.length + winnerList.length)}/${winnerList.length} (${award}) ${botConfig["currency"]["currency-name"]} has been added to each of the winners.`);
		let data = JSON.parse(fs.readFileSync("./data.json"));
		//add or subtract currency
		deadList.forEach(element => {
			if(element["ID"].substring(0,3) == "BOT"){
				return;
			}
			data[element["ID"]]["currency"]["value"] -= bet; 
		});
		sortedData.forEach(element => {
			if(element["ID"].substring(0,3) == "BOT"){
				return;
			}
			data[element["ID"]]["currency"]["value"] -= bet; 
		})
		winnerList.forEach(element => {
			if(element["ID"].substring(0,3) == "BOT"){
				return;
			}
			data[element["ID"]]["currency"]["value"] -= bet; 
			data[element["ID"]]["currency"]["value"] += award; 
		})
		fs.writeFileSync("./data.json", JSON.stringify(data, null, 4));

	}
}

function getAllCards(){
	let cards = [];
	for(let i = 1; i <= 13; i++){
		let number = `${i}`;
		if(number == "11"){
			number = "J";
		}
		else if(number == "12"){
			number = "Q";
		}
		else if(number == "13"){
			number = "K";
		}
		for(let j = 1; j <= 4; j++){
			let symbol = 0;
			switch(j){
				case 1:
					symbol = "♢";
					break;
				case 2:
					symbol = "♧";
					break;
				case 3:
					symbol = "♡";
					break;
				case 4:
					symbol = "♤";
					break;
			}
			cards.push(`${number}${symbol}`);
		}
	}
	return cards;
}

function getTotal(deck){
	let total = 0;
	deck.forEach(element => {
		//if its not a number (J,Q,K)
		try{
			if(element.substring(0,2) == "10"){
				total += 10;
			}
			else if(isNaN(element.substring(0,1))){
				total += 10;
			}
			else{
				total += parseInt(element.substring(0,1));
			}
		}
		catch{
			console.log("Error:", deck, element)
		}
	})
	return total;
}

function getDeckString(deck){
	let deckString = "";
	deck.forEach(element => {
		deckString = deckString + element + " ";
	})
	return deckString;
}