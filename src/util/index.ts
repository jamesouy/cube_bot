import { readFile, writeFile, readdir } from 'fs/promises'
import { request } from 'https'
import { join } from 'path'

/** 
 * These errors are caused by user input and not by bugs in the program
 * When such an error happens, the bot will send the error message to the user
 * and not log the error to prevent flooding the log.
 * Set ephemeral to override the command's ephemeral setting
 */
export class UserError extends Error {
	constructor(message?: string, readonly ephemeral?: boolean) {
		super(message)
		this.name = 'CubeUserInputError'
	}
}

// 
/**
 * Reads in an object from a JSON file in the config directory
 * @param file The file to read from (in the config directory)
 */
export function loadConfig(file: string): Promise<any> {
	return readFile(`./config/${file}`)
		.then(content => JSON.parse(content.toString()))
		.catch(err => console.error(`Error while reading file: ${file}`, err))
}

/**
 * Writes an object to a JSON file in the config directory
 * @param object The object to write
 * @param file The file to write to (in the config directory)
 */
export function saveConfig(object: object, file: string): Promise<void> {
	return writeFile(`./config/${file}`, JSON.stringify(object, null, 4))
}

export type Constructor<T = {}> = new (...args: any[]) => T

/**
 * Returns all exported variables in a directory (searching recursively) with a type
 * @param type The class to search for
 * @param path The directory path
 */
export async function getAllOfType<T>(type: Constructor<T>, path: string): Promise<T[]> {
	let commands: T[] = []
	for (const item of await readdir(path, { withFileTypes: true })) {
		if (item.isDirectory()) {
			commands.push(...await getAllOfType(type, join(path, item.name)))
		} else if (item.name.endsWith('js') || item.name.endsWith('.ts')) {
			const object = require(join(path, item.name))
			for (const property in object)
				if (object[property] instanceof type)
					commands.push(object[property])
		}
	}
	return commands
}

/**
 * Returns the content of a url as a string
 */
export async function readUrl(url: string) {
	return new Promise<string>((resolve, reject) => {
		const req = request(url, res => {
			let str = ''
			res.on('data', data => str += data)
			res.once('end', () => resolve(str))
		})
		req.on('error', reject)
		req.end()
	})
}

/**
 * Returns the property nested in an object from a path to follow separated by '.'
 */
export function getProp(obj: any, key: string) {
	return getObjProp(obj, key.split('.'))
}
function getObjProp(obj: any, keys: string[]): any {
  if (keys.length == 0) return obj
  if (!obj[keys[0]]) return undefined
  if (keys.length == 1) return obj[keys[0]]
  return getObjProp(obj[keys[0]], keys.slice(1))
}

export function capitalize(str: string) {
	return str.replace(/^\w/, (c) => c.toUpperCase())
}