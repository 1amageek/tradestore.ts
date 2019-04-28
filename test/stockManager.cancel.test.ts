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
import { TradeDelegate } from './tradeDelegate'


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

    const stockManager: StockManager<Order, OrderItem, User, Stock, SKU, TradeTransaction> = new StockManager(User.self(), Stock.self(), SKU.self(), TradeTransaction.self())

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

    describe("OrderCancel", () => {

        let orderResult: TradeTransaction | undefined = undefined

        test("Success", async () => {
            try {
                const result = await firestore.runTransaction(async (transaction) => {
                    return new Promise(async (resolve, reject) => {
                        const stockTransaction = await stockManager._trade(order, orderItem, transaction)
                        const result = await stockTransaction.commit()
                        resolve(result)
                    })
                }) as TradeTransaction[]

                orderResult = result[0]
            
                const shopTradeTransaction: TradeTransaction  = (await shop.tradeTransactions.collectionReference.orderBy("createdAt").get()).docs.map(value => TradeTransaction.fromSnapshot(value) as TradeTransaction)[0]
                const userTradeTransaction: TradeTransaction = (await user.tradeTransactions.collectionReference.orderBy("createdAt").get()).docs.map(value => User.fromSnapshot(value) as TradeTransaction)[0]
                const _sku = new SKU(sku.id)
                const inventoryStocksDataSource = _sku.stocks.collectionReference.where("order", "==", orderResult.order)
                const promiseResult = await Promise.all([_sku.fetch(), inventoryStocksDataSource.get()])
                const inventoryStocks: Stock[] = promiseResult[1].docs.map( value => Stock.fromSnapshot(value))

                const _item = (await user.items.collectionReference.get()).docs.map(value => Item.fromSnapshot(value) as Item)[0]



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
				expect(error).not.toBeUndefined()
                console.log(error)
            }
		}, 15000)
		
		test("Success", async () => {

            const result = await firestore.runTransaction(async (transaction) => {
                const stockTransaction = await stockManager.cancel(order, orderItem, transaction)
                return await stockTransaction.commit()
            }) as TradeTransaction[]

            console.log(result)

			const shopTradeTransaction = (await shop.tradeTransactions.doc(result[0].id, TradeTransaction).fetch())
			const userTradeTransaction = (await user.tradeTransactions.doc(result[0].id, TradeTransaction).fetch())
			const _sku = new SKU(sku.id)
			const inventoryStocksDataSource = _sku.inventoryStocks.collectionReference.where("isAvailabled", "==", true)
			const promiseResult = await Promise.all([_sku.fetch(), inventoryStocksDataSource.get(), shopTradeTransaction.fetch(), userTradeTransaction.fetch()])
			const inventoryStocks: Stock[] = promiseResult[1].docs.map(value => Stock.fromSnapshot(value))
			const _item = await user.items.doc(orderResult!.item.id, Item).fetch()

			// Shop Trade Transaction
			expect(shopTradeTransaction.type).toEqual(Tradable.TradeTransactionType.orderCancel)
			expect(shopTradeTransaction.selledBy).toEqual(shop.id)
			expect(shopTradeTransaction.purchasedBy).toEqual(user.id)
			expect(shopTradeTransaction.order).toEqual(order.id)
			expect(shopTradeTransaction.product).toEqual(product.documentReference)
			expect(shopTradeTransaction.sku).toEqual(sku.id)
			expect(shopTradeTransaction.item.id).toEqual(_item.id)

			// User Trade Transaction
			expect(userTradeTransaction.type).toEqual(Tradable.TradeTransactionType.orderCancel)
			expect(userTradeTransaction.selledBy).toEqual(shop.id)
			expect(userTradeTransaction.purchasedBy).toEqual(user.id)
			expect(userTradeTransaction.order).toEqual(order.id)
			expect(userTradeTransaction.product).toEqual(product.documentReference)
			expect(userTradeTransaction.sku).toEqual(sku.id)
			expect(userTradeTransaction.item.id).toEqual(_item.id)

			// SKU
			expect(_sku.inventory.type).toEqual(Tradable.StockType.finite)
			expect(inventoryStocks.length).toEqual(2)

			// Item
			expect(_item.order).toEqual(order.id)
			expect(_item.selledBy).toEqual(shop.id)
			expect(_item.product).toEqual(product.documentReference)
			expect(_item.sku).toEqual(sku.id)
			expect(_item.isCancelled).toEqual(true)
        }, 15000)
    })

    afterAll(async () => {
        await Promise.all([shop.delete(), user.delete(), product.delete(), sku.delete()])
        app.delete()
    })
})
