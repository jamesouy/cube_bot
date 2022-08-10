////////////////////////////////////
/// discord.ts
/// Wrapper classes for discord.js
///////////////////////////////////

import { 
	APIEmbed, 
	TextBasedChannel,
	MessageOptions,
	Message,
	MessageEditOptions,
	Guild,
	GuildChannel,
	GuildTextBasedChannel,
	GuildBasedChannel,
	FetchedThreads,
} from 'discord.js'
import { ReplyOptions } from './interactions'

export {
	CubeBaseInteraction,
	CubeCommandInteraction,
	CubeContextMenuInteraction,
	CubeButtonInteraction,
	CubeModalSubmitInteraction,
	CubeModalBuilder,
} from './interactions'


type SendOptions = string | (Omit<MessageOptions, 'embeds'> & { embeds?: APIEmbed[] })
type EditOptions = string | (Omit<MessageEditOptions, 'embeds'> & { embeds?: APIEmbed[] })

// Changes the default color of embeds
export function setEmbedColor<T extends ReplyOptions | SendOptions | EditOptions>(options: T): T {
	if (typeof options !== 'string' && options.embeds)
		for (const i in options.embeds)
			options.embeds[i].color ??= 0x4CA8F7
	return options
}

export class CubeMessage {
	constructor(readonly base: Message) {}
	get id() { return this.base.id }
	get channel() { return new CubeTextChannel(this.base.channel) }
	edit(options: EditOptions) {
		return this.base.edit(setEmbedColor(options))
	}
}

export class CubeTextChannel {
	constructor(readonly base: TextBasedChannel) {}

	get id() { return this.base.id }

	send(options: SendOptions) {
		return this.base.send(setEmbedColor(options))
	}
}
export class CubeGuildTextChannel extends CubeTextChannel {
	constructor(readonly base: GuildTextBasedChannel) { super(base) }
	get guild() { return this.base.guild }
}
export class CubeGuildChannel {
	constructor(readonly base: GuildBasedChannel) {}
	get guild() { return this.base.guild }
}

export class CubeGuild {
	constructor(readonly base: Guild) {}
	maybe = (base?: Guild) => base ? new CubeGuild(base) : null

	get id() { return this.base.id }

	async fetchActiveThreads(maxRepeats = 5) {
		let threads = await this.base.channels.fetchActiveThreads()
		for (let i = 0; i < maxRepeats && threads.hasMore; i++)
			threads = await this.base.channels.fetchActiveThreads()
		return threads
	}

	private async searchChannel(
		channel?: string | {id?: string} | null, 
		filter: (channel: GuildBasedChannel) => boolean = () => true
	): Promise<GuildBasedChannel | null> {
		const channelId = channel && typeof channel === 'object' ? channel.id : channel
		if (!channelId) return null

		// fetch by ID
		let ch: GuildBasedChannel | null = await this.base.channels.fetch(channelId)
		let threadFetch: FetchedThreads | null = null
		if (!ch || !filter(ch)) {
			threadFetch = await this.fetchActiveThreads()
			ch = threadFetch.threads.get(channelId) ?? null
		}

		// fetch by name
		if (typeof channel === 'string' && (!ch || !filter(ch))) {
			const channels = [
				...(await this.base.channels.fetch()).values(), 
				...(threadFetch ?? await this.fetchActiveThreads()).threads.values()
			].filter(filter)
			ch = channels.find(ch => ch.name === channel) ?? null
			ch ??= channels.filter(ch => ch.name.includes(channel)).reduce((shortest, ch) => 
				(!shortest || ch.name.length < shortest.name.length) ? ch : shortest)
		}
		return (!ch || !filter(ch)) ? null : ch
	}

	async findThread(thread?: string | {id?: string} | null): Promise<CubeGuildTextChannel | null> {
		const ch = await this.searchChannel(thread, ch => ch.isThread())
		return ch && ch.isThread() ? new CubeGuildTextChannel(ch) : null
	}

	async findTextChannel(channel?: string | {id?: string} | null): Promise<CubeGuildTextChannel | null> {
		const ch = await this.searchChannel(channel, ch => ch.isTextBased())
		return ch && ch.isTextBased() ? new CubeGuildTextChannel(ch) : null
	}

	async findChannel(channel?: string | {id?: string} | null): Promise<CubeGuildChannel | null> {
		const ch = await this.searchChannel(channel, ch => ch.isTextBased())
		return ch ? new CubeGuildChannel(ch) : null
	}
}