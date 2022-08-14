import {
	Guild,
	GuildBasedChannel,
	FetchedThreads,
	GuildMember,
	GuildChannel,
	BaseChannel,
} from 'discord.js'
import {
  createCubeGuildChannel,
  CubeGuildChannel,
  CubeGuildTextChannel
} from './channels'

export class CubeGuild {
	constructor(readonly base: Guild) {}
	static maybe = (base?: Guild | null) => base ? new CubeGuild(base) : null

	get id() { return this.base.id }
	get name() { return this.base.name }

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
		if (channel instanceof GuildChannel && (channel.isTextBased() || channel.isThread() || channel.isVoiceBased())) return channel
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
		return ch?.isThread() ? new CubeGuildTextChannel(ch) : null
	}

	async findTextChannel(channel?: string | {id?: string} | null): Promise<CubeGuildTextChannel | null> {
		const ch = await this.searchChannel(channel, ch => ch.isTextBased())
		return ch?.isTextBased() ? new CubeGuildTextChannel(ch) : null
	}

	async findChannel(channel?: string | {id?: string} | null): Promise<CubeGuildChannel | null> {
		const ch = await this.searchChannel(channel, ch => ch.isTextBased())
		return createCubeGuildChannel(ch)
	}

  async findMember(member?: string | {user?: {id?: string}} | null): Promise<GuildMember | null> {
		if (member instanceof GuildMember) return member
		const memberId = typeof member === 'object' ? member?.user?.id : member
    if (!memberId) return null

		// fetch by ID
		let m = await this.base.members.fetch(memberId).catch(() => null)

		// fetch by name
		if (!m && typeof member === 'string')
			m = (await this.base.members.fetch({ query: member })).first() ?? null

		return m
  }
}