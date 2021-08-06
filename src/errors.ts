/**
 * Contains custom error classes.
 * @module errors
 */

/**
 * Thrown when attempting to log in while already authenticated.
 */
export class AlreadyAuthenticatedException extends Error {
    constructor() {
        super('Attempt to call `login` when user is already authenticated.')
        this.name = 'AlreadyAuthenticated'
    }
}

/**
 * Thrown when code is not used after 15 minutes, leading to expiration.
 */
export class ExpiredCodeException extends Error {
    constructor() {
        super('Code has expired. Please use `aspkg login` again for a new code.')
        this.name = 'ExpiredCode'
    }
}

/**
 * Thrown only when GitHub has updated their OAuth system.
 */
export class UnsupportedGrantType extends Error {
    constructor() {
        super(`An internal error occurred that shouldn't happen. This library is outdated.`)
        this.name = 'UnsupportedGrantType'
    }
}

/**
 * Let's hope this doesn't happen.
 */
export class IncorrectClientCredentials extends Error {
    constructor() {
        super(`An internal error occurred that shouldn't happen. Please contact the developers of aspkg.`)
        this.name = 'IncorrectClientCredentials'
    }
}

/**
 * Thrown when cancel is selected in the authorize UI prompt.
 */
export class AccessDenied extends Error {
    constructor() {
        super('Log in was unsuccessful.')
        this.name = 'AccessDenied'
    }
}

/**
 * Thrown when attempting to log out while unauthenticated.
 */
export class NotAuthenticatedException extends Error {
    constructor() {
        super('Attempt to call `logout` when user is unauthenticated.')
        this.name = 'NotAuthenticated'
    }
}
