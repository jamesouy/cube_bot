import { join } from 'path'
import { 
	Awaitable,
	ButtonBuilder,
	ButtonInteraction,
	SlashCommandBuilder, 
	SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js'

import { CubeButtonInteraction, CubeChatInputCommandInteraction, CubeModalBuilder, CubeModalSubmitInteraction } from '../util/discord'
import { getAllOfType } from '../util'


///////////////////////////////////////
/// Command (discord slash commands)
//////////////////
type CommandBuilder = Omit<SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder, 'addSubcommand' | 'addSubcommandGroup'>
interface CommandCreateOptions {
	name?: string // if not set, use capitalized slash command name
	detail?: string
	builder: Omit<SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder, 'addSubcommand' | 'addSubcommandGroup'>,
	ephemeral?: (interaction: CubeChatInputCommandInteraction) => boolean | undefined, // whether to reply ephemerally for error or done messages
	run: (interaction: CubeChatInputCommandInteraction) => Awaitable<any>
}
export class Command {
	readonly name: string
	readonly detail: string
	readonly builder: CommandBuilder
	readonly ephemeral: (interaction: CubeChatInputCommandInteraction) => boolean | undefined
	readonly run: (interaction: CubeChatInputCommandInteraction) => Awaitable<any>
	constructor({ name = '', detail = '', ephemeral = () => undefined, builder, run }: CommandCreateOptions) {
		if (name === '') name = builder.name.replace(/^\w/, (c) => c.toUpperCase());
		this.name = name
		this.detail = detail
		this.ephemeral = ephemeral
		this.builder = builder
		this.run = run
	}
	get commandName() { return this.builder.name }
	getData = () => this.builder.toJSON()
}

export const getAllCommands = () => getAllOfType(Command, join(__dirname, '../modules'))


/////////////
/// Button
//////
interface ButtonCreateOptions {
	builder: ButtonBuilder
	ephemeral?: boolean
	run: (interaction: CubeButtonInteraction) => Awaitable<any>
}
export class Button {
	readonly customId: string
	readonly ephemeral: boolean | undefined
	readonly builder: ButtonBuilder
	readonly run: (interaction: CubeButtonInteraction) => Awaitable<any>
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


interface ModalCreateOptions {
	ephemeral?: boolean,
	builder: CubeModalBuilder
	run: (interaction: CubeModalSubmitInteraction) => Awaitable<any>
}
export class Modal {
	readonly ephemeral: boolean | undefined
	readonly builder: CubeModalBuilder
	readonly run: (interaction: CubeModalSubmitInteraction) => Awaitable<any>
	constructor({ephemeral, builder, run}: ModalCreateOptions) {
		this.ephemeral = ephemeral
		this.builder = builder
		this.run = run
	}
	get customId() { return this.builder.customId }
}
export const getAllModals = () => getAllOfType(Modal, join(__dirname, '../modules'))