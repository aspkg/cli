# aspkg-cli
**The AssemblyScript Packages CLI 📦**

## Installation

**CLI**
```bash
npm install aspkg -g
```

**JS API**
```bash
npm install aspkg
```

## Commands & Programmatic Usage
To list all CLI commands, use `aspkg help`.

### login
Log in through GitHub to the registry
```js
const aspkg = require('aspkg')

aspkg.login((code, url) => {
    console.log(`Verification Link: ${url}`)
    console.log(`Verification Code: ${code}`)
}).then(() => {
    console.log(`Logged in`)
})
```

### logout
Log out of the registry
```js
const aspkg = require('aspkg')

await aspkg.logout()
```

### whoami
Returns the authenticated user's GitHub username
```js
const aspkg = require('aspkg')

const user = await aspkg.whoami()
```

### publish
Publish the package in the current directory
```js
const aspkg = require('aspkg')

await aspkg.publish()
```

## Credits
Initially created by [rom](https://github.com/romdotdog) with oversight from [JairusSW](https://github.com/JairusSW)
