const invariant = require('invariant');
const {produce} = require('immer');
const {v4: uuid} = require('uuid');

const TYPES = {
  Open: 'open',
  Topup: 'topup',
  Txn: 'txn',
};

const create = (username) => ({type: TYPES.Open, username, amount: 0});

const topup = function (txn) {
  invariant(txn.amount !== undefined, 'amount must be present');
  invariant(txn.amount > 0, 'amount must be 1 or more');
  invariant(txn.username !== undefined, 'username must be present');
  return {...txn, type: TYPES.Topup};
};

const transact = function (txn) {
  invariant(txn.from !== txn.to, `from and to cannot be the same`);
  invariant(txn.amount !== undefined, 'amount must be present');
  invariant(txn.amount > 0, 'amount must be 1 or more');
  return {...txn, type: TYPES.Txn};
};

const moveMoney = function (prevState, txn) {
  const {from, to, amount} = txn;

  const deductedCash = prevState[from].cash - amount;
  const debtsAmount = Math.abs(Math.min(deductedCash, 0));
  const paidInCash = amount - debtsAmount;

  const zero = ({amount}) => amount != 0;

  return produce(prevState, (draft) => {
    const id = uuid();
    draft[from].cash = Math.max(deductedCash, 0);
    draft[from].debts.push({username: to, amount: debtsAmount, id});
    draft[from].debts = draft[from].debts.filter(zero);

    draft[to].cash = draft[to].cash + paidInCash;
    draft[to].credits.push({username: from, amount: debtsAmount, id});
    draft[to].credits = draft[to].credits.filter(zero);
  });
};

const addMoney = function (prevState, txn) {
  const {username, amount} = txn;
  return produce(prevState, (draft) => {
    draft[username].cash = draft[username].cash + amount;
  });
};

const repayMoneyInOrder = function (prevState, recipient) {
  const isRecipientIndebts = prevState[recipient].debts.length > 0;
  if (!isRecipientIndebts) {
    return prevState;
  }

  return Object.entries(prevState).reduce((prev, [username, data]) => {
    if (data.debts.length === 0) {
      return prevState;
    }

    let {debts, cash} = data;
    return debts.reduce((prev, {username: creditor, amount, id: debtId}) => {
      return produce(prev, (draft) => {
        const hasMoneyBeforePaying = cash >= 0;
        cash = cash - amount;
        const hasMoneyAfterPaying = cash >= 0;

        if (hasMoneyBeforePaying && hasMoneyAfterPaying) {
          draft[username].cash = cash;
          const debtIndex = draft[username].debts.findIndex(
            (debt) => debt.id === debtId
          );
          if (debtIndex !== -1) {
            draft[username].debts.splice(debtIndex, 1);
          }

          draft[creditor].cash = draft[creditor].cash + amount;
          const creditIndex = draft[creditor].credits.findIndex(
            (credit) => credit.id === debtId
          );
          if (creditIndex !== -1) {
            draft[creditor].credits.splice(creditIndex, 1);
          }
          return draft;
        }
        if (hasMoneyBeforePaying && !hasMoneyAfterPaying) {
          const debtAmount = Math.abs(cash);
          const paidInCash = Math.max(0, amount - debtAmount);

          draft[username].cash = Math.max(cash, 0);
          const debtIndex = draft[username].debts.findIndex(
            (debt) => debt.id === debtId
          );
          if (debtIndex !== -1) {
            draft[username].debts[debtIndex].amount = debtAmount;
          }

          draft[creditor].cash = draft[creditor].cash + paidInCash;
          const creditIndex = draft[creditor].credits.findIndex(
            (debt) => debt.id === debtId
          );
          if (creditIndex !== -1) {
            draft[creditor].credits[creditIndex].amount = debtAmount;
          }
          return draft;
        }
        return draft;
      });
    }, prevState);
  }, prevState);
};

const reconcile = function (txns) {
  const initialState = {cash: 0, debts: [], credits: []};
  return txns.reduce((prevState, txn) => {
    if (txn.type === TYPES.Open) {
      return {
        ...prevState,
        [txn.username]: initialState,
      };
    }

    if (txn.type === TYPES.Topup) {
      return repayMoneyInOrder(addMoney(prevState, txn), txn.username);
    }

    if (txn.type === TYPES.Txn) {
      return repayMoneyInOrder(moveMoney(prevState, txn), txn.to);
    }

    return prevState;
  }, {});
};

module.exports = {transact, reconcile, topup, create};
