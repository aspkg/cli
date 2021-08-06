/* eslint-disable @typescript-eslint/no-empty-function */
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import {
	AlreadyAuthenticatedException,
	NotAuthenticatedException
} from "./errors";
import { login, logout, waitForLocks, whoami, publish } from "./lib";
import chalk from "chalk";
import open from "open";
import readline from "readline";
import path from "path";
import fs from "fs";

const rline = readline.createInterface(process.stdin, process.stdout);

/**
 * The main Command Line Interface.
 * @module cli
 */

yargs(hideBin(process.argv))
	.scriptName("aspkg")
	.usage("Usage: $0 <command> [options]")
	.command(
		"publish",
		"Publish the package",
		() => {},
		async () => {
			try {
				const pkg = JSON.parse(
					fs.readFileSync(path.join(process.cwd(), "/package.json")).toString()
				);
				console.log(`Current version: ${pkg["version"]}`);
				const version = await terminalPrompt(chalk.italic`New version: `);
				const correctVersion =
					(await validateVersion(version)) || version == "";
				if (!correctVersion) {
					console.log(chalk.bold.blueBright`Invalid version.`);
					await gracefulShutdown();
					return;
				}
				if (version !== "") pkg["version"] = version;
				console.log("Uploading...");
				await publish(process.cwd());
				console.log(
					chalk.greenBright`Published`,
					chalk.bold.blueBright`${pkg["name"]}@${pkg["version"]}`
				);
				console.log(
					chalk.italic.gray`https://aspkg.dev/package/${pkg["name"]}`
				);
				await gracefulShutdown();
			} catch (e) {
				console.log(chalk.bold.red(e));
				await gracefulShutdown();
			}
		}
	)
	.command(
		"login",
		"Log in to the registry",
		() => {},
		async () => {
			try {
				await login((code, url) => {
					open(url);

					console.log(
						`Enter the following code in your newly opened browser:\n\n${chalk.bold(
							code
						)}\n`
					);
					console.log(chalk.red.bold`If your browser didn't open: `);
					console.log("Head over to " + chalk.blueBright.bold(url) + "\n");
				});

				console.log(chalk.greenBright`You're now logged in!`);
				await gracefulShutdown(0);
			} catch (e) {
				if (e instanceof AlreadyAuthenticatedException) {
					console.log(chalk.greenBright`You're already authenticated!`);
					console.log(
						"use " +
							chalk.blueBright.bold`aspkg logout` +
							" to log out of your current session."
					);
					await gracefulShutdown(0);
				} else if (e instanceof Error) {
					console.log(chalk.bold.red(e.name + ": ") + e.message);
					await gracefulShutdown(1);
				} else {
					console.log(chalk.bold.red(e));
					await gracefulShutdown(1);
				}
			}
		}
	)
	.command(
		"logout",
		"Log out of the registry",
		() => {},
		async () => {
			try {
				await logout();
				console.log(chalk.greenBright`Successfully logged out.`);
				await gracefulShutdown(0);
			} catch (e) {
				if (e instanceof NotAuthenticatedException) {
					console.log(chalk.greenBright`Already logged out.`);
					console.log(
						"use " +
							chalk.blueBright.bold`aspkg login` +
							" to log in before logging out!"
					);
					await gracefulShutdown(0);
				} else {
					console.log(chalk.bold.red(e));
					await gracefulShutdown(1);
				}
			}
		}
	)
	.command(
		"whoami",
		"Returns the authenticated user's GitHub username",
		() => {},
		async () => {
			try {
				console.log(await whoami());
				await gracefulShutdown(0);
			} catch (e) {
				if (e instanceof NotAuthenticatedException) {
					await unauthenticatedError();
				} else {
					console.log(chalk.bold.red(e));
					await gracefulShutdown(1);
				}
			}
		}
	)
	.help().argv;

async function unauthenticatedError() {
	console.log(chalk.greenBright`Not logged in!`);
	console.log(
		"This command is " +
			chalk.bold`logged-in-only.` +
			" Use " +
			chalk.blueBright.bold`aspkg login` +
			" to log in!"
	);
	await gracefulShutdown(0);
}

async function gracefulShutdown(code?: number) {
	await waitForLocks();
	process.exit(code);
}

async function terminalPrompt(prompt: string): Promise<string> {
	return new Promise<string>(resolve => {
		rline.question(prompt, res => {
			resolve(res);
		});
	});
}

async function validateVersion(version: string): Promise<boolean> {
	return new Promise<boolean>(resolve => {
		let foundDecs = 0;
		let len = version.length;
		while (len--) {
			if (version[len] == ".") foundDecs++;
		}
		if (foundDecs === 2) resolve(true);
		else resolve(false);
	});
}
