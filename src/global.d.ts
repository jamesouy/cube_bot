import { Client, Collection } from 'discord.js';
import { CubeBot } from '@bot-framework'
import { CubeGuild } from '@discord-wrappers';


declare global {
	var color: string = '#4CA8F7'
	var bot: CubeBot
	namespace NodeJS {
		interface ProcessEnv {
			GUILD_ID: string,
			CLIENT_ID: string,
			BOT_TOKEN: string,
		}
	}
	interface ReadonlyArray<T> {
		includes(searchElement: any, fromIndex?: number): searchElement is T;
	}
}
export {}