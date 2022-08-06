import { Client, GatewayIntentBits } from "discord.js"
import * as dotenv from "dotenv"

import { getAllCommands } from './bot-framework/command'
import { getAllInitializers } from './bot-framework/initializer'
import { getAllModals, ModalConstructor } from "./bot-framework/modal"
import { CubeChatInputCommandInteraction, CubeModalSubmitInteraction } from "./util/discord"

dotenv.config()

let modals: ModalConstructor<any>[] = []
const client = new Client({ intents: [GatewayIntentBits.Guilds]})

/////////////////
/// Initialize
////////
getAllInitializers().then(async initializers => {
	try {
		for (const initializer of initializers)
			await initializer.run()

		client.commands = await getAllCommands()

		// modals = await getAllModals()
		// if (new Set(modals.map(modal => modal.customId)).size < modals.length)
		// 	return console.error('Some modals have the same customId')

	} catch (err) {
		return console.error('Error while initializing', err)
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
				if (!i.replied) await i.replyFirst('Done')
			} catch (err) {
				console.error(`Error while running command ${command.name}`, err)
				i.reply('Oh no! Error encountered while running command :(')
			}
		} else {
			i.reply('Oh no! It seems that this command has been removed')
		}
	}

	// else if (interaction.isModalSubmit()) {
	// 	const i = new CubeModalSubmitInteraction(interaction)
	// 	const modal = modals.find(modal => modal.customId === interaction.customId)
	// 	if (modal) {
	// 		await modal.run(i)
	// 	}
	// }
	
})