import bun from "bun";
import {Logger} from "./logger";

const leetMap: Record<string, string[]> = {
    'a': ['a', '4'],
    'b': ['b', '8'],
    'e': ['e', '3'],
    'g': ['g', '9', '6'],
    'i': ['i', '1', 'l'],
    'l': ['l', '1'],
    'o': ['o', '0'],
    's': ['s', '5'],
    't': ['t', '7'],
    'z': ['z', '2'],
};

function normalizeNick(nick: string): string {
    let normalized = nick.toLowerCase();

    normalized = normalized.replace(/(.)\1+/g, '$1');

    let result = '';
    for (const char of normalized) {
        if (/[0-9]/.test(char)) {
            for (const [letter, replacements] of Object.entries(leetMap)) {
                if (replacements.includes(char)) {
                    result += letter;
                    break;
                }
            }
        } else {
            result += char;
        }
    }

    return result;
}


const forbiddenWords = [
    "glued"
];

export function isForbiddenNick(nick: string): boolean {

    const normalized = normalizeNick(nick);

    return forbiddenWords.some(word => {
        if (normalized.includes(word)) return true;

        if (word.length >= 4) {
            for (let i = 0; i < word.length; i++) {
                const variant = word.slice(0, i) + '.' + word.slice(i + 1);
                const regex = new RegExp(variant.replace('.', '.'), 'i');
                if (regex.test(normalized)) return true;
            }
        }
        return false;
    });
}

export async function isPasswordBreached(password : string) : Promise<boolean> {
  try {
      const hasher = new bun.CryptoHasher('sha1');
      hasher.update(password);
      const hash : string = hasher.digest("hex").toUpperCase();

      const prefix : string = hash.substring(0,5);
      const suffix : string = hash.substring(5);

      const response = await fetch('https://api.pwnedpasswords.com/range/' + prefix, {
          method: 'GET',
          headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
          }
      })
      const data : string  = await response.text();
      const hashes = data.split("\n");

      return hashes.some(line => {
          const [hashSuffix] = line.split(":");
          return hashSuffix.trim() === suffix;
      })
  } catch (e) {
      Logger.error(e);
      return false;
  }

}