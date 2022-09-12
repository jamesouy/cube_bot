import { GuildMember, PermissionFlagsBits, Role } from "discord.js";
import { CubeGuildChannel } from "./channels";


// A member in the guild
export class CubeMember {
	constructor(readonly base: GuildMember) {}
	static maybe = (base?: GuildMember | null) => base ? new CubeMember(base) : null

	get id() { return this.base.id }
	get displayName() { return this.base.displayName }
	get username() { return this.base.user.username}
	get tag() { return this.base.user.tag }

	// Check whether the member has all listed permissions
	get permissions() { return this.base.permissions }
	permissionsIn = (channel?: CubeGuildChannel) => 
		channel ? this.base.permissionsIn(channel.base) : this.base.permissions
	
	/**
	 * Check whether the member can mention a role in a channel.
	 * If channel is not provided, check whether the member can mention the role in the server
	 */
	canMention = (role: Role, channel?: CubeGuildChannel) => 
		role.mentionable || this.permissionsIn(channel).has([PermissionFlagsBits.MentionEveryone])
}