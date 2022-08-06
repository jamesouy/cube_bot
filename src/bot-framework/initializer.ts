import { Awaitable, Constructor, getAllOfType, loadConfig, saveConfig } from '../util'
import { join } from 'path'


/**
 * Gets all initializers in the modules directory
 */
export function getAllInitializers() {
	return getAllOfType(Initializer, join(__dirname, '../modules'))
}


//////////////////////////////////////////////////////////
/// Initializer
/// Used to perform operations when the bot starts up
////////////////////////
export class Initializer {
	constructor(readonly run: () => Awaitable<any>) {}
}

/**
 * Run a function when the bot starts up.
 * If an error occurs while running the function, the bot startup will be terminated
 * @param run 
 * @returns 
 */
export function createInitializer(run: () => Awaitable<any>) {
	return new Initializer(run)
}



///////////////////////////////////////////////////
/// ConfigInitializer
/// Loads a config file when the bot starts up
///////////////////
const configInitializerKeys = ['run', 'save'] as (keyof ConfigInitializer)[]
class ConfigInitializer extends Initializer {
	readonly save: () => Promise<any>
	constructor(file: string) {
		super(async () => {
			const config = await loadConfig(file)
			for (const key in config) {
				if (key in this) 
					throw new Error(`Cannot use the reserved property ${key} in ${file}`)
				//@ts-ignore
				this[key] = config[key] 
			}
		})
		this.save = () => {
			const obj: any = {}
			for (const key in this)
				if (!(configInitializerKeys as string[]).includes(key))
					obj[key] = this[key]
			return saveConfig(obj, file)
		}
	}
}

/**
 * Creates an object that is set from a config file when the bot starts up
 * @param file The config file to read from
 */
export function createConfigInitializer<T>(file: string): T & ConfigInitializer {
	return new ConfigInitializer(file) as T & ConfigInitializer
}