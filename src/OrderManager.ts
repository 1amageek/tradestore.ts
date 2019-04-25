import * as firebase from 'firebase-admin'
import { Documentable } from '@1amageek/ballcap-admin'
import {
    OrderItemProtocol,
    OrderProtocol,
    TradeTransactionProtocol,
    UserProtocol,
    TransactionResult
} from "./index"

export class OrderManager
    <
    Order extends OrderProtocol<OrderItem>,
    OrderItem extends OrderItemProtocol,
    User extends UserProtocol<Order, OrderItem, TradeTransaction>,
    TradeTransaction extends TradeTransactionProtocol
    > {

    _User: Documentable<User>

    constructor(
        userType: Documentable<User>,
    ) {
        this._User = userType
    }

    update(order: Order, updateParams: { [key: string]: any }, transactionResult: TransactionResult, transaction: firebase.firestore.Transaction) {
        const orderData = order.data()
        orderData.updatedAt = firebase.firestore.FieldValue.serverTimestamp()
        if (Object.keys(transactionResult).length > 0) {
            orderData["transactionResults"] = firebase.firestore.FieldValue.arrayUnion(transactionResult)
        }
        for (const key in updateParams) {
            orderData[key] = updateParams[key]
        }
        const orderReference = order.documentReference
        const seller = this._User.init(order.selledBy)
        const purchaser =this._User.init(order.purchasedBy)
        transaction.set(orderReference, orderData, { merge: true })
        transaction.set(seller.receivedOrders.collectionReference.doc(order.id), orderData, { merge: true })
        transaction.set(purchaser.orders.collectionReference.doc(order.id), orderData, { merge: true })
    }
}