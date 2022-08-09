import { Client, Collection, GatewayIntentBits } from "discord.js"
import * as dotenv from "dotenv"

import { getAllCommands, Button, getAllButtons, Modal, getAllModals } from './bot-framework/interactions'
import { getAllInitializers } from './bot-framework/initializer'
import { CubeBaseInteraction, CubeButtonInteraction, CubeChatInputCommandInteraction, CubeModalSubmitInteraction } from "./util/discord"

dotenv.config()

const client = new Client({ intents: [GatewayIntentBits.Guilds]})
let buttons: Collection<string, Button>
let modals: Collection<string, Modal>

/////////////////
/// Initialize
////////
getAllInitializers().then(async initializers => {
	try {
		for (const initializer of initializers)
			await initializer.run()

		client.commands = new Collection((await getAllCommands()).map(command => [command.commandName, command]))
		buttons = new Collection((await getAllButtons()).map(button => [button.customId, button]))
		modals = new Collection((await getAllModals()).map(modal => [modal.customId, modal]))

	} catch (err) {
		return console.error('Error while initializing', err)
	}
	client.login(process.env.BOT_TOKEN)
})

client.once('ready', () => {
	console.log(`Logged in as @${client.user?.tag}!`)
})



client.on('interactionCreate', async interaction => {

	async function runInteraction<I extends CubeBaseInteraction>(
		interaction: I, 
		run: (interaction: I) => any,
		ephemeral?: boolean,
		doneMessage = 'Done'
	) {
		try {
			await run(interaction)
			if (interaction.deferred) return interaction.editReply(doneMessage)
			if (!interaction.replied) return interaction.reply({ 
				content: doneMessage, 
				ephemeral: ephemeral ?? false
			})
		} catch (err) {
			await interaction.replyError(err, ephemeral)
		}
	}

	///////////////////////
	/// Slash Commands
	////////
	if (interaction.isChatInputCommand()) {
		const i = new CubeChatInputCommandInteraction(interaction)
		const command = client.commands.get(i.commandName)
		if (command) {
			await runInteraction(i, command.run, command.ephemeral(i))
		} else {
			await i.reply('Oh no! It seems that this command has been removed. Please contact a moderator')
		}
	}

	else if (interaction.isButton()) {
		const i = new CubeButtonInteraction(interaction)
		const button = buttons.get(interaction.customId)
		if (button) {
			await runInteraction(i, button.run, button.ephemeral)
		}
	}

	else if (interaction.isModalSubmit()) {
		const i = new CubeModalSubmitInteraction(interaction)
		const modal = modals.get(i.customId)
		if (modal) {
			await runInteraction(i, modal.run, modal.ephemeral, 'Submitted')
		}
	}

})