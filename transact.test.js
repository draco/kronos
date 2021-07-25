const {transact, reconcile, topup, create} = require('./transact');

const ALICE = 'Alice';
const BOB = 'Bob';
const CHARLIE = 'Charlie';
const DENNIS = 'Dennis';

describe('topup', () => {
  it('should reject if amount is less than 1', () => {
    expect.hasAssertions();
    expect(() => topup({username: BOB, amount: 0})).toThrow(
      'amount must be 1 or more'
    );
  });

  it('should reject if amount is missing', () => {
    expect.hasAssertions();
    expect(() => topup({username: ALICE})).toThrow('amount must be present');
  });

  it('should reject if username is missing', () => {
    expect.hasAssertions();
    expect(() => topup({amount: 1})).toThrow('username must be present');
  });
});

describe('transact', () => {
  it('should reject same to and from', () => {
    expect.hasAssertions();
    const txn = {
      from: BOB,
      to: BOB,
      amount: 30,
    };
    expect(() => transact(txn)).toThrow('from and to cannot be the same');
  });

  it('should reject if amount is missing', () => {
    expect.hasAssertions();
    const txn = {
      from: BOB,
      to: ALICE,
    };
    expect(() => transact(txn)).toThrow('amount must be present');
  });

  it('should reject if amount is less than 1', () => {
    expect.hasAssertions();
    const txn = {
      from: BOB,
      to: ALICE,
      amount: 0,
    };
    expect(() => transact(txn)).toThrow('amount must be 1 or more');
  });
});

describe('reconcile', () => {
  it('should ignore unknown transaction type', () => {
    expect.hasAssertions();

    const txns = [
      create(ALICE),
      create(BOB),
      {type: 'unknown type', jibberish: true},
      topup({username: ALICE, amount: 100}),
      topup({username: BOB, amount: 80}),
    ];

    const actual = reconcile(txns);
    const expected = {
      [ALICE]: {
        cash: 100,
        debts: [],
        credits: [],
      },
      [BOB]: {
        cash: 80,
        debts: [],
        credits: [],
      },
    };

    expect(actual).toStrictEqual(expected);
  });

  it('should handle topups', () => {
    expect.hasAssertions();

    const txns = [
      create(ALICE),
      create(BOB),
      topup({username: ALICE, amount: 100}),
      topup({username: BOB, amount: 80}),
    ];

    const actual = reconcile(txns);
    const expected = {
      [ALICE]: {
        cash: 100,
        debts: [],
        credits: [],
      },
      [BOB]: {
        cash: 80,
        debts: [],
        credits: [],
      },
    };

    expect(actual).toStrictEqual(expected);
  });

  it('should handle cash transactions', () => {
    expect.hasAssertions();

    const txns = [
      create(ALICE),
      create(BOB),
      topup({username: ALICE, amount: 100}),
      topup({username: BOB, amount: 80}),
      transact({from: BOB, to: ALICE, amount: 50}),
    ];

    const actual = reconcile(txns);
    expect(actual).toStrictEqual({
      [ALICE]: {
        cash: 150,
        debts: [],
        credits: [],
      },
      [BOB]: {
        cash: 30,
        debts: [],
        credits: [],
      },
    });
  });

  it('should handle transactions with debts stored in sequence', () => {
    expect.hasAssertions();

    const txns = [
      create(ALICE),
      create(BOB),
      topup({username: ALICE, amount: 100}),
      topup({username: BOB, amount: 80}),
      transact({from: BOB, to: ALICE, amount: 150}),
      transact({from: BOB, to: ALICE, amount: 20}),
    ];

    const actual = reconcile(txns);
    expect(actual).toStrictEqual({
      [ALICE]: {
        cash: 180,
        debts: [],
        credits: [
          {username: BOB, amount: 70, id: expect.any(String)},
          {username: BOB, amount: 20, id: expect.any(String)},
        ],
      },
      [BOB]: {
        cash: 0,
        debts: [
          {username: ALICE, amount: 70, id: expect.any(String)},
          {username: ALICE, amount: 20, id: expect.any(String)},
        ],
        credits: [],
      },
    });
  });

  it('should handle debts', () => {
    expect.hasAssertions();

    const txns = [
      create(ALICE),
      create(BOB),
      transact({from: BOB, to: ALICE, amount: 20}),
      topup({username: BOB, amount: 10}),
    ];

    const actual = reconcile(txns);
    expect(actual).toStrictEqual({
      [ALICE]: {
        cash: 10,
        debts: [],
        credits: [{username: BOB, amount: 10, id: expect.any(String)}],
      },
      [BOB]: {
        cash: 0,
        debts: [{username: ALICE, amount: 10, id: expect.any(String)}],
        credits: [],
      },
    });
  });

  it('should repay debts in FIFO order', () => {
    expect.hasAssertions();

    const txns = [
      create(ALICE),
      create(BOB),
      topup({username: ALICE, amount: 50}),
      topup({username: BOB, amount: 20}),
      transact({from: BOB, to: ALICE, amount: 50}),
      transact({from: BOB, to: ALICE, amount: 17}),
      transact({from: BOB, to: ALICE, amount: 8}),
      topup({username: BOB, amount: 40}),
    ];

    const actual = reconcile(txns);
    expect(actual).toStrictEqual({
      [ALICE]: {
        cash: 110,
        debts: [],
        credits: [
          {username: BOB, amount: 7, id: expect.any(String)},
          {username: BOB, amount: 8, id: expect.any(String)},
        ],
      },
      [BOB]: {
        cash: 0,
        debts: [
          {username: ALICE, amount: 7, id: expect.any(String)},
          {username: ALICE, amount: 8, id: expect.any(String)},
        ],
        credits: [],
      },
    });
  });

  it('should pass defined acceptance criteria', () => {
    expect.hasAssertions();

    const txns = [
      create(ALICE),
      create(BOB),
      topup({username: ALICE, amount: 100}),
      topup({username: BOB, amount: 80}),
      transact({from: BOB, to: ALICE, amount: 50}),
      transact({from: BOB, to: ALICE, amount: 100}),
      topup({username: BOB, amount: 30}),
      transact({from: ALICE, to: BOB, amount: 30}),
      topup({username: BOB, amount: 100}),
    ];

    const actual = reconcile(txns);
    expect(actual).toStrictEqual({
      [ALICE]: {
        cash: 220,
        debts: [],
        credits: [],
      },
      [BOB]: {
        cash: 90,
        debts: [],
        credits: [],
      },
    });
  });
});
