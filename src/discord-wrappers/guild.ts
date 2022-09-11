////////////////////////////////////////////////////////////////////////////
/// guild.ts
/// Wrapper class for the discord.js Guild
/// Includes useful methods to search for channels/members in the guild
///////////////////////////////////////////////////////////////////////////
import { isSnowflake } from '@util'
import {
	Guild,
	GuildBasedChannel,
	FetchedThreads,
	GuildMember,
	GuildChannel,
	PermissionFlagsBits,
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
		filter: (channel: GuildBasedChannel) => boolean = () => true,
		member?: GuildMember | null,
	): Promise<GuildBasedChannel | null> {
		if (!channel) return null

		const _filter = (ch: GuildBasedChannel) => filter(ch) && 
			(member?.permissionsIn(ch).has([PermissionFlagsBits.ViewChannel]) ?? true)

		// don't need to fetch if already resolved
		if (channel instanceof GuildChannel && (channel.isTextBased() || channel.isThread() || channel.isVoiceBased()))
			return _filter(channel) ? channel : null

		// fetch by ID
		if (typeof channel === 'object' || isSnowflake(channel)) {
			const channelId = typeof channel === 'object' ? channel.id : channel
			if (!channelId || !isSnowflake(channelId)) return null
			let ch: GuildBasedChannel | null = await this.base.channels.fetch(channelId)
			if (!ch || !_filter(ch))
				ch = (await this.fetchActiveThreads()).threads.get(channelId) ?? null
			return (ch && _filter(ch)) ? ch : null
		}

		// fetch by name
		const channels = [
			...(await this.base.channels.fetch()).values(), 
			...(await this.fetchActiveThreads()).threads.values()
		].filter(_filter).filter(ch => ch.name.includes(channel))
		if (channels.length == 0) return null
		return channels.reduce((shortest, ch) => 
			(!shortest || ch.name.length < shortest.name.length) ? ch : shortest)
	}

	async findThread(thread?: string | {id?: string} | null, member?: GuildMember | null) {
		const ch = await this.searchChannel(thread, ch => ch.isThread(), member)
		return ch?.isThread() ? new CubeGuildTextChannel(ch) : null
	}

	async findTextChannel(channel?: string | {id?: string} | null, member?: GuildMember | null) {
		const ch = await this.searchChannel(channel, ch => ch.isTextBased(), member)
		return ch?.isTextBased() ? new CubeGuildTextChannel(ch) : null
	}

	async findChannel(channel?: string | {id?: string} | null, member?: GuildMember | null) {
		return createCubeGuildChannel(await this.searchChannel(channel, () => true, member))
	}

  async findMember(member?: string | {user?: {id?: string}} | null): Promise<GuildMember | null> {
		if (!member) return null

		// no need to fetch if member already resolved
		if (member instanceof GuildMember) return member

		// fetch by ID
		if (typeof member === 'object' || isSnowflake(member)) {
			const memberId = typeof member === 'object' ? member?.user?.id : member
			if (!memberId || !isSnowflake(memberId)) return null
			return await this.base.members.fetch(memberId).catch(() => null)
		}

		// fetch by name
		return (await this.base.members.fetch({ query: member })).first() ?? null
  }
}