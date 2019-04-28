import * as firebase from 'firebase-admin'
import { Documentable } from '@1amageek/ballcap-admin'
import {
    UserProtocol,
    SKUProtocol,
    TradeTransactionType,
    TradeTransactionProtocol,
    OrderItemProtocol,
    OrderProtocol,
    TradeDelegate,
    TradableError,
    TradableErrorCode,
    StockProtocol,
    StockType,
    StockValue,
    OrderItemType
} from "./index"


export class StockTransaction
    <
    Stock extends StockProtocol,
    TradeTransaction extends TradeTransactionProtocol
    > {

    public stocks: Stock[] = []

    public commitBlock?: () => TradeTransaction[]

    async commit() {
        if (this.commitBlock) {
            return this.commitBlock()
        }
        return []
    }
}

export class StockManager
    <
    Order extends OrderProtocol<OrderItem>,
    OrderItem extends OrderItemProtocol,
    User extends UserProtocol<Order, OrderItem, TradeTransaction>,
    Stock extends StockProtocol,
    SKU extends SKUProtocol<Stock>,
    TradeTransaction extends TradeTransactionProtocol
    > {

    private _User: Documentable<User>
    private _Stock: Documentable<Stock>
    private _SKU: Documentable<SKU>
    private _TradeTransaction: Documentable<TradeTransaction>

    public delegate!: TradeDelegate

    constructor(
        user: Documentable<User>,
        stock: Documentable<Stock>,
        sku: Documentable<SKU>,
        tradeTransaction: Documentable<TradeTransaction>
    ) {
        this._User = user
        this._Stock = stock
        this._SKU = sku
        this._TradeTransaction = tradeTransaction
    }

    async reserve(order: Order, orderItem: OrderItem, transaction: firebase.firestore.Transaction) {

        const orderID: string = order.id
        const skuID: string | undefined = orderItem.sku
        if (skuID) {
            const sku: SKU = await this._SKU.init(skuID).fetch(transaction)
            if (!sku) {
                throw new TradableError(TradableErrorCode.invalidArgument, `[StockManager] Invalid order ORDER/${orderID}. invalid SKU: ${skuID}`)
            }
            if (!sku.isAvailabled) {
                throw new TradableError(TradableErrorCode.outOfStock, `[StockManager] Invalid order ORDER/${orderID}. SKU/${skuID} SKU is not availabled`)
            }
            this.delegate.reserve(order, orderItem, transaction)
        }
    }

    async trade(order: Order, transaction: firebase.firestore.Transaction) {
        const orderItems: OrderItem[] = order.items
        const tasks = []
        for (const orderItem of orderItems) {
            const skuID = orderItem.sku
            if (orderItem.type === OrderItemType.sku) {
                if (!skuID) {
                    throw new TradableError(TradableErrorCode.invalidArgument, `[StockManager] Invalid order ORDER/${order.id}, This order item is sku required.`)
                }
                const task = this._trade(order, orderItem, transaction)
                tasks.push(task)
            }
        }
        return await Promise.all(tasks)
    }

    async _trade(order: Order, orderItem: OrderItem, transaction: firebase.firestore.Transaction) {
        const quantity: number = orderItem.quantity
        const orderID: string = order.id
        const skuID: string = orderItem.sku!
        const sku: SKU = await this._SKU.init(skuID).fetch(transaction)
        
        if (!sku) {
            throw new TradableError(TradableErrorCode.invalidArgument, `[StockManager] Invalid order ORDER/${orderID}. invalid SKU: ${skuID}`)
        }
        if (!sku.isAvailabled) {
            throw new TradableError(TradableErrorCode.outOfStock, `[StockManager] Invalid order ORDER/${orderID}. SKU/${skuID} SKU is not availabled`)
        }
        const stockValue: StockValue | undefined = sku.inventory.value
        const stockType = sku.inventory.type
        if (!stockType) {
            throw new TradableError(TradableErrorCode.invalidArgument, `[StockManager] ORDER/${orderID}. SKU: ${skuID}. Invalid StockType.`)
        }
        const stockTransaction: StockTransaction<Stock, TradeTransaction> = new StockTransaction()

        if (stockType === StockType.finite) {
            const numberOfShardsLimit: number = sku.numberOfFetch * quantity
            const query = await sku.stocks.collectionReference.where("isAvailabled", "==", true).limit(numberOfShardsLimit).get()
            const stocks = query.docs.map((snapshot) => {
                const stock: Stock = this._Stock.fromSnapshot(snapshot)
                return stock
            })
            if (stocks.length < quantity) {
                throw new TradableError(TradableErrorCode.outOfStock, `[StockManager] Invalid order ORDER/${orderID}. SKU/${skuID} SKU is out of stock. stocks count ${stocks.length}`)
            }
            const tasks = []
            const stockIDs = stocks.map(stock => { return stock.id })
            for (let i = 0; i < quantity; i++) {
                const numberOfShards = stockIDs.length
                if (numberOfShards > 0) {
                    const shardID = Math.floor(Math.random() * numberOfShards)
                    const stockID = stockIDs[shardID]
                    stockIDs.splice(shardID, 1)
                    const task = async () => {
                        return (await sku.stocks.doc(stockID, this._Stock).fetch(transaction)) as Stock
                    }
                    tasks.push(task())
                } else {
                    throw new TradableError(TradableErrorCode.outOfStock, `[StockManager] Invalid order ORDER/${orderID}. SKU/${skuID} SKU is out of stock`)
                }
            }
            const result = await Promise.all(tasks)
            stockTransaction.stocks = result
        }

        const purchasedBy: string = orderItem.purchasedBy
        const selledBy: string | undefined = orderItem.selledBy
        const seller: User = this._User.init(selledBy)
        const purchaser: User = this._User.init(purchasedBy)

        stockTransaction.commitBlock = () => {
            const tradeTransactions = []
            for (let i = 0; i < quantity; i++) {
                const tradeTransaction: TradeTransaction = this._TradeTransaction.init()
                tradeTransaction.type = TradeTransactionType.order
                tradeTransaction.selledBy = selledBy
                tradeTransaction.purchasedBy = purchasedBy
                tradeTransaction.order = orderID
                tradeTransaction.product = orderItem.product
                tradeTransaction.sku = skuID
                switch (stockType) {
                    case StockType.finite: {
                        const stock = stockTransaction.stocks[i]
                        if (stock.isAvailabled) {
                            const item = this.delegate.createItem(order, orderItem, stock.id, transaction)
                            tradeTransaction.item = item
                            tradeTransaction.stock = stock.id
                            transaction.set(stock.documentReference, {
                                "isAvailabled": false,
                                "item": item,
                                "order": orderID
                            }, { merge: true })
                        } else {
                            throw new TradableError(TradableErrorCode.invalidShard, `[StockManager] Invalid order ORDER/${orderID}. SKU/${skuID} Stock/${stock.id} Stock is not availabled`)
                        }
                        break
                    }
                    case StockType.infinite: {
                        const item = this.delegate.createItem(order, orderItem, undefined, transaction)
                        tradeTransaction.item = item
                        break
                    }
                    case StockType.bucket: {
                        if (!stockValue) {
                            throw new TradableError(TradableErrorCode.invalidArgument, `[StockManager] ORDER/${orderID}. SKU: ${skuID}. Invalid StockValue.`)
                        }
                        if (stockValue !== StockValue.outOfStock) {
                            const item = this.delegate.createItem(order, orderItem, undefined, transaction)
                            tradeTransaction.item = item
                        } else {
                            throw new TradableError(TradableErrorCode.invalidShard, `[StockManager] Invalid order ORDER/${orderID}. SKU/${skuID} StockValue is out of stock.`)
                        }
                        break
                    }
                }

                transaction.set(tradeTransaction.documentReference, tradeTransaction.data(), { merge: true })
                transaction.set(seller.tradeTransactions.collectionReference.doc(tradeTransaction.id), tradeTransaction.data(), { merge: true })
                transaction.set(purchaser.tradeTransactions.collectionReference.doc(tradeTransaction.id), tradeTransaction.data(), { merge: true })
                tradeTransactions.push(tradeTransaction)
            }
            return tradeTransactions
        }
        return stockTransaction
    }

    async cancel(order: Order, orderItem: OrderItem, transaction: firebase.firestore.Transaction) {
        const orderID: string = order.id
        const skuID: string = orderItem.sku!
        const purchasedBy: string = order.purchasedBy
        const selledBy: string = orderItem.selledBy
        const seller: User = this._User.init(selledBy)
        const purchaser: User = this._User.init(purchasedBy)
        const sku: SKU = this._SKU.init(skuID)
        const result = await Promise.all([sku.fetch(transaction), this.delegate.getItems(order, orderItem, transaction)])
        if (!sku) {
            throw new TradableError(TradableErrorCode.invalidArgument, `[StockManager] Invalid order ORDER/${orderID}. invalid SKU: ${skuID}`)
        }
        const items = result[1].docs
        const stockType = sku.inventory.type
        const stockTransaction: StockTransaction<Stock, TradeTransaction> = new StockTransaction()

        stockTransaction.commitBlock = () => {
            const tradeTransactions: TradeTransaction[] = []
            for (const item of items) {
                const stockID = item.data()["stock"]
                const tradeTransaction: TradeTransaction = this._TradeTransaction.init()
                tradeTransaction.type = TradeTransactionType.orderCancel
                tradeTransaction.selledBy = selledBy
                tradeTransaction.purchasedBy = purchasedBy
                tradeTransaction.order = orderID
                tradeTransaction.product = orderItem.product
                tradeTransaction.sku = skuID
                tradeTransaction.item = item.ref
                tradeTransaction.stock = stockID
                this.delegate.cancelItem(order, orderItem, item.ref, transaction)
                if (stockType === StockType.finite) {
                    transaction.set(sku.stocks.collectionReference.doc(stockID), {
                        "isAvailabled": true,
                        "item": firebase.firestore.FieldValue.delete(),
                        "order": firebase.firestore.FieldValue.delete()
                    }, { merge: true })
                }
                transaction.set(tradeTransaction.documentReference, tradeTransaction.data(), { merge: true })
                transaction.set(seller.tradeTransactions.collectionReference.doc(tradeTransaction.id), tradeTransaction.data(), { merge: true })
                transaction.set(purchaser.tradeTransactions.collectionReference.doc(tradeTransaction.id), tradeTransaction.data(), { merge: true })
                tradeTransactions.push(tradeTransaction)
            }
            return tradeTransactions
        }
        return stockTransaction
    }

    async itemCancel(order: Order, orderItem: OrderItem, itemRef: firebase.firestore.DocumentReference, transaction: firebase.firestore.Transaction) {

        const orderID: string = order.id
        const skuID: string = orderItem.sku!
        const purchasedBy: string = order.purchasedBy
        const selledBy: string = order.selledBy
        const seller: User = this._User.init(selledBy)
        const purchaser: User = this._User.init(purchasedBy)
        const sku: SKU = await this._SKU.init(skuID)
        const stockQuery = sku.stocks.collectionReference.where("item", "==", itemRef).limit(1)
        const snapshot = await transaction.get(stockQuery)
        const stocks = snapshot.docs

        if (!sku) {
            throw new TradableError(TradableErrorCode.invalidArgument, `[StockManager] Invalid order ORDER/${orderID}. invalid SKU: ${skuID}`)
        }

        const stockType = sku.inventory.type
        const stockTransaction: StockTransaction<Stock, TradeTransaction> = new StockTransaction()

        stockTransaction.commitBlock = () => {
            const tradeTransactions: TradeTransaction[] = []
            const tradeTransaction: TradeTransaction = this._TradeTransaction.init()
            tradeTransaction.type = TradeTransactionType.orderChange
            tradeTransaction.selledBy = selledBy
            tradeTransaction.purchasedBy = purchasedBy
            tradeTransaction.order = orderID
            tradeTransaction.product = orderItem.product
            tradeTransaction.sku = skuID
            tradeTransaction.item = itemRef
            this.delegate.cancelItem(order, orderItem, itemRef, transaction)
            if (stockType === StockType.finite) {
                const stockID = stocks[0].id
                transaction.set(sku.stocks.collectionReference.doc(stockID), {
                    "isAvailabled": true,
                    "item": firebase.firestore.FieldValue.delete(),
                    "order": firebase.firestore.FieldValue.delete()
                }, { merge: true })
            }
            transaction.set(tradeTransaction.documentReference, tradeTransaction.data(), { merge: true })
            transaction.set(seller.tradeTransactions.collectionReference.doc(tradeTransaction.id), tradeTransaction.data(), { merge: true })
            transaction.set(purchaser.tradeTransactions.collectionReference.doc(tradeTransaction.id), tradeTransaction.data(), { merge: true })
            tradeTransactions.push(tradeTransaction)
            return tradeTransactions
        }
        return stockTransaction
    }
}