import { readdir } from 'fs/promises'
import { request } from 'https'
import { join } from 'path'

export * from '@discord-wrappers'


// export type Constructor<T = {}> = new (...args: any[]) => T
export type Constructor<T = {}> = Function & { prototype: T }

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
	function getObjProp(obj: any, keys: string[]): any {
		if (keys.length == 0) return obj
		if (!obj[keys[0]]) return undefined
		if (keys.length == 1) return obj[keys[0]]
		return getObjProp(obj[keys[0]], keys.slice(1))
	}
	return getObjProp(obj, key.split('.'))
}

export function capitalize(str: string) {
	return str.replace(/^\w/, (c) => c.toUpperCase())
}

export const isSnowflake = (str: string) => /^\d+$/.test(str)