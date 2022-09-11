////////////////////////////////////
/// discord-wrappers
/// Wrapper classes for discord.js
///////////////////////////////////
import { APIEmbed, Client, Collection, GatewayIntentBits, Message, MessageEditOptions } from 'discord.js'
import { ReplyOptions } from './interactions'
import { SendOptions, createCubeTextChannel } from './channels'
import { Command } from '@bot-framework'

export { CubeGuild } from './guild'
export {
	CubeTextChannel,
	CubeGuildChannel,
	CubeGuildTextChannel,
} from './channels'
export {
	CubeBaseInteraction,
	CubeCommandInteraction,
	CubeContextMenuInteraction,
	CubeButtonInteraction,
	CubeModalSubmitInteraction,
	CubeModalBuilder,
} from './interactions'


type EditOptions = string | (Omit<MessageEditOptions, 'embeds'> & { embeds?: APIEmbed[] })

// Changes the default color of embeds
export function setEmbedColor<T extends ReplyOptions | SendOptions | EditOptions>(options: T): T {
	if (typeof options !== 'string' && options.embeds)
		for (const i in options.embeds)
			options.embeds[i].color ??= 0x4CA8F7
	return options
}

export class CubeClient extends Client {
	readonly commands: Collection<string, Command>
	constructor({intents, commands}: {
		intents: GatewayIntentBits[],
		commands: Collection<string, Command>,
	}) {
		super({intents})
		this.commands = commands
	}
}

export class CubeMessage {
	constructor(readonly base: Message) {}
	get id() { return this.base.id }
	get channel() { return createCubeTextChannel(this.base.channel) }
	edit(options: EditOptions) {
		return this.base.edit(setEmbedColor(options))
	}
}

