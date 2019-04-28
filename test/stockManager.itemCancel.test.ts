process.env.NODE_ENV = 'test'
import { initialize, firestore } from '@1amageek/ballcap-admin'
import * as admin from 'firebase-admin'
import * as Tradable from '../src/index'
import * as Config from './config'
// tslint:disable-next-line:no-implicit-dependencies
import * as Stripe from 'stripe'

import { User } from './models/user'
import { Product } from './models/product'
import { Stock } from './models/stock'
import { SKU } from './models/sku'
import { Order } from './models/order'
import { OrderItem } from './models/orderItem'
import { Item } from './models/item'
import { TradeTransaction } from './models/tradeTransaction'
import { StockManager } from '../src/StockManager'
import { TradeDelegate } from './tradeDelegate';


export const stripe = new Stripe(Config.STRIPE_API_KEY)
const secret = require("./secret.json")
const app = admin.initializeApp({
    credential: admin.credential.cert(secret)
})
initialize(app.firestore())

describe("StockManager", () => {

    const shop: User = new User()
    const user: User = new User()
    const product: Product = new Product()
    const sku: SKU = new SKU()
    const order: Order = new Order()
    const date: Date = new Date()
    const orderItem: OrderItem = new OrderItem()

    let transactionID: string

    const stockManager: StockManager<Order, OrderItem, User, Stock, SKU, TradeTransaction> = new StockManager(User, Stock, SKU, TradeTransaction)

    beforeAll(async () => {

        product.name = "PRODUCT"
        product.createdBy = shop.id
        product.selledBy = shop.id

        sku.title = "sku"
        sku.selledBy = shop.id
        sku.createdBy = shop.id
        sku.product = product.documentReference
        sku.amount = 100
        sku.currency = Tradable.Currency.JPY
        sku.inventory = {
            type: Tradable.StockType.finite,
            quantity: 2
        }
        for (let i = 0; i < sku.inventory.quantity!; i++) {
            const inventoryStock: Stock = new Stock(`${i}`)
            sku.inventoryStocks.push(inventoryStock)
        }

        orderItem.order = order.id
        orderItem.selledBy = shop.id
        orderItem.purchasedBy = user.id
        orderItem.sku = sku.id
        orderItem.currency = sku.currency
        orderItem.amount = sku.amount
        orderItem.quantity = 1
        orderItem.product = product.documentReference

        order.amount = sku.amount
        order.currency = sku.currency
        order.selledBy = shop.id
        order.purchasedBy = user.id
        order.shippingTo = { address: "address" }
        order.expirationDate = admin.firestore.Timestamp.fromDate(new Date(date.setDate(date.getDate() + 14)))
        order.items.push(orderItem)

        user.orders.push(order)
        await Promise.all([user.save(), sku.save(), product.save(), shop.save()])

        stockManager.delegate = new TradeDelegate()
    })

    describe("OrderItemCancel", async () => {

        let orderResult: TradeTransaction | undefined = undefined

        test("Success", async () => {
            try {
                const result = await Pring.firestore.runTransaction(async (transaction) => {
                    const tradeInformation = {
                        selledBy: shop.id,
                        purchasedBy: user.id,
                        order: order.id,
                        sku: sku.id,
                        product: product.documentReference
                    }
                    const stockTransaction = await stockManager._trade(order, orderItem, transaction)
                    return await stockTransaction.commit()
				}) as TradeTransaction[]
				
				orderResult = result[0]

                transactionID = result[0].id

                const shopTradeTransaction = (await shop.tradeTransactions.query(TradeTransaction).orderBy("createdAt").dataSource().get())[0]
                const userTradeTransaction = (await user.tradeTransactions.query(TradeTransaction).orderBy("createdAt").dataSource().get())[0]
                const _product: Product = new Product(product.id)
                const _sku = new SKU(sku.id)
                const inventoryStocksDataSource = _sku.inventoryStocks.query(Stock).where("order", "==", result[0].order).dataSource()
                const promiseResult = await Promise.all([_sku.fetch(), inventoryStocksDataSource.get(), shopTradeTransaction.fetch(), userTradeTransaction.fetch()])
                const inventoryStocks: Stock[] = promiseResult[1]

                const _item = (await user.items.get(Item))[0]

                // Shop Trade Transaction
                expect(shopTradeTransaction.type).toEqual(Tradable.TradeTransactionType.order)
                expect(shopTradeTransaction.selledBy).toEqual(shop.id)
                expect(shopTradeTransaction.purchasedBy).toEqual(user.id)
                expect(shopTradeTransaction.order).toEqual(order.id)
                expect(shopTradeTransaction.product).toEqual(product.documentReference)
                expect(shopTradeTransaction.sku).toEqual(sku.id)
                expect(shopTradeTransaction.item.id).toEqual(_item.id)


                // User Trade Transaction
                expect(userTradeTransaction.type).toEqual(Tradable.TradeTransactionType.order)
                expect(userTradeTransaction.selledBy).toEqual(shop.id)
                expect(userTradeTransaction.purchasedBy).toEqual(user.id)
                expect(userTradeTransaction.order).toEqual(order.id)
                expect(userTradeTransaction.product).toEqual(product.documentReference)
                expect(userTradeTransaction.sku).toEqual(sku.id)
                expect(userTradeTransaction.item.id).toEqual(_item.id)

                // SKU
                expect(_sku.inventory.type).toEqual(Tradable.StockType.finite)
                expect(inventoryStocks.length).toEqual(1)

                // Item
                expect(_item.order).toEqual(order.id)
                expect(_item.selledBy).toEqual(shop.id)
                expect(_item.product).toEqual(product.documentReference)
                expect(_item.sku).toEqual(sku.id)

            } catch (error) {
                console.log(error)
            }
        }, 15000)

        test("Success", async () => {			
            const item = orderResult!.item
            const result = await Pring.firestore.runTransaction(async (transaction) => {
                const tradeInformation = {
                    selledBy: shop.id,
                    purchasedBy: user.id,
                    order: order.id,
                    sku: sku.id,
                    product: product.documentReference
                }
                const stockTransaction = await stockManager.itemCancel(order, orderItem, item, transaction)
                return await stockTransaction.commit()
			}) as TradeTransaction[]
			
			orderResult = result[0]

            const shopTradeTransaction = (await shop.tradeTransactions.doc(orderResult.id, TradeTransaction).fetch())
            const userTradeTransaction = (await user.tradeTransactions.doc(orderResult.id, TradeTransaction).fetch())

            const _product: Product = new Product(product.id)
            const _sku = new SKU(sku.id)
            const inventoryStocksDataSource = _sku.inventoryStocks.query(Stock).where("isAvailabled", "==", true).dataSource()
            const promiseResult = await Promise.all([_sku.fetch(), inventoryStocksDataSource.get(), shopTradeTransaction.fetch(), userTradeTransaction.fetch()])
            const inventoryStocks: Stock[] = promiseResult[1]
            const _item = await user.items.doc(orderResult!.item.id, Item).fetch()

            // Shop Trade Transaction
            expect(shopTradeTransaction.type).toEqual(Tradable.TradeTransactionType.orderChange)
            expect(shopTradeTransaction.selledBy).toEqual(shop.id)
            expect(shopTradeTransaction.purchasedBy).toEqual(user.id)
            expect(shopTradeTransaction.order).toEqual(order.id)
            expect(shopTradeTransaction.product).toEqual(product.documentReference)
            expect(shopTradeTransaction.sku).toEqual(sku.id)
            expect(shopTradeTransaction.item.id).toEqual(item.id)

            // User Trade Transaction
            expect(userTradeTransaction.type).toEqual(Tradable.TradeTransactionType.orderChange)
            expect(userTradeTransaction.selledBy).toEqual(shop.id)
            expect(userTradeTransaction.purchasedBy).toEqual(user.id)
            expect(userTradeTransaction.order).toEqual(order.id)
            expect(userTradeTransaction.product).toEqual(product.documentReference)
            expect(userTradeTransaction.sku).toEqual(sku.id)
            expect(userTradeTransaction.item.id).toEqual(item.id)

            // SKU
            expect(_sku.inventory.type).toEqual(Tradable.StockType.finite)
            expect(_sku.inventory.quantity).toEqual(2)
            expect(inventoryStocks.length).toEqual(2)

            // Item
            expect(_item.order).toEqual(order.id)
            expect(_item.selledBy).toEqual(shop.id)
            expect(_item.product).toEqual(product.documentReference)
            expect(_item.sku).toEqual(sku.id)
            expect(_item.isCancelled).toEqual(true)

        }, 15000)

        test("Failure", async () => {
            try {
                await Pring.firestore.runTransaction(async (transaction) => {
                    return new Promise(async (resolve, reject) => {
                        try {
                            const tradeInformation = {
                                selledBy: shop.id,
                                purchasedBy: user.id,
                                order: order.id,
                                sku: sku.id,
                                product: product.documentReference
                            }
                            await stockManager.itemCancel(order, orderItem, (new Item()).documentReference, transaction)
                        } catch (error) {
                            reject(error)
                        }
                        resolve(`[Manager] Success order ORDER/${order.id}, USER/${order.selledBy} USER/${order.purchasedBy}`)
                    })
                })
            } catch (error) {
                expect(error).not.toBeUndefined()
                const shopTradeTransaction = (await shop.tradeTransactions.doc(orderResult!.id, TradeTransaction).fetch())
                const userTradeTransaction = (await user.tradeTransactions.doc(orderResult!.id, TradeTransaction).fetch())
                const _product: Product = new Product(product.id)
                const _sku = new SKU(sku.id)
                const inventoryStocksDataSource = _sku.inventoryStocks.query(Stock).where("isAvailabled", "==", true).dataSource()
                const promiseResult = await Promise.all([_sku.fetch(), inventoryStocksDataSource.get(), shopTradeTransaction.fetch(), userTradeTransaction.fetch()])
                const inventoryStocks: Stock[] = promiseResult[1]
                const _item = await user.items.doc(orderResult!.item.id, Item).fetch()

                // Shop Trade Transaction
                expect(shopTradeTransaction.type).toEqual(Tradable.TradeTransactionType.orderChange)
                expect(shopTradeTransaction.selledBy).toEqual(shop.id)
                expect(shopTradeTransaction.purchasedBy).toEqual(user.id)
                expect(shopTradeTransaction.order).toEqual(order.id)
                expect(shopTradeTransaction.product).toEqual(product.documentReference)
                expect(shopTradeTransaction.sku).toEqual(sku.id)
                expect(shopTradeTransaction.item.id).toEqual(_item.id)

                // User Trade Transaction
                expect(userTradeTransaction.type).toEqual(Tradable.TradeTransactionType.orderChange)
                expect(userTradeTransaction.selledBy).toEqual(shop.id)
                expect(userTradeTransaction.purchasedBy).toEqual(user.id)
                expect(userTradeTransaction.order).toEqual(order.id)
                expect(userTradeTransaction.product).toEqual(product.documentReference)
                expect(userTradeTransaction.sku).toEqual(sku.id)
                expect(userTradeTransaction.item.id).toEqual(_item.id)

                // SKU
                expect(_sku.inventory.type).toEqual(Tradable.StockType.finite)
                expect(_sku.inventory.quantity).toEqual(2)
                expect(inventoryStocks.length).toEqual(2)

                // Item
                expect(_item.order).toEqual(order.id)
                expect(_item.selledBy).toEqual(shop.id)
                expect(_item.product).toEqual(product.documentReference)
                expect(_item.sku).toEqual(sku.id)
                expect(_item.isCancelled).toEqual(true)
            }
        }, 15000)
    })

    afterAll(async () => {
        await Promise.all([shop.delete(), user.delete(), product.delete(), sku.delete()])
    })
})
