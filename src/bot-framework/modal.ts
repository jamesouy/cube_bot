import { join } from 'path'
import { 
	Collection,
	APIEmbed,
} from 'discord.js'

import { CubeModalBuilder, CubeModalSubmitInteraction } from '../util/discord'
import { Awaitable, getAllOfType } from '../util'
import { oneLine } from 'common-tags';


/**
 * Manages displaying multiple discord modals with unique IDs and the ability to pass parameters
 */
export class ModalConstructor<Param> {
	private instances: Collection<string, Param> = new Collection();
	constructor(
		readonly customId: string,
		private builder: (modal: CubeModalBuilder, param: Param) => CubeModalBuilder,
		private submit: (interaction: CubeModalSubmitInteraction, param: Param) => Awaitable<any>,
		private backup?: (interaction: CubeModalSubmitInteraction) => APIEmbed,
	) {}

	private replyError(interaction: CubeModalSubmitInteraction, message: string) {
		if (!this.backup) return interaction.reply(message)
		else return {
			content: `${message} Here is a copy of your response:`,
			embeds: [ this.backup(interaction) ]
		}
	}

	run(interaction: CubeModalSubmitInteraction): Awaitable<any> {
		const i = interaction.customId.lastIndexOf(':')
		if (i == -1) return this.replyError(interaction, 'Invalid modal submission!')
		const id = interaction.customId.substring(i+1)
		const param = this.instances.get(id)
		if (!param) return this.replyError(interaction, 'Modal invalid or timed out!')
		this.instances.delete(id)
		return this.submit(interaction, param)
	}

	construct(param: Param) {
		const id = Date.now().toString(16)+Math.floor(Math.random()*0xFFFF).toString(16)
		const customId = `${this.customId}:${id}`
		const builder = this.builder(new CubeModalBuilder(customId), param)
		if (builder.customId !== customId)
			throw new Error(oneLine`ModalConstructor builder should not set its own customId! 
				Expected ${customId} but got ${builder.customId}`)
		this.instances.set(id, param)
		return builder
	}
}

export function createModalConstructor<Param = {}>({ customId, builder, run }: {
	customId: string,
	builder: (modal: CubeModalBuilder, param: Param) => CubeModalBuilder,
	run: (interaction: CubeModalSubmitInteraction, param: Param) => Awaitable<any>
}) {
	return new ModalConstructor<Param>(customId, builder, run)
}


/**
 * Finds all commands in the modules directory
 */
export function getAllModals() {
	return getAllOfType(ModalConstructor, join(__dirname, '../modules'))
}