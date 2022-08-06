import { Client, GatewayIntentBits } from "discord.js"
import * as dotenv from "dotenv"

import { getAllCommands } from './bot-framework/command'
import { getAllInitializers } from './bot-framework/initializer'
import { CubeChatInputCommandInteraction } from "./util/discord"

dotenv.config()

const client = new Client({ intents: [GatewayIntentBits.Guilds]})

/////////////////
/// Initialize
////////
getAllInitializers().then(async initializers => {
	try {
		for (const initializer of initializers)
			await initializer.run()
		client.commands = await getAllCommands()
	} catch (err) {
		console.error('Error while initializing', err)
		return
	}
	client.login(process.env.BOT_TOKEN)
})

client.once('ready', () => {
	console.log(`Logged in as @${client.user?.tag}!`)
})


client.on('interactionCreate', async interaction => {

	///////////////////////
	/// Slash Commands
	////////
	if (interaction.isChatInputCommand()) {
		const i = new CubeChatInputCommandInteraction(interaction)
		const command = client.commands.find(command => command.commandName === i.commandName)
		if (command) {
			try {
				await command.run(i)
				if (!interaction.replied) await i.replyFirst('Done')
			} catch (err) {
				console.error(`Error while running command ${command.name}`, err)
				i.reply('Oh no! Error encountered while running command :(')
			}
		} else {
			i.reply('Oh no! It seems that this command has been removed')
		}
	}
	
})