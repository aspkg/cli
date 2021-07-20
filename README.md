# Aspkg-CLI
**The AssemblyScript Packages CLI 📦**

## Installation

```bash
npm install aspkg -g
```

## Commands
 - aspkg publish
    Publish the package
 - aspkg login
    Login in to the registry
 - aspkg logout
    Log out of the registry
 - aspkg whoami
    Returns the authenticated user's GitHub username
 - aspkg help
    Displays help

## Programmatic Usage

```bash
npm install aspkg
```

**Login**
```js
const aspkg = require('aspkg')

aspkg.login((code, url) => {
    console.log(`Verification Link: ${url}`)
    console.log(`Verification Code: ${code}`)
}).then(() => {
    console.log(`Logged in`)
})
```

**Logout**
```js
const aspkg = require('aspkg')

await aspkg.logout()
```

**Whoami**
```js
const aspkg = require('aspkg')

const user = await aspkg.whoami()
```