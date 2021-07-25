const fs = require('fs');
const program = require('./program');
const {create, topup, transact} = require('./transact');

const ALICE = 'Alice';
const BOB = 'Bob';
const CHARLIE = 'Charlie';

describe('new user', () => {
  it('should be given new account when logging in', () => {
    expect.hasAssertions();
    jest
      .spyOn(fs, 'readFileSync')
      .mockReturnValueOnce(JSON.stringify({current: undefined, ledger: []}));

    const writeSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation();
    const logSpy = jest.spyOn(global.console, 'log').mockImplementation();

    program.parse(['node', 'test', 'login', BOB]);

    expect(logSpy).toHaveBeenCalledWith(`Hello, Bob!`);
    expect(logSpy).toHaveBeenCalledWith('Your balance is 0.');
    expect(writeSpy).toHaveBeenCalledWith(
      __dirname + '/database.json',
      expect.jsonMatching({
        ledger: [create(BOB)],
        current: BOB,
      })
    );
  });
});

describe('existing user', () => {
  it('should see credits and debts on login', () => {
    expect.hasAssertions();
    jest.spyOn(fs, 'readFileSync').mockReturnValueOnce(
      JSON.stringify({
        current: undefined,
        ledger: [
          create(BOB),
          create(ALICE),
          create(CHARLIE),
          transact({from: BOB, to: ALICE, amount: 20}),
          transact({from: CHARLIE, to: BOB, amount: 10}),
        ],
      })
    );

    const writeSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation();
    const logSpy = jest.spyOn(global.console, 'log').mockImplementation();

    program.parse(['node', 'test', 'login', BOB]);

    expect(logSpy).toHaveBeenCalledWith(`Hello, Bob!`);
    expect(logSpy).toHaveBeenCalledWith('Owing 10 from Charlie.');
    expect(logSpy).toHaveBeenCalledWith('Your balance is 0.');
    expect(logSpy).toHaveBeenCalledWith('Owing 20 to Alice.');
    expect(writeSpy).toHaveBeenCalledWith(
      __dirname + '/database.json',
      expect.jsonMatching({
        ledger: [
          create(BOB),
          create(ALICE),
          create(CHARLIE),
          transact({from: BOB, to: ALICE, amount: 20}),
          transact({from: CHARLIE, to: BOB, amount: 10}),
        ],
        current: BOB,
      })
    );
  });
});

describe('logged out user', () => {
  it('should not be able to topup fund', () => {
    expect.hasAssertions();
    jest.spyOn(fs, 'readFileSync').mockReturnValueOnce(
      JSON.stringify({
        ledger: [],
      })
    );

    const writeSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation();
    const logSpy = jest.spyOn(global.console, 'log').mockImplementation();

    program.parse(['node', 'test', 'topup', '10']);

    expect(logSpy).toHaveBeenCalledWith(
      'You are not logged in. No transaction has happened.'
    );
    expect(writeSpy).not.toHaveBeenCalledWith();
  });

  it('should not be able to pay', () => {
    expect.hasAssertions();
    jest.spyOn(fs, 'readFileSync').mockReturnValueOnce(
      JSON.stringify({
        ledger: [create(ALICE)],
      })
    );

    const writeSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation();
    const logSpy = jest.spyOn(global.console, 'log').mockImplementation();

    program.parse(['node', 'test', 'pay', 'Alice', '10']);

    expect(logSpy).toHaveBeenCalledWith(
      'You are not logged in. No transaction has happened.'
    );
    expect(writeSpy).not.toHaveBeenCalledWith();
  });
});

