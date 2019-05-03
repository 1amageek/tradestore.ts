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
	const sku: SKU = new SKU(product.SKUs.collectionReference.doc())
	const order: Order = new Order()

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
			quantity: 10
		}
		for (let i = 0; i < sku.inventory.quantity!; i++) {
			const inventoryStock: Stock = new Stock(`${i}`)
			sku.stocks.push(inventoryStock)
		}

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

	describe("Order Stress test", () => {
		test("Success", async () => {
			let successCount: number = 0
			const n = 5
			const interval = 0
			try {
				const tasks = []
				for (let i = 0; i < n; i++) {
					const test = async () => {
						const date: Date = new Date()
						const orderItem: OrderItem = new OrderItem()

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
						await order.save()
						try {
							await new Promise((resolve, reject) => {
								setTimeout(async () => {
									try {
										const result = await firestore.runTransaction(async (transaction) => {
											const stockTransaction = await stockManager._trade(order, orderItem, transaction)
											return await stockTransaction.commit()
										})
										resolve(result)
									} catch (error) {
										reject(error)
									}

								}, i * interval)
							})
							successCount += 1
							console.log(successCount)
						} catch (error) {
							console.log(error)
						}
					}
					tasks.push(test())
				}
				await Promise.all(tasks)
				const result = await sku.stocks.collectionReference.where("isAvailabled", "==", false).get()
				expect(successCount).toEqual(result.docs.length)
			} catch (error) {
				const result = await sku.stocks.collectionReference.where("isAvailabled", "==", false).get()
				expect(successCount).toEqual(result.docs.length)
				console.log(error)
			}
		}, 15000)
	})

	afterAll(async () => {
		await Promise.all([shop.delete(), user.delete(), product.delete(), sku.delete()])
		app.delete()
	})
})
