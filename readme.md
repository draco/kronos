## Commands

1. Setup:
   - Install nodejs defined in `.nvmrc` either on your own or via `nvm` (`nvm install`),
   - Install nodejs packages with `npm install`
1. Use, run `node index.js <command> [...args]`, i.e. `node index.js login Charlie`
1. Test, run `npm test`.

## Example

```
❯ node index.js login Alice
Hello, Alice!
Your balance is 0.

❯ node index.js topup 100
Your balance is 100.

❯ node index.js login Bob
Hello, Bob!
Your balance is 0.

❯ node index.js topup 80
Your balance is 80.

❯ node index.js pay Alice 50
Transferred 50 to Alice.
Your balance is 30.

❯ node index.js pay Alice 100
Transferred 30 to Alice.
Your balance is 0.
Owing 70 to Alice.

❯ node index.js topup 30
Your balance is 0.
Owing 40 to Alice.

❯ node index.js login Alice
Hello, Alice!
Owing 40 from Bob.
Your balance is 210.

❯ node index.js pay Bob 30
Owing 10 from Bob.
Your balance is 210.

❯ node index.js login Bob
Hello, Bob!
Your balance is 0.
Owing 10 to Alice.

❯ node index.js topup 100
Your balance is 90.
```