describe('logged in user', () => {
  it('should be able to topup fund', () => {
    expect.hasAssertions();
    jest.spyOn(fs, 'readFileSync').mockReturnValueOnce(
      JSON.stringify({
        current: BOB,
        ledger: [create(BOB)],
      })
    );

    const writeSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation();
    const logSpy = jest.spyOn(global.console, 'log').mockImplementation();

    program.parse(['node', 'test', 'topup', '10']);

    expect(logSpy).toHaveBeenCalledWith('Your balance is 10.');
    expect(writeSpy).toHaveBeenCalledWith(
      __dirname + '/database.json',
      expect.jsonMatching({
        ledger: [create(BOB), topup({username: BOB, amount: 10})],
        current: BOB,
      })
    );
  });

  it('should reject payment to non-existing user', () => {
    expect.hasAssertions();
    jest.spyOn(fs, 'readFileSync').mockReturnValueOnce(
      JSON.stringify({
        current: BOB,
        ledger: [create(BOB)],
      })
    );

    const writeSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation();
    const logSpy = jest.spyOn(global.console, 'log').mockImplementation();

    program.parse(['node', 'test', 'pay', ALICE, '5']);

    expect(logSpy).toHaveBeenCalledWith(
      `User Alice is not found. No transaction has happened.`
    );
    expect(writeSpy).not.toHaveBeenCalledWith();
  });

  it('should be able to pay another user with cash', () => {
    expect.hasAssertions();
    jest.spyOn(fs, 'readFileSync').mockReturnValueOnce(
      JSON.stringify({
        current: BOB,
        ledger: [
          create(BOB),
          topup({username: BOB, amount: 10}),
          create(ALICE),
        ],
      })
    );

    const writeSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation();
    const logSpy = jest.spyOn(global.console, 'log').mockImplementation();

    program.parse(['node', 'test', 'pay', ALICE, '5']);

    expect(logSpy).toHaveBeenCalledWith('Transferred 5 to Alice.');
    expect(logSpy).toHaveBeenCalledWith('Your balance is 5.');
    expect(writeSpy).toHaveBeenCalledWith(
      __dirname + '/database.json',
      expect.jsonMatching({
        ledger: [
          create(BOB),
          topup({username: BOB, amount: 10}),
          create(ALICE),
          transact({from: BOB, to: ALICE, amount: 5}),
        ],
        current: BOB,
      })
    );
  });

  it('should be able to pay another user with debt', () => {
    expect.hasAssertions();
    jest.spyOn(fs, 'readFileSync').mockReturnValueOnce(
      JSON.stringify({
        current: BOB,
        ledger: [
          create(BOB),
          topup({username: BOB, amount: 10}),
          create(ALICE),
        ],
      })
    );

    const writeSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation();
    const logSpy = jest.spyOn(global.console, 'log').mockImplementation();

    program.parse(['node', 'test', 'pay', ALICE, '20']);

    expect(logSpy).toHaveBeenCalledWith('Transferred 10 to Alice.');
    expect(logSpy).toHaveBeenCalledWith('Your balance is 0.');
    expect(logSpy).toHaveBeenCalledWith('Owing 10 to Alice.');
    expect(writeSpy).toHaveBeenCalledWith(
      __dirname + '/database.json',
      expect.jsonMatching({
        ledger: [
          create(BOB),
          topup({username: BOB, amount: 10}),
          create(ALICE),
          transact({from: BOB, to: ALICE, amount: 20}),
        ],
        current: BOB,
      })
    );
  });

  it('should pay debt after topping up', () => {
    expect.hasAssertions();
    jest.spyOn(fs, 'readFileSync').mockReturnValueOnce(
      JSON.stringify({
        current: BOB,
        ledger: [
          create(ALICE),
          create(BOB),
          transact({from: BOB, to: ALICE, amount: 20}),
        ],
      })
    );

    const writeSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation();
    const logSpy = jest.spyOn(global.console, 'log').mockImplementation();

    program.parse(['node', 'test', 'topup', '10']);

    expect(logSpy).toHaveBeenCalledWith('Your balance is 0.');
    expect(logSpy).toHaveBeenCalledWith('Owing 10 to Alice.');

    expect(writeSpy).toHaveBeenCalledWith(
      __dirname + '/database.json',
      expect.jsonMatching({
        ledger: [
          create(ALICE),
          create(BOB),
          transact({from: BOB, to: ALICE, amount: 20}),
          topup({username: BOB, amount: 10}),
        ],
        current: BOB,
      })
    );
  });
});
