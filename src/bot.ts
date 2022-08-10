import { Client, Collection, GatewayIntentBits } from "discord.js"
import * as dotenv from "dotenv"
import { 
	getAllCommands, 
	Button, 
	getAllButtons, 
	Modal, 
	getAllModals, 
	ContextMenu, 
	getAllContextMenus, 
	getAllInitializers, 
	UserError 
} from 'bot-framework'
import { 
	CubeBaseInteraction, 
	CubeButtonInteraction, 
	CubeCommandInteraction, 
	CubeContextMenuInteraction, 
	CubeModalSubmitInteraction,
} from "discord-wrappers"

dotenv.config()

const client = new Client({ intents: [GatewayIntentBits.Guilds]})
let contextMenus: Collection<string, ContextMenu>
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
		contextMenus = new Collection((await getAllContextMenus()).map(contextMenu => [contextMenu.commandName, contextMenu]))
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
		interaction: I, run: (interaction: I) => any, ephemeral?: boolean, doneMessage = 'Done'
	) {
		try {
			await run(interaction)
			if (!interaction.replied) return interaction.reply({ 
				content: doneMessage, 
				ephemeral: ephemeral ?? false
			})
		} catch (err) {
			if (err instanceof UserError)
				return interaction.reply({ 
					content: err.message, 
					ephemeral: err.ephemeral ?? ephemeral ?? false 
				})
			else {
				console.error(`Error on interaction`, err)
				return interaction.reply({ 
					content: 'Oh no! Error encountered :(', 
					ephemeral: ephemeral ?? false
				})
			}
		}
	}

	///////////////////////
	/// Slash Commands
	////////
	if (interaction.isChatInputCommand()) {
		const i = new CubeCommandInteraction(interaction)
		const command = client.commands.get(i.commandName)
		if (command) {
			await runInteraction(i, command.run, command.ephemeral(i))
		} else {
			await i.reply('Oh no! It seems that this command has been removed. Please contact a moderator')
		}
	}

	else if (interaction.isContextMenuCommand()) {
		const i = new CubeContextMenuInteraction(interaction)
		const command = contextMenus.get(i.commandName)
		if (command) {
			await runInteraction(i, command.run, command.ephemeral)
		} else {
			await i.reply('Oh no! It seems that this context menu has been removed. Please contact a moderator')
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