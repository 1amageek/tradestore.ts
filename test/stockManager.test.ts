process.env.NODE_ENV = 'test'
import { initialize, firestore, Batch } from '@1amageek/ballcap-admin'
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
    const sku: SKU = new SKU(product.SKUs.collectionReference.doc())
    const order: Order = new Order()
    const date: Date = new Date()
    const orderItem: OrderItem = new OrderItem()

    const stockManager: StockManager<Order, OrderItem, User, Stock, SKU, TradeTransaction> = new StockManager(User.self(), Stock.self(), SKU.self(), TradeTransaction.self())

    beforeAll(async () => {
        product.name = "PRODUCT"
        product.createdBy = shop.id
        product.selledBy = shop.id

        sku.title = "sku"
        sku.selledBy = shop.id
        sku.createdBy = shop.id
        sku.productReference = product.documentReference
        sku.amount = 100
        sku.currency = Tradable.Currency.JPY
        sku.inventory = {
            type: Tradable.StockType.finite,
            quantity: 5
        }
        for (let i = 0; i < sku.inventory.quantity!; i++) {
            const inventoryStock: Stock = new Stock(`${i}`)
            sku.stocks.push(inventoryStock)
        }

        orderItem.selledBy = shop.id
        orderItem.purchasedBy = user.id
        orderItem.skuReference = sku.documentReference
        orderItem.currency = sku.currency
        orderItem.amount = sku.amount
        orderItem.quantity = 1
        orderItem.productReference = product.documentReference

        order.amount = sku.amount
        order.currency = sku.currency
        order.selledBy = shop.id
        order.purchasedBy = user.id
        order.shippingTo = { address: "address" }
        order.expirationDate = admin.firestore.Timestamp.fromDate(new Date(date.setDate(date.getDate() + 14)))
        order.items.push(orderItem)
        user.orders.push(order)

        const batch: Batch = new Batch()
        batch.save(user)
        batch.save(sku)
        batch.save(product)
        batch.save(shop)
        batch.save(sku.stocks, sku.stocks.collectionReference)
        batch.save(user.orders, user.orders.collectionReference)
        await batch.commit()

        stockManager.delegate = new TradeDelegate()
    })

    describe("Order", () => {

        let orderResult: TradeTransaction | undefined = undefined

        test("Success", async () => {
            try {
                const result = await firestore.runTransaction(async (transaction) => {
                    const stockTransaction = await stockManager._trade(order, orderItem, transaction)
                    return await stockTransaction.commit()
                }) as TradeTransaction[]
                orderResult = result[0]

                const shopTradeTransaction: TradeTransaction = (await shop.tradeTransactions.collectionReference.where("orderReference", "==", order.documentReference).get()).docs.map(value => TradeTransaction.fromSnapshot(value) as TradeTransaction)[0]
                const userTradeTransaction: TradeTransaction = (await user.tradeTransactions.collectionReference.where("orderReference", "==", order.documentReference).get()).docs.map(value => TradeTransaction.fromSnapshot(value) as TradeTransaction)[0]
                
                const _sku = new SKU(sku.documentReference)
                const stocksDataSource = _sku.stocks.collectionReference.where("orderReference", "==", orderResult.orderReference)
                const promiseResult = await Promise.all([_sku.fetch(), stocksDataSource.get()])
                const stocks: Stock[] = promiseResult[1].docs.map(value => Stock.fromSnapshot(value))

                const _item = (await user.items.collectionReference.get()).docs.map(value => Item.fromSnapshot(value) as Item)[0]

                // Shop Trade Transaction
                expect(shopTradeTransaction.type).toEqual(Tradable.TradeTransactionType.order)
                expect(shopTradeTransaction.selledBy).toEqual(shop.id)
                expect(shopTradeTransaction.purchasedBy).toEqual(user.id)
                expect(shopTradeTransaction.orderReference).toEqual(order.documentReference)
                expect(shopTradeTransaction.productReference!.path).toEqual(product.documentReference.path)
                expect(shopTradeTransaction.skuRefernece.path).toEqual(sku.documentReference.path)
                expect(shopTradeTransaction.itemReference.path).toEqual(_item.documentReference.path)

                // User Trade Transaction
                expect(userTradeTransaction.type).toEqual(Tradable.TradeTransactionType.order)
                expect(userTradeTransaction.selledBy).toEqual(shop.id)
                expect(userTradeTransaction.purchasedBy).toEqual(user.id)
                expect(userTradeTransaction.orderReference).toEqual(order.documentReference)
                expect(userTradeTransaction.productReference!.path).toEqual(product.documentReference.path)
                expect(userTradeTransaction.skuRefernece.path).toEqual(sku.documentReference.path)
                expect(userTradeTransaction.itemReference.path).toEqual(_item.documentReference.path)

                // SKU
                expect(_sku.inventory.type).toEqual(Tradable.StockType.finite)
                expect(stocks.length).toEqual(1)

                // Item
                expect(_item.orderReference.path).toEqual(order.documentReference.path)
                expect(_item.selledBy).toEqual(shop.id)
                expect(_item.productReference!.path).toEqual(product.documentReference.path)
                expect(_item.skuReference.path).toEqual(sku.documentReference.path)

            } catch (error) {
                console.log("******", error)
                expect(error).toBeNull()
                console.log(error)
            }
        }, 15000)

        test("Failure", async () => {
            try {
                await firestore.runTransaction(async (transaction) => {
                    return new Promise(async (resolve, reject) => {
                        try {
                            const stockTransaction = await stockManager._trade(order, orderItem, transaction)
                            const result = await stockTransaction.commit()
                            resolve(result)
                        } catch (error) {
                            reject(error)
                        }
                        resolve(`[Manager] Success order ORDER/${order.id}, USER/${order.selledBy} USER/${order.purchasedBy}`)
                    })
                })
            } catch (error) {
                expect(error).not.toBeUndefined()

                const shopTradeTransaction: TradeTransaction = (await shop.tradeTransactions.collectionReference.where("orderReference", "==", order.documentReference).get()).docs.map(value => TradeTransaction.fromSnapshot(value) as TradeTransaction)[0]
                const userTradeTransaction: TradeTransaction = (await user.tradeTransactions.collectionReference.where("orderReference", "==", order.documentReference).get()).docs.map(value => TradeTransaction.fromSnapshot(value) as TradeTransaction)[0]
                const _sku = new SKU(sku.documentReference)
                const stocksDataSource = _sku.stocks.collectionReference.where("isAvailable", "==", true)
                const promiseResult = await Promise.all([_sku.fetch(), stocksDataSource.get()])
                const stocks: Stock[] = promiseResult[1].docs.map(value => Stock.fromSnapshot(value))

                const _item = (await user.items.collectionReference.get()).docs.map(value => Item.fromSnapshot(value) as Item)[0]

                // Shop Trade Transaction
                expect(shopTradeTransaction.type).toEqual(Tradable.TradeTransactionType.order)
                expect(shopTradeTransaction.selledBy).toEqual(shop.id)
                expect(shopTradeTransaction.purchasedBy).toEqual(user.id)
                expect(shopTradeTransaction.orderReference).toEqual(order.documentReference)
                expect(shopTradeTransaction.productReference!.path).toEqual(product.documentReference.path)
                expect(shopTradeTransaction.skuRefernece.path).toEqual(sku.documentReference.path)
                expect(shopTradeTransaction.itemReference.path).toEqual(_item.documentReference.path)

                // User Trade Transaction
                expect(userTradeTransaction.type).toEqual(Tradable.TradeTransactionType.order)
                expect(userTradeTransaction.selledBy).toEqual(shop.id)
                expect(userTradeTransaction.purchasedBy).toEqual(user.id)
                expect(userTradeTransaction.orderReference).toEqual(order.documentReference)
                expect(userTradeTransaction.productReference!.path).toEqual(product.documentReference.path)
                expect(userTradeTransaction.skuRefernece.path).toEqual(sku.documentReference.path)
                expect(userTradeTransaction.itemReference.path).toEqual(_item.documentReference.path)

                // SKU
                expect(_sku.inventory.type).toEqual(Tradable.StockType.finite)
                expect(_sku.inventory.quantity).toEqual(2)
                expect(stocks.length).toEqual(1)

                // Item
                expect(_item.orderReference.path).toEqual(order.documentReference.path)
                expect(_item.selledBy).toEqual(shop.id)
                expect(_item.productReference!.path).toEqual(product.documentReference.path)
                expect(_item.skuReference.path).toEqual(sku.documentReference.path)
            }
        }, 15000)

        test("Failure SKU is not availabled", async () => {

            const product: Product = new Product()
            const sku: SKU = new SKU(product.SKUs.collectionReference.doc())
            const order: Order = new Order()
            const date: Date = new Date()
            const orderItem: OrderItem = new OrderItem()

            product.name = "PRODUCT"
            product.createdBy = shop.id
            product.selledBy = shop.id

            sku.title = "sku"
            sku.isAvailable = false
            sku.selledBy = shop.id
            sku.createdBy = shop.id
            sku.productReference = product.documentReference
            sku.amount = 100
            sku.currency = Tradable.Currency.JPY
            sku.inventory = {
                type: Tradable.StockType.finite,
                quantity: 5
            }

            for (let i = 0; i < sku.inventory.quantity!; i++) {
                const inventoryStock: Stock = new Stock(`${i}`)
                sku.stocks.push(inventoryStock)
            }

            orderItem.selledBy = shop.id
            orderItem.purchasedBy = user.id
            orderItem.skuReference = sku.documentReference
            orderItem.currency = sku.currency
            orderItem.amount = sku.amount
            orderItem.quantity = 1

            order.amount = sku.amount
            order.currency = sku.currency
            order.selledBy = shop.id
            order.purchasedBy = user.id
            order.shippingTo = { address: "address" }
            order.expirationDate = admin.firestore.Timestamp.fromDate(new Date(date.setDate(date.getDate() + 14)))
            order.items.push(orderItem)

            user.orders.push(order)
            const batch: Batch = new Batch()
            batch.save(user)
            batch.save(sku)
            batch.save(product)
            batch.save(shop)
            batch.save(sku.stocks, sku.stocks.collectionReference)
            batch.save(user.orders, user.orders.collectionReference)
            await batch.commit()

            try {
                await firestore.runTransaction(async (transaction) => {
                    return new Promise(async (resolve, reject) => {
                        try {
                            const stockTransaction = await stockManager._trade(order, orderItem, transaction)
                            const result = await stockTransaction.commit()
                            resolve(result)
                        } catch (error) {
                            reject(error)
                        }
                        resolve(`[Manager] Success order ORDER/${order.id}, USER/${order.selledBy} USER/${order.purchasedBy}`)
                    })
                })
            } catch (error) {
                expect(error).not.toBeUndefined()
                console.error(error)
                const _sku = new SKU(sku.documentReference)
                const stocksDataSource = sku.stocks.collectionReference.where("isAvailable", "==", true)
                const promiseResult = await Promise.all([_sku.fetch(), stocksDataSource.get()])
                const stocks: Stock[] = promiseResult[1].docs.map(value => Stock.fromSnapshot(value))

                const _item = (await user.items.collectionReference.get()).docs.map(value => Item.fromSnapshot(value) as Item)[0]

                // SKU
                expect(_sku.inventory.type).toEqual(Tradable.StockType.finite)
                expect(_sku.inventory.quantity).toEqual(5)
                expect(stocks.length).toEqual(5)

                // Item
                expect(_item.selledBy).toEqual(shop.id)
            }
        }, 15000)
    })

    afterAll(async () => {
        await Promise.all([shop.delete(), user.delete(), product.delete(), sku.delete()])
        app.delete()
    })
})
