import * as tradable from '../src/index'
import { DocumentReference, Transaction, QuerySnapshot } from '@1amageek/ballcap-admin'
import { Item } from './models/item'
import { User } from './models/user'


export class TradeDelegate implements tradable.TradeDelegate {
    
    reserve<OrderItem extends tradable.OrderItemProtocol, Order extends tradable.OrderProtocol<OrderItem>>(order: Order, orderItem: OrderItem, transaction: Transaction): void {
        return 
    }

    createItem<T extends tradable.OrderItemProtocol, U extends tradable.OrderProtocol<T>>(order: U, orderItem: T, stockReference: DocumentReference | undefined, transaction: Transaction): DocumentReference {
        const purchaser: User = new User(order.purchasedBy)
        const item: Item = new Item(purchaser.items.collectionReference.doc())
        item.selledBy = orderItem.selledBy
        item.order = order.id
        item.productReference = orderItem.productReference
        item.skuReference = orderItem.skuReference!
        item.stockReference = stockReference
        transaction.set(purchaser.items.collectionReference.doc(item.id), item.data(), { merge: true })
        return item.documentReference
    }

    cancelItem<T extends tradable.OrderItemProtocol, U extends tradable.OrderProtocol<T>>(order: U, orderItem: T, item: DocumentReference, transaction: Transaction): void {
        transaction.set(item, {
            isCancelled: true
        }, { merge: true })
    }

    async getItems<T extends tradable.OrderItemProtocol, U extends tradable.OrderProtocol<T>>(order: U, orderItem: T, transaction: Transaction): Promise<QuerySnapshot> {
        const purchaser: User = new User(order.purchasedBy)
        const query = purchaser.items.collectionReference.where("order", "==", order.id)
        const items = await transaction.get(query)
        return items
    }
}