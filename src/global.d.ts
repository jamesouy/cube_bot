import { Collection } from 'discord.js';
import { Command } from 'bot-framework'


declare global {
	color: string = '#4CA8F7'
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

declare module "discord.js" {
	interface Client {
		commands: Collection<string, Command>
	}
}