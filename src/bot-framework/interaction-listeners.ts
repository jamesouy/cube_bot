import { join } from 'path'
import { 
	Awaitable,
	ButtonBuilder,
	ButtonInteraction,
	ContextMenuCommandBuilder,
	ContextMenuCommandInteraction,
	SlashCommandBuilder, 
	SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js'

import { 
	CubeBaseInteraction, 
	CubeButtonInteraction, 
	CubeCommandInteraction, 
	CubeContextMenuInteraction, 
	CubeModalBuilder, 
	CubeModalSubmitInteraction 
} from 'discord-wrappers'
import { getAllOfType } from 'utils'
import { UserError } from '.'


type InteractionRunner<T extends CubeBaseInteraction> = (interaction: T) => Awaitable<any>

async function runInteraction<I extends CubeBaseInteraction>(
	interaction: I, run: InteractionRunner<I>, ephemeral?: boolean, doneMessage = 'Done'
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

export abstract class BaseCommand {
	constructor(
		readonly builder: CommandBuilder | ContextMenuCommandBuilder,
		readonly run: InteractionRunner<CubeCommandInteraction> | InteractionRunner<CubeContextMenuInteraction>
	) {}
	get name() { return this.builder.name }
	get commandName() { return this.builder.name }
	getData = () => this.builder.toJSON()
}


///////////////////////////////////////
/// Command (discord slash commands)
//////////////////
type CommandBuilder = Omit<SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder, 'addSubcommand' | 'addSubcommandGroup'>
export class Command extends BaseCommand {
	private _name: string
	readonly detail: string
	readonly builder: CommandBuilder
	readonly ephemeral: (interaction: CubeCommandInteraction) => boolean | undefined
	readonly run: InteractionRunner<CubeCommandInteraction>
	constructor({ name = '', detail = '', ephemeral = () => undefined, builder, run }: {
		name?: string // if not set, use capitalized slash command name
		detail?: string
		builder: CommandBuilder
		ephemeral?: (interaction: CubeCommandInteraction) => boolean | undefined, // whether to reply ephemerally for error or done messages
		run: InteractionRunner<CubeCommandInteraction>
	}) {
		super(builder, run)
		this._name = name || builder.name.replace(/^\w/, (c) => c.toUpperCase());
		this.detail = detail
		this.ephemeral = ephemeral
		this.builder = builder
		this.run = run
	}
	get name() { return this._name }

	static run(command: Command | undefined, interaction: CubeCommandInteraction) {
		if (command) {
			return runInteraction(interaction, command.run, command.ephemeral(interaction))
		} else {
			return interaction.reply('Oh no! It seems that this command has been removed. Please contact a moderator')
		}
	}
}
export const getAllCommands = () => getAllOfType(Command, join(__dirname, '../modules'))


//////////////////////
/// Context Menu
////////
export class ContextMenu extends BaseCommand {
	readonly ephemeral?: boolean
	readonly builder: ContextMenuCommandBuilder
	readonly run: InteractionRunner<CubeContextMenuInteraction>
	constructor({ephemeral, builder, run}: {
		ephemeral?: boolean
		builder: ContextMenuCommandBuilder,
		run: InteractionRunner<CubeContextMenuInteraction>
	}) {
		super(builder, run)
		this.ephemeral = ephemeral
		this.builder = builder
		this.run = run
	}

	static run(contextMenu: ContextMenu | undefined, interaction: CubeContextMenuInteraction) {
		if (contextMenu) {
			return runInteraction(interaction, contextMenu.run, contextMenu.ephemeral)
		} else {
			return interaction.reply('Oh no! It seems that this context menu has been removed. Please contact a moderator')
		}
	}
}
export const getAllContextMenus = () => getAllOfType(ContextMenu, join(__dirname, '../modules'))

/////////////
/// Button
//////
export class Button {
	readonly customId: string
	readonly ephemeral: boolean | undefined
	readonly builder: ButtonBuilder
	readonly run: InteractionRunner<CubeButtonInteraction>
	constructor({ephemeral, builder, run}: {
		builder: ButtonBuilder
		ephemeral?: boolean
		run: InteractionRunner<CubeButtonInteraction>
	}) {
		if (!('custom_id' in builder.data)) 
			throw new Error('ButtonBuilder has no customId')
		this.customId = builder.data.custom_id ?? ''
		this.ephemeral = ephemeral
		this.builder = builder
		this.run = run
	}

	static run(button: Button | undefined, interaction: CubeButtonInteraction) {
		if (button) {
			return runInteraction(interaction, button.run, button.ephemeral)
		} else {
			return interaction.reply('Oh no! It seems that this button handler has been removed. Please contact a moderator')
		}
	}
}
export const getAllButtons = () => getAllOfType(Button, join(__dirname, '../modules'))


////////////////
/// Modal
/////
export class Modal {
	readonly ephemeral: boolean | undefined
	readonly builder: CubeModalBuilder
	readonly run: InteractionRunner<CubeModalSubmitInteraction>
	constructor({ephemeral, builder, run}: {
		ephemeral?: boolean,
		builder: CubeModalBuilder
		run: InteractionRunner<CubeModalSubmitInteraction>
	}) {
		if (!builder.customId) throw new Error('Modal customId cannot be empty or undefined')
		this.ephemeral = ephemeral
		this.builder = builder
		this.run = run
	}
	get customId() { return this.builder.customId ?? '' }

	static run(modal: Modal | undefined, interaction: CubeModalSubmitInteraction) {
		if (modal) {
			return runInteraction(interaction, modal.run, modal.ephemeral)
		} else {
			return interaction.reply('Oh no! It seems that this modal handler has been removed. Please contact a moderator')
		}
	}
}
export const getAllModals = () => getAllOfType(Modal, join(__dirname, '../modules'))