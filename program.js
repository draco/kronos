const {Command} = require('commander');
const fs = require('fs');
const groupBy = require('lodash.groupby');
const {topup, reconcile, create, transact} = require('./transact');

const program = new Command();

program.version('1.0.0');

const PATH_TO_DATA = __dirname + '/database.json';

const load = function () {
  try {
    return JSON.parse(fs.readFileSync(PATH_TO_DATA));
  } catch (error) {
    return {ledger: []};
  }
};

const save = function (database) {
  fs.writeFileSync(PATH_TO_DATA, JSON.stringify(database, null, 2));
};

const format = function (debtsOrCredits, type) {
  const grouped = groupBy(debtsOrCredits, 'username');
  const sum = Object.entries(grouped).map(([username, items]) => {
    return {
      total: items.reduce((prev, item) => prev + item.amount, 0),
      username,
    };
  });

  const direction = type === 'debt' ? 'to' : 'from';
  return sum.map(
    ({total, username}) => `Owing ${total} ${direction} ${username}.`
  );
};

program
  .command('login <client>')
  .description('Login as `client`. Creates a new client if not yet exists.')
  .action((client) => {
    let database = load();
    let data = reconcile(database.ledger);
    if (!data[client]) {
      database.ledger = [...database.ledger, create(client)];
    }
    database.current = client;
    save(database);
    data = reconcile(database.ledger);
    const user = data[client];
    console.log(`Hello, ${client}!`);
    format(user.credits, 'credit').forEach((msg) => console.log(msg));
    console.log(`Your balance is ${user.cash}.`);
    format(user.debts, 'debt').forEach((msg) => console.log(msg));
  });

program
  .command('topup <amount>')
  .description('Increase logged-in client balance by `amount`')
  .action((amount) => {
    const prevDatabase = load();
    const currentClient = prevDatabase.current;
    if (!currentClient) {
      console.log(`You are not logged in. No transaction has happened.`);
      return;
    }
    const nextDatabase = {
      ...prevDatabase,
      ledger: [
        ...prevDatabase.ledger,
        topup({username: currentClient, amount: parseInt(amount, 10)}),
      ],
    };
    save(nextDatabase);
    const nextState = reconcile(nextDatabase.ledger);

    format(nextState[currentClient].credits, 'credit').forEach((msg) =>
      console.log(msg)
    );
    console.log(`Your balance is ${nextState[currentClient].cash}.`);
    format(nextState[currentClient].debts, 'debt').forEach((msg) =>
      console.log(msg)
    );
  });

program
  .command('pay <another_client> <amount>')
  .description(
    'Pay `amount` from logged-in client to `another_client`, maybe in parts, as soon as possible.'
  )
  .action((anotherClient, amount) => {
    let prevDatabase = load();
    const currentClient = prevDatabase.current;
    if (!currentClient) {
      console.log(`You are not logged in. No transaction has happened.`);
      return;
    }

    let prevState = reconcile(prevDatabase.ledger);
    if (!prevState[anotherClient]) {
      console.log(
        `User ${anotherClient} is not found. No transaction has happened.`
      );
      return;
    }

    const nextDatabase = {
      ...prevDatabase,
      ledger: [
        ...prevDatabase.ledger,
        transact({
          from: currentClient,
          to: anotherClient,
          amount: parseInt(amount, 10),
        }),
      ],
    };

    save(nextDatabase);
    const nextState = reconcile(nextDatabase.ledger);

    const transferred = Math.abs(
      prevState[currentClient].cash - nextState[currentClient].cash
    );

    if (transferred !== 0) {
      console.log(`Transferred ${transferred} to ${anotherClient}.`);
    }
    format(nextState[currentClient].credits, 'credit').forEach((msg) =>
      console.log(msg)
    );
    console.log(`Your balance is ${nextState[currentClient].cash}.`);
    format(nextState[currentClient].debts, 'debt').forEach((msg) =>
      console.log(msg)
    );
  });

module.exports = program;
