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
import { getAllOfType } from '../utils'


type InteractionRunner<T extends CubeBaseInteraction> = (interaction: T) => Awaitable<any>


///////////////////////////////////////
/// Command (discord slash commands)
//////////////////
export abstract class BaseCommand {
	constructor(
		readonly builder: CommandBuilder | ContextMenuCommandBuilder,
		readonly run: InteractionRunner<CubeCommandInteraction> | InteractionRunner<CubeContextMenuInteraction>
	) {}
	get name() { return this.builder.name }
	get commandName() { return this.builder.name }
	getData = () => this.builder.toJSON()
}

type CommandBuilder = Omit<SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder, 'addSubcommand' | 'addSubcommandGroup'>
interface CommandCreateOptions {
	name?: string // if not set, use capitalized slash command name
	detail?: string
	builder: Omit<SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder, 'addSubcommand' | 'addSubcommandGroup'>,
	ephemeral?: (interaction: CubeCommandInteraction) => boolean | undefined, // whether to reply ephemerally for error or done messages
	run: (interaction: CubeCommandInteraction) => Awaitable<any>
}
export class Command extends BaseCommand {
	private _name: string
	readonly detail: string
	readonly builder: CommandBuilder
	readonly ephemeral: (interaction: CubeCommandInteraction) => boolean | undefined
	readonly run: (interaction: CubeCommandInteraction) => Awaitable<any>
	constructor({ name = '', detail = '', ephemeral = () => undefined, builder, run }: CommandCreateOptions) {
		super(builder, run)
		this._name = name || builder.name.replace(/^\w/, (c) => c.toUpperCase());
		this.detail = detail
		this.ephemeral = ephemeral
		this.builder = builder
		this.run = run
	}
	get name() { return this._name }
}
export const getAllCommands = () => getAllOfType(Command, join(__dirname, '../modules'))


//////////////////////
/// Context Menu
////////
interface ContextMenuCreateOptions {
	ephemeral?: boolean
	builder: ContextMenuCommandBuilder,
	run: InteractionRunner<CubeContextMenuInteraction>
}
export class ContextMenu extends BaseCommand {
	readonly ephemeral?: boolean
	readonly builder: ContextMenuCommandBuilder
	readonly run: InteractionRunner<CubeContextMenuInteraction>
	constructor({ephemeral, builder, run}: ContextMenuCreateOptions) {
		super(builder, run)
		this.ephemeral = ephemeral
		this.builder = builder
		this.run = run
	}
}
export const getAllContextMenus = () => getAllOfType(ContextMenu, join(__dirname, '../modules'))

/////////////
/// Button
//////
interface ButtonCreateOptions {
	builder: ButtonBuilder
	ephemeral?: boolean
	run: InteractionRunner<CubeButtonInteraction>
}
export class Button {
	readonly customId: string
	readonly ephemeral: boolean | undefined
	readonly builder: ButtonBuilder
	readonly run: InteractionRunner<CubeButtonInteraction>
	constructor({ephemeral, builder, run}: ButtonCreateOptions) {
		if (!('custom_id' in builder.data)) 
			throw new Error('ButtonBuilder has no customId')
		this.customId = builder.data.custom_id ?? ''
		this.ephemeral = ephemeral
		this.builder = builder
		this.run = run
	}
}
export const getAllButtons = () => getAllOfType(Button, join(__dirname, '../modules'))


////////////////
/// Modal
/////
interface ModalCreateOptions {
	ephemeral?: boolean,
	builder: CubeModalBuilder
	run: InteractionRunner<CubeModalSubmitInteraction>
}
export class Modal {
	readonly ephemeral: boolean | undefined
	readonly builder: CubeModalBuilder
	readonly run: InteractionRunner<CubeModalSubmitInteraction>
	constructor({ephemeral, builder, run}: ModalCreateOptions) {
		if (!builder.customId) throw new Error('Modal customId cannot be empty or undefined')
		this.ephemeral = ephemeral
		this.builder = builder
		this.run = run
	}
	get customId() { return this.builder.customId ?? '' }
}
export const getAllModals = () => getAllOfType(Modal, join(__dirname, '../modules'))