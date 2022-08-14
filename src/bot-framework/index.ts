import { join } from 'path'
import * as dotenv from 'dotenv'
import { Client, Collection, GatewayIntentBits, IntentsBitField, REST, Routes } from 'discord.js'
import { CubeBaseInteraction, CubeButtonInteraction, CubeCommandInteraction, CubeContextMenuInteraction, CubeGuild, CubeModalSubmitInteraction } from 'discord-wrappers'
import { getAllOfType } from 'utils'
import { getAllInitializers } from './initializer'
import { BaseCommand, Button, Command, ContextMenu, getAllButtons, getAllCommands, getAllContextMenus, getAllModals, Modal } from './interaction-listeners'
import { stripIndents } from 'common-tags'

export {
	Initializer,
	ConfigInitializer,
	getAllInitializers,
} from './initializer'

export {
	BaseCommand,
	Command,
	ContextMenu,
	Button,
	Modal,
} from './interaction-listeners'


/** 
 * These errors are caused by user input and not by bugs in the program
 * When such an error happens, the bot will send the error message to the user
 * and not log the error to prevent flooding the log.
 * Set ephemeral to override the command's ephemeral setting
 */
 export class UserError extends Error {
	constructor(message?: string, readonly ephemeral?: boolean) {
		super(message)
		this.name = 'CubeUserError'
	}
}

export class CubeBot {
	private constructor(
		readonly client: Client,
		readonly guild: CubeGuild,
		readonly commands: Collection<string, Command>,
		readonly contextMenus: Collection<string, ContextMenu>,
		readonly buttons: Collection<string, Button>,
		readonly modals: Collection<string, Modal>,
	) {
		client.on('interactionCreate', async interaction => {
			if (interaction.isChatInputCommand()) {
				Command.run(commands.get(interaction.commandName), new CubeCommandInteraction(interaction))
			} else if (interaction.isContextMenuCommand()) {
				ContextMenu.run(contextMenus.get(interaction.commandName), new CubeContextMenuInteraction(interaction))
			} else if (interaction.isButton()) {
				Button.run(buttons.get(interaction.customId), new CubeButtonInteraction(interaction))
			} else if (interaction.isModalSubmit()) {
				Modal.run(modals.get(interaction.customId), new CubeModalSubmitInteraction(interaction))
			}
		})
	}

	static async start() {
		if (!bot) throw new Error('Bot already started')
		dotenv.config()
		for (const i of await getAllInitializers()) await i.run()

		const commands = new Collection((await getAllCommands()).map(command => [command.commandName, command]))
		const contextMenus = new Collection((await getAllContextMenus()).map(contextMenu => [contextMenu.commandName, contextMenu]))
		const buttons = new Collection((await getAllButtons()).map(button => [button.customId, button]))
		const modals = new Collection((await getAllModals()).map(modal => [modal.customId, modal]))
		const client = new Client({ intents: [ GatewayIntentBits.Guilds ]})

		client.login(process.env.BOT_TOKEN)
		return new Promise<void>((resolve, reject) => {
			client.once('ready', async () => {
				const guild = CubeGuild.maybe(await client.guilds.fetch(process.env.GUILD_ID))
				if (!guild) return reject(new Error(`Could not find guild with id ${process.env.GUILD_ID}`))
				console.log(`Logged in as @${client.user?.tag} on ${guild.name}!`)
				bot = new CubeBot(client, guild, commands, contextMenus, buttons, modals)
				resolve()
			})
		})
	}

	static async deploy() {
		const commands = await getAllOfType(BaseCommand, join(__dirname, 'modules'))
		const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

		// delete all commands
		// uncomment if removed/renamed some commands, but it isn't updated in the server
		// rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: [] })
		// 	.then(() => console.log('Successfully deleted all guild commands.'))
		// 	.catch(console.error);
		// rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: [] })
		// 	.then(() => console.log('Successfully deleted all guild commands.'))
		// 	.catch(console.error);
	
		/// Register commands
		rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { 
			body: commands.map(command => command.getData())
		}).then(() => {
			const slashCommands = commands.filter(command => command instanceof Command)
			console.log(stripIndents`
				Registered ${slashCommands.length} commands: 
				${slashCommands.map(command => command.name).join(', ')}
			`)
			const contextMenus = commands.filter(command => command instanceof ContextMenu)
			console.log(stripIndents`
				Registered ${contextMenus.length} context menus: 
				${contextMenus.map(command => command.name).join(', ')}
			`)
		}).catch(console.error);
	}
}
