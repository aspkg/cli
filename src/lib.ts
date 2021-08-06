import { homedir } from "os";
import { join } from "path";
import { readFile, writeFile } from "fs/promises";
import {
	AccessDenied,
	AlreadyAuthenticatedException,
	ExpiredCodeException,
	IncorrectClientCredentials,
	NotAuthenticatedException,
	UnsupportedGrantType
} from "./errors";
import { client_id, scope } from "./config";
import fetch, { Headers } from "undici-fetch";
import path from "path";
import fs from "fs";

/**
 * JS API for the CLI.
 * @module lib
 */

interface Configuration {
	accessToken?: string;
}

const aspkgrcPath = join(homedir(), ".aspkgrc");
const locks: Promise<unknown>[] = [];

let config: Configuration = {};

locks.push(
	readFile(aspkgrcPath, "utf-8")
		.then(r => {
			config = JSON.parse(r);
		})
		.catch(() => writeFile(aspkgrcPath, "{}"))
);

/**
 * Saves the current configuration in the background.
 */
function saveConfig() {
	locks.push(writeFile(aspkgrcPath, JSON.stringify(config)));
}

/**
 * Wait for configuration reads and writes to be completed.
 * @returns {Promise<void>}
 * @async
 */
export async function waitForLocks(): Promise<void> {
	await Promise.all(locks);
}

/**
 * Check whether the current user is authenticated.
 * @async
 * @returns {Promise<boolean>} a Promise that represents whether or not the current user is authenticated.
 */
export async function authenticated(): Promise<boolean> {
	await waitForLocks();
	return !!config.accessToken;
}

/**
 * Publishes a package.
 * @async
 * @returns {Promise<void>} a Promise that resolves when publish is successful.
 * @throws {@link AlreadyAuthenticatedException}
 * @throws {@link ExpiredCodeException}
 * @throws {@link AccessDenied}
 */
export async function publish(): Promise<void> {
	const isAuthenticated = await authenticated();
	const { accessToken } = config;

	if (!isAuthenticated || accessToken === undefined) {
		throw new NotAuthenticatedException();
	}

	const pkg = JSON.parse(
		fs.readFileSync(path.join(process.cwd(), "/package.json")).toString()
	);

	const headers = new Headers();
	headers.set("content-type", "application/json;charset=utf-8");
	headers.set("user-agent", "aspkg-cli");
	headers.set("authorization", accessToken);

	return fetch("http://localhost:3000/api-publish", {
		method: "POST",
		headers: headers,
		body: JSON.stringify(pkg)
	}).then(
		res =>
			new Promise((resolve, reject) => {
				if (res.status === 200) return resolve();
				return reject(`Could not publish package.\nStatus code ${res.status}`);
			})
	);
}

/**
 * Prompts the user to log in.
 * @async
 * @returns {Promise<void>} a Promise that rejects when authorization was unsuccessful.
 * @throws {@link AlreadyAuthenticatedException}
 * @throws {@link ExpiredCodeException}
 * @throws {@link AccessDenied}
 */
export async function login(
	codeCallback: (code: string, url: string) => void
): Promise<void> {
	const isAuthenticated = await authenticated();
	if (isAuthenticated) {
		throw new AlreadyAuthenticatedException();
	}

	const headers = new Headers();
	headers.set("content-type", "application/json;charset=utf-8");
	headers.set("accept", "application/vnd.github.v3+json");

	const codePayload: {
		client_id: string;
		scope?: string;
	} = { client_id };

	if (scope) codePayload.scope = scope;

	const codes: {
		device_code: string;
		user_code: string;
		verification_uri: string;
		expires_in: number;
		interval: number;
	} = await fetch("https://github.com/login/device/code", {
		method: "POST",
		body: JSON.stringify(codePayload),
		headers
	}).then(r => r.json());

	codeCallback(codes.user_code, codes.verification_uri);

	let interval = codes.interval * 1000;
	const pollPayload = {
		method: "POST",
		body: JSON.stringify({
			client_id,
			device_code: codes.device_code,

			// https://docs.github.com/en/developers/apps/building-oauth-apps/authorizing-oauth-apps#input-parameters-1
			grant_type: "urn:ietf:params:oauth:grant-type:device_code"
		}),
		headers
	};

	interface PollError {
		error: string;
	}

	interface PollSuccess {
		access_token: string;
		token_type: string;
		scope: string;
	}

	return await new Promise((resolve, reject) =>
		setTimeout(async function recurse() {
			const pollResponse: PollError | PollSuccess = await fetch(
				"https://github.com/login/oauth/access_token",
				pollPayload
			).then(r => r.json());

			if ("error" in pollResponse) {
				switch (pollResponse.error) {
					case "slow_down":
						interval += 5000;
						break;
					case "expired_token":
						return reject(new ExpiredCodeException());
					case "unsupported_grant_type":
						return reject(new UnsupportedGrantType());
					case "incorrect_client_credentials":
						return reject(new IncorrectClientCredentials());
					case "access_denied":
						return reject(new AccessDenied());
				}

				setTimeout(recurse, interval);
			} else {
				config.accessToken = pollResponse.access_token;
				saveConfig();
				resolve();
			}
		}, interval)
	);
}

/**
 * Logs the current user out of the registry.
 * @remarks This function does not await {@link waitForLocks}
 * @throws {@link NotAuthenticatedException}
 * @async
 */
export async function logout(): Promise<void> {
	const isAuthenticated = await authenticated();
	if (!isAuthenticated) {
		throw new NotAuthenticatedException();
	}

	delete config.accessToken;
	saveConfig();
}

/**
 * @returns {Promise<string>} GitHub username.
 * @throws {@link NotAuthenticatedException}
 * @async
 */
export async function whoami(): Promise<string> {
	const isAuthenticated = await authenticated();
	if (!isAuthenticated) {
		throw new NotAuthenticatedException();
	}

	const headers = new Headers();
	headers.set("authorization", "token " + config.accessToken);
	headers.set("accept", "application/vnd.github.v3+json");
	headers.set("user-agent", "aspkg-cli"); // required!

	// https://docs.github.com/en/rest/reference/users#get-the-authenticated-user
	const info: {
		login: string;
	} = await fetch("https://api.github.com/user", { headers }).then(r =>
		r.json()
	);

	return info.login;
}
