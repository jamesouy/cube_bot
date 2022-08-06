////////////////////////////////////
/// discord.ts
/// Wrapper classes for discord.js
///////////////////////////////////

import { 
	ChatInputCommandInteraction, 
	InteractionReplyOptions, 
	APIEmbed, 
	TextBasedChannel,
	GuildChannel,
	GuildBasedChannel,
	MessageOptions,
	Message,
	MessageEditOptions
} from 'discord.js'

import { Awaitable } from './index'


type RespondOptions = string | (Omit<InteractionReplyOptions, 'embeds'> & { embeds?: APIEmbed[] })
type SendOptions = string | (Omit<MessageOptions, 'embeds'> & { embeds?: APIEmbed[] })
type EditOptions = string | (Omit<MessageEditOptions, 'embeds'> & { embeds?: APIEmbed[] })

// Changes the default color of embeds
function setEmbedColor<T extends RespondOptions | SendOptions | EditOptions>(options: T): T {
	if (typeof options !== 'string' && options.embeds)
		for (const i in options.embeds)
			options.embeds[i].color ??= 0x4CA8F7
	return options
}


// Wrapper class for ChatInputCommandInteraction
export class CubeChatInputCommandInteraction {
	constructor(readonly base: ChatInputCommandInteraction) {}

	get commandName() { return this.base.commandName }
	get options() { return this.base.options }
	get replied() { return this.base.replied }
	get channel() { return this.base.channel ? new CubeTextChannel(this.base.channel) : null }
	get guild() { return this.base.guild }
	get client() { return this.base.client }

	getChannelOption(name: string, required = false): Awaitable<GuildBasedChannel | null> {
		const channel = this.options.getChannel(name, required)
		if (!channel) return null
		if (!(channel instanceof GuildChannel)) return this.guild?.channels.fetch(channel.id) ?? null
		return channel
	}

	// reply only if had not replied yet
	replyFirst(options: RespondOptions) {
		if (!this.replied) return this.reply(options)
	}

	// reply or follow up
	reply(options: RespondOptions) {
		options = setEmbedColor(options)
		if (this.replied) return this.base.followUp(options)
		else return this.base.reply(options)
	}

	replyEphemeral(options: RespondOptions) {
		if (typeof options === 'string') return this.reply({ content: options, ephemeral: true })
		else return this.reply({ ...options, ephemeral: true })
	}
}


export class CubeMessage {
	constructor(readonly base: Message) {}

	edit(options: EditOptions) {
		return this.base.edit(setEmbedColor(options))
	}
}


export class CubeTextChannel {
	constructor(readonly base: TextBasedChannel) {}

	send(options: SendOptions) {
		return this.base.send(setEmbedColor(options))
	}
}