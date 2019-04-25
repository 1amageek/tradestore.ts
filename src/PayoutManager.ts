import * as firebase from 'firebase-admin'
import {
    BalanceTransactionProtocol,
    TransactionResult,
    PayoutProtocol,
    AccountProtocol
} from "./index"
import { Documentable } from '@1amageek/ballcap-admin';

export class PayoutManager
    <
    BalanceTransaction extends BalanceTransactionProtocol,
    Payout extends PayoutProtocol,
    Account extends AccountProtocol<BalanceTransaction, Payout>
    > {

    private _Payout: Documentable<Payout>
    private _Account: Documentable<Account>

    constructor(
        payout: Documentable<Payout>,
        user: Documentable<Account>
    ) {
        this._Payout = payout
        this._Account = user
    }

    update(payout: Payout, transactionResult: TransactionResult, transaction: firebase.firestore.Transaction) {
        const payoutData = payout.data()
        payoutData.updatedAt = firebase.firestore.FieldValue.serverTimestamp()
        if (Object.keys(transactionResult).length > 0) {
            payoutData["transactionResults"] = firebase.firestore.FieldValue.arrayUnion(transactionResult)
        }
        const payoutReference = this._Payout.init(payout.id).documentReference
        const account = this._Account.init(payout.account)
        transaction.set(payoutReference, payoutData, { merge: true })
        transaction.set(account.payoutRequests.collectionReference.doc(payout.id), payoutData, { merge: true })
    }
}