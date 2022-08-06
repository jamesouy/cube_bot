import { join } from 'path'
import { 
	SlashCommandBuilder, 
	SlashCommandSubcommandsOnlyBuilder, 
	RESTPostAPIApplicationCommandsJSONBody, 
} from 'discord.js'

import { CubeChatInputCommandInteraction } from '../util/discord'
import { Awaitable, getAllOfType } from '../util'


/**
 * A Command holds data relavent to a slash command
 */
export class Command {
	constructor(
		readonly name: string,
		readonly detail: string,
		readonly builder: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder,
		readonly run: (interaction: CubeChatInputCommandInteraction) => Awaitable<any>,
	) {}

	get commandName() {
		return this.builder.name
	}

	getData(): RESTPostAPIApplicationCommandsJSONBody {
		return this.builder.toJSON()
	}
}

interface CreateCommandOptions {
	name?: string // if not set, use capitalized slash command name
	detail?: string
	builder: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder
	run: (interaction: CubeChatInputCommandInteraction) => Awaitable<any>
}

export function createCommand({
	name = '', 
	detail = '', 
	builder, run
}: CreateCommandOptions) {
	if (name === '') name = builder.name.replace(/^\w/, (c) => c.toUpperCase());
	return new Command(name, detail, builder, run)
}


/**
 * Finds all commands in the modules directory
 */
export function getAllCommands() {
	return getAllOfType(Command, join(__dirname, '../modules'))
}