import { Documentable, DocumentReference, Transaction } from '@1amageek/ballcap-admin'
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

    async reserve(order: Order, orderItem: OrderItem, transaction: Transaction) {

        const orderID: string = order.id
        const sku: SKU = await this._SKU.init(orderItem.skuReference).fetch(transaction)

        if (!sku.snapshot) {
            throw new TradableError(TradableErrorCode.invalidArgument, `[StockManager] Invalid order ORDER/${orderID}. invalid SKU: ${orderItem.skuReference!.path}`)
        }
        if (!sku.isAvailabled) {
            throw new TradableError(TradableErrorCode.outOfStock, `[StockManager] Invalid order ORDER/${orderID}. ${orderItem.skuReference!.path} SKU is not availabled`)
        }
        this.delegate.reserve(order, orderItem, transaction)
    }

    async trade(order: Order, transaction: Transaction) {
        const orderItems: OrderItem[] = order.items
        const tasks = []
        for (const orderItem of orderItems) {
            const skuID = orderItem.skuReference
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

    async _trade(order: Order, orderItem: OrderItem, transaction: Transaction) {
        const quantity: number = orderItem.quantity
        const orderID: string = order.id
        const sku: SKU = await this._SKU.init(orderItem.skuReference).fetch(transaction)

        if (!sku.snapshot) {
            throw new TradableError(TradableErrorCode.invalidArgument, `[StockManager] Invalid order ORDER/${orderID}. invalid SKU: ${orderItem.skuReference!.path}`)
        }
        if (!sku.isAvailabled) {
            throw new TradableError(TradableErrorCode.outOfStock, `[StockManager] Invalid order ORDER/${orderID}. ${orderItem.skuReference!.path} SKU is not availabled`)
        }
        const stockValue: StockValue | undefined = sku.inventory.value
        const stockType = sku.inventory.type
        if (!stockType) {
            throw new TradableError(TradableErrorCode.invalidArgument, `[StockManager] ORDER/${orderID}. SKU: ${orderItem.skuReference!.path}. Invalid StockType.`)
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
                throw new TradableError(TradableErrorCode.outOfStock, `[StockManager] Invalid order ORDER/${orderID}. ${orderItem.skuReference!.path} SKU is out of stock. stocks count ${stocks.length}`)
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
                        return await this._Stock.init(sku.stocks.collectionReference.doc(stockID)).fetch(transaction)
                    }
                    tasks.push(task())
                } else {
                    throw new TradableError(TradableErrorCode.outOfStock, `[StockManager] Invalid order ORDER/${orderID}. ${orderItem.skuReference!.path} SKU is out of stock`)
                }
            }
            const result: Stock[] = await Promise.all(tasks)
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
                tradeTransaction.order = order.id
                tradeTransaction.productReference = orderItem.productReference
                tradeTransaction.skuRefernece = sku.documentReference
                switch (stockType) {
                    case StockType.finite: {
                        const stock = stockTransaction.stocks[i]
                        if (stock.isAvailabled) {
                            const item = this.delegate.createItem(order, orderItem, stock.documentReference, transaction)
                            tradeTransaction.itemReference = item
                            tradeTransaction.stockReference = stock.documentReference
                            transaction.set(stock.documentReference, {
                                "isAvailabled": false,
                                "item": item,
                                "order": orderID
                            }, { merge: true })
                        } else {
                            throw new TradableError(TradableErrorCode.invalidShard, `[StockManager] Invalid order ORDER/${orderID}. ${orderItem.skuReference!.path} Stock/${stock.id} Stock is not availabled`)
                        }
                        break
                    }
                    case StockType.infinite: {
                        const item = this.delegate.createItem(order, orderItem, undefined, transaction)
                        tradeTransaction.itemReference = item
                        break
                    }
                    case StockType.bucket: {
                        if (!stockValue) {
                            throw new TradableError(TradableErrorCode.invalidArgument, `[StockManager] ORDER/${orderID}. SKU: ${orderItem.skuReference!.path}. Invalid StockValue.`)
                        }
                        if (stockValue !== StockValue.outOfStock) {
                            const item = this.delegate.createItem(order, orderItem, undefined, transaction)
                            tradeTransaction.itemReference = item
                        } else {
                            throw new TradableError(TradableErrorCode.invalidShard, `[StockManager] Invalid order ORDER/${orderID}. ${orderItem.skuReference!.path} StockValue is out of stock.`)
                        }
                        break
                    }
                }
                transaction.set(seller.tradeTransactions.collectionReference.doc(tradeTransaction.id), tradeTransaction.data(), { merge: true })
                transaction.set(purchaser.tradeTransactions.collectionReference.doc(tradeTransaction.id), tradeTransaction.data(), { merge: true })
                tradeTransactions.push(tradeTransaction)
            }
            return tradeTransactions
        }
        return stockTransaction
    }

    async cancel(order: Order, orderItem: OrderItem, transaction: Transaction) {
        const orderID: string = order.id
        const purchasedBy: string = order.purchasedBy
        const selledBy: string = orderItem.selledBy
        const seller: User = this._User.init(selledBy)
        const purchaser: User = this._User.init(purchasedBy)
        const sku: SKU = this._SKU.init(orderItem.skuReference)
        const result = await Promise.all([sku.fetch(transaction), this.delegate.getItems(order, orderItem, transaction)])
        if (!sku) {
            throw new TradableError(TradableErrorCode.invalidArgument, `[StockManager] Invalid order ORDER/${orderID}. invalid SKU: ${orderItem.skuReference!.path}`)
        }
        const items = result[1].docs
        const stockType = sku.inventory.type
        const stockTransaction: StockTransaction<Stock, TradeTransaction> = new StockTransaction()

        stockTransaction.commitBlock = () => {
            const tradeTransactions: TradeTransaction[] = []
            for (const item of items) {
                const stockReference: DocumentReference = item.data()["stockReference"]
                const tradeTransaction: TradeTransaction = this._TradeTransaction.init()
                tradeTransaction.type = TradeTransactionType.orderCancel
                tradeTransaction.selledBy = selledBy
                tradeTransaction.purchasedBy = purchasedBy
                tradeTransaction.order = order.id
                tradeTransaction.productReference = orderItem.productReference
                tradeTransaction.skuRefernece = sku.documentReference
                tradeTransaction.itemReference = item.ref
                tradeTransaction.stockReference = stockReference
                this.delegate.cancelItem(order, orderItem, item.ref, transaction)
                if (stockType === StockType.finite) {
                    transaction.set(stockReference, {
                        "isAvailabled": true,
                        "item": null,
                        "order": null
                    }, { merge: true })
                }
                transaction.set(seller.tradeTransactions.collectionReference.doc(tradeTransaction.id), tradeTransaction.data(), { merge: true })
                transaction.set(purchaser.tradeTransactions.collectionReference.doc(tradeTransaction.id), tradeTransaction.data(), { merge: true })
                tradeTransactions.push(tradeTransaction)
            }
            return tradeTransactions
        }
        return stockTransaction
    }

    async itemCancel(order: Order, orderItem: OrderItem, itemRef: DocumentReference, transaction: Transaction) {

        const orderID: string = order.id
        const purchasedBy: string = order.purchasedBy
        const selledBy: string = order.selledBy
        const seller: User = this._User.init(selledBy)
        const purchaser: User = this._User.init(purchasedBy)
        const sku: SKU = await this._SKU.init(orderItem.skuReference).fetch(transaction)
        const stockQuery = sku.stocks.collectionReference.where("item", "==", itemRef).limit(1)
        const snapshot = await transaction.get(stockQuery)
        const stocks = snapshot.docs

        if (!sku.snapshot) {
            throw new TradableError(TradableErrorCode.invalidArgument, `[StockManager] Invalid order ORDER/${orderID}. invalid SKU: ${orderItem.skuReference!.path}`)
        }

        const stockType = sku.inventory.type
        const stockTransaction: StockTransaction<Stock, TradeTransaction> = new StockTransaction()

        stockTransaction.commitBlock = () => {
            const tradeTransactions: TradeTransaction[] = []
            const tradeTransaction: TradeTransaction = this._TradeTransaction.init()
            tradeTransaction.type = TradeTransactionType.orderChange
            tradeTransaction.selledBy = selledBy
            tradeTransaction.purchasedBy = purchasedBy
            tradeTransaction.order = order.id
            tradeTransaction.productReference = orderItem.productReference
            tradeTransaction.skuRefernece = sku.documentReference
            tradeTransaction.itemReference = itemRef
            this.delegate.cancelItem(order, orderItem, itemRef, transaction)
            if (stockType === StockType.finite) {
                transaction.set(stocks[0].ref, {
                    "isAvailabled": true,
                    "item": null,
                    "order": null
                }, { merge: true })
            }
            transaction.set(seller.tradeTransactions.collectionReference.doc(tradeTransaction.id), tradeTransaction.data(), { merge: true })
            transaction.set(purchaser.tradeTransactions.collectionReference.doc(tradeTransaction.id), tradeTransaction.data(), { merge: true })
            tradeTransactions.push(tradeTransaction)
            return tradeTransactions
        }
        return stockTransaction
    }
}