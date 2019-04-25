import * as firebase from 'firebase-admin'
import {
    BalanceTransactionProtocol,
    AccountProtocol,
    Currency,
    TransactionResult,
    BalanceTransactionType,
    PayoutProtocol
} from "./index"
import { Documentable } from '@1amageek/ballcap-admin'

export class BalanceManager
    <
    BalanceTransaction extends BalanceTransactionProtocol,
    Payout extends PayoutProtocol,
    Account extends AccountProtocol<BalanceTransaction, Payout>
    > {

    private _BalanceTransaction: Documentable<BalanceTransaction>
    private _Account: Documentable<Account>

    constructor(
        transaction: Documentable<BalanceTransaction>,
        account: Documentable<Account>
    ) {
        this._BalanceTransaction = transaction
        this._Account = account
    }

    static platform: string = "platform"

    static bankAccount: string = "bank_account"

    /// Purchaser -> Platform
    charge(purchasedBy: string, orderID: string, currency: Currency, amount: number, transactionResult: TransactionResult, transaction: firebase.firestore.Transaction) {

        const purchaser: Account = this._Account.init(purchasedBy)
        const balanceTransaction: BalanceTransaction = this._BalanceTransaction.init()
        balanceTransaction.type = BalanceTransactionType.payment
        balanceTransaction.currency = currency
        balanceTransaction.amount = amount
        balanceTransaction.order = orderID
        balanceTransaction.from = purchasedBy
        balanceTransaction.to = BalanceManager.platform
        balanceTransaction.transactionResults.push(transactionResult)
        transaction.set(balanceTransaction.documentReference, balanceTransaction.data(), { merge: true })
        transaction.set(purchaser.balanceTransactions.collectionReference.doc(balanceTransaction.id), balanceTransaction.data(), { merge: true })
        return balanceTransaction
    }

    /// Platform -> Purchaser
    refund(purchasedBy: string, orderID: string, currency: Currency, amount: number, transactionResult: TransactionResult, transaction: firebase.firestore.Transaction) {

        const purchaser: Account = this._Account.init(purchasedBy)
        const balanceTransaction: BalanceTransaction = this._BalanceTransaction.init()
        balanceTransaction.type = BalanceTransactionType.paymentRefund
        balanceTransaction.currency = currency
        balanceTransaction.amount = amount
        balanceTransaction.order = orderID
        balanceTransaction.from = BalanceManager.platform
        balanceTransaction.to = purchasedBy
        balanceTransaction.transactionResults.push(transactionResult)
        transaction.set(balanceTransaction.documentReference, balanceTransaction.data(), { merge: true })
        transaction.set(purchaser.balanceTransactions.collectionReference.doc(balanceTransaction.id), balanceTransaction.data(), { merge: true })
        return balanceTransaction
    }

    /// User -> User        from: userID, to: userID
    /// Platform -> User    from: "platform", to: userID   
    /// User -> Platform    from: userID, to: "platform"
    async transfer(from: string, to: string, orderID: string, currency: Currency, amount: number, transactionResult: TransactionResult, transaction: firebase.firestore.Transaction) {

        if (from === BalanceManager.platform) {
            const receiver: Account = this._Account.init(to)
            await receiver.fetch(transaction)

            const balanceTransaction: BalanceTransaction = this._BalanceTransaction.init()
            balanceTransaction.type = BalanceTransactionType.transfer
            balanceTransaction.currency = currency
            balanceTransaction.amount = amount
            balanceTransaction.order = orderID
            balanceTransaction.from = from
            balanceTransaction.to = to
            balanceTransaction.transactionResults.push(transactionResult)

            transaction.set(balanceTransaction.documentReference,
                balanceTransaction.data(),
                { merge: true })
            transaction.set(receiver.balanceTransactions.collectionReference.doc(balanceTransaction.id),
                balanceTransaction.data(),
                { merge: true })

            const receiverBalance = (receiver.balance.available[currency] || 0) + amount
            transaction.set(receiver.documentReference, {
                balance: {
                    available: {
                        [currency]: receiverBalance
                    }
                }
            })
            return balanceTransaction
        } else if (to === BalanceManager.platform) {
            const sender: Account = this._Account.init(from)
            await sender.fetch(transaction)

            const balanceTransaction: BalanceTransaction = this._BalanceTransaction.init()
            balanceTransaction.type = BalanceTransactionType.transfer
            balanceTransaction.currency = currency
            balanceTransaction.amount = amount
            balanceTransaction.order = orderID
            balanceTransaction.from = from
            balanceTransaction.to = to
            balanceTransaction.transactionResults.push(transactionResult)

            transaction.set(balanceTransaction.documentReference,
                balanceTransaction.data(),
                { merge: true })
            transaction.set(sender.balanceTransactions.collectionReference.doc(balanceTransaction.id),
                balanceTransaction.data(),
                { merge: true })

            const senderBalance = (sender.balance.available[currency] || 0) - amount
            transaction.set(sender.documentReference, {
                balance: {
                    available: {
                        [currency]: senderBalance
                    }
                }
            })
            return balanceTransaction
        } else {
            const sender: Account = this._Account.init(from)
            const receiver: Account = this._Account.init(to)
            await Promise.all([sender.fetch(transaction), receiver.fetch(transaction)])

            const balanceTransaction: BalanceTransaction = this._BalanceTransaction.init()
            balanceTransaction.type = BalanceTransactionType.transfer
            balanceTransaction.currency = currency
            balanceTransaction.amount = amount
            balanceTransaction.order = orderID
            balanceTransaction.from = from
            balanceTransaction.to = to
            balanceTransaction.transactionResults.push(transactionResult)

            transaction.set(balanceTransaction.documentReference,
                balanceTransaction.data(),
                { merge: true })
            transaction.set(sender.balanceTransactions.collectionReference.doc(balanceTransaction.id),
                balanceTransaction.data(),
                { merge: true })
            transaction.set(receiver.balanceTransactions.collectionReference.doc(balanceTransaction.id),
                balanceTransaction.data(),
                { merge: true })

            const senderBalance = (sender.balance.available[currency] || 0) - amount
            const receiverBalance = (receiver.balance.available[currency] || 0) + amount

            transaction.set(sender.documentReference, {
                balance: {
                    available: {
                        [currency]: senderBalance
                    }
                }
            })
            transaction.set(receiver.documentReference, {
                balance: {
                    available: {
                        [currency]: receiverBalance
                    }
                }
            })
            return balanceTransaction
        }
    }

    /// User -> User        from: userID, to: userID
    /// Platform -> User    from: "platform", to: userID   
    /// User -> Platform    from: userID, to: platform
    async transferRefund(from: string, to: string, orderID: string, currency: Currency, amount: number, transactionResult: TransactionResult, transaction: firebase.firestore.Transaction) {

        if (from === BalanceManager.platform) {
            const receiver: Account = this._Account.init(to)
            await receiver.fetch(transaction)

            const balanceTransaction: BalanceTransaction = this._BalanceTransaction.init()
            balanceTransaction.type = BalanceTransactionType.transferRefund
            balanceTransaction.currency = currency
            balanceTransaction.amount = amount
            balanceTransaction.order = orderID
            balanceTransaction.from = from
            balanceTransaction.to = to
            balanceTransaction.transactionResults.push(transactionResult)

            transaction.set(balanceTransaction.documentReference,
                balanceTransaction.data(),
                { merge: true })
            transaction.set(receiver.balanceTransactions.collectionReference.doc(balanceTransaction.id),
                balanceTransaction.data(),
                { merge: true })

            const receiverBalance = (receiver.balance.available[currency] || 0) + amount
            transaction.set(receiver.documentReference, {
                balance: {
                    available: {
                        [currency]: receiverBalance
                    }
                }
            })
            return balanceTransaction
        } else if (to === BalanceManager.platform) {
            const sender: Account = this._Account.init(from)
            await sender.fetch(transaction)

            const balanceTransaction: BalanceTransaction = this._BalanceTransaction.init()
            balanceTransaction.type = BalanceTransactionType.transferRefund
            balanceTransaction.currency = currency
            balanceTransaction.amount = amount
            balanceTransaction.order = orderID
            balanceTransaction.from = from
            balanceTransaction.to = to
            balanceTransaction.transactionResults.push(transactionResult)

            transaction.set(balanceTransaction.documentReference,
                balanceTransaction.data(),
                { merge: true })
            transaction.set(sender.balanceTransactions.collectionReference.doc(balanceTransaction.id),
                balanceTransaction.data(),
                { merge: true })

            const senderBalance = (sender.balance.available[currency] || 0) - amount
            transaction.set(sender.documentReference, {
                balance: {
                    available: {
                        [currency]: senderBalance
                    }
                }
            })
            return balanceTransaction
        } else {
            const sender: Account = this._Account.init(from)
            const receiver: Account = this._Account.init(to)
            await Promise.all([sender.fetch(transaction), receiver.fetch(transaction)])

            const balanceTransaction: BalanceTransaction = this._BalanceTransaction.init()
            balanceTransaction.type = BalanceTransactionType.transferRefund
            balanceTransaction.currency = currency
            balanceTransaction.amount = amount
            balanceTransaction.order = orderID
            balanceTransaction.from = from
            balanceTransaction.to = to
            balanceTransaction.transactionResults.push(transactionResult)

            transaction.set(balanceTransaction.documentReference,
                balanceTransaction.data(),
                { merge: true })
            transaction.set(sender.balanceTransactions.collectionReference.doc(balanceTransaction.id),
                balanceTransaction.data(),
                { merge: true })
            transaction.set(receiver.balanceTransactions.collectionReference.doc(balanceTransaction.id),
                balanceTransaction.data(),
                { merge: true })

            const senderBalance = (sender.balance.available[currency] || 0) - amount
            const receiverBalance = (receiver.balance.available[currency] || 0) + amount

            transaction.set(sender.documentReference, {
                balance: {
                    available: {
                        [currency]: senderBalance
                    }
                }
            })
            transaction.set(receiver.documentReference, {
                balance: {
                    available: {
                        [currency]: receiverBalance
                    }
                }
            })
            return balanceTransaction
        }
    }

    async payout(accountID: string, currency: Currency, amount: number, transactionResult: TransactionResult, transaction: firebase.firestore.Transaction) {
        const sender: Account = this._Account.init(accountID)
        await sender.fetch(transaction)
        const balanceTransaction: BalanceTransaction = this._BalanceTransaction.init()
        balanceTransaction.type = BalanceTransactionType.payout
        balanceTransaction.currency = currency
        balanceTransaction.amount = amount
        balanceTransaction.from = accountID
        balanceTransaction.to = BalanceManager.bankAccount
        balanceTransaction.transactionResults.push(transactionResult)
        transaction.set(balanceTransaction.documentReference, balanceTransaction.data(), { merge: true })
        transaction.set(sender.balanceTransactions.collectionReference.doc(balanceTransaction.id),
            balanceTransaction.data(),
            { merge: true })
        const senderBalance = (sender.balance.available[currency] || 0) - amount
        transaction.set(sender.documentReference, {
            balance: {
                available: {
                    [currency]: senderBalance
                }
            }
        })
        return balanceTransaction
    }

    async payoutCancel(accountID: string, currency: Currency, amount: number, transactionResult: TransactionResult, transaction: firebase.firestore.Transaction) {
        const receiver: Account = this._Account.init(accountID)
        await receiver.fetch(transaction)
        const balanceTransaction: BalanceTransaction = this._BalanceTransaction.init()
        balanceTransaction.type = BalanceTransactionType.payoutCancel
        balanceTransaction.currency = currency
        balanceTransaction.amount = amount
        balanceTransaction.from = BalanceManager.bankAccount
        balanceTransaction.to = accountID
        balanceTransaction.transactionResults.push(transactionResult)
        transaction.set(balanceTransaction.documentReference, balanceTransaction.data(), { merge: true })
        transaction.set(receiver.balanceTransactions.collectionReference.doc(balanceTransaction.id),
            balanceTransaction.data(),
            { merge: true })
        const receiverBalance = (receiver.balance.available[currency] || 0) + amount
        transaction.set(receiver.documentReference, {
            balance: {
                available: {
                    [currency]: receiverBalance
                }
            }
        })
        return balanceTransaction
    }
}