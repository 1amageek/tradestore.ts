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
import { Account } from './models/account'
import { BalanceManager } from '../src/BalanceManager'
import { BalanceTransaction } from './models/BalanceTransaction'
import { StripePaymentDelegate } from './stripePaymentDelegate'
import { StripeInvalidPaymentDelegate } from './stripeInvalidPaymentDelegate'
import { TradeDelegate } from './tradeDelegate'
import { Payout } from './models/payout';


export const stripe = new Stripe(Config.STRIPE_API_KEY)
const secret = require("./secret.json")
const app = admin.initializeApp({
    credential: admin.credential.cert(secret)
})
initialize(app.firestore())

describe("Manager", () => {

    const shop: User = new User()
    const user: User = new User()
    const product: Product = new Product()
    const sku: SKU = new SKU(product.SKUs.collectionReference.doc())
    const account: Account = new Account(shop.id)

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
            const shard: Stock = new Stock(`${i}`)
            sku.stocks.push(shard)
        }

        await Promise.all([product.save(), sku.save(), shop.save(), user.save()])
    })

    describe("order", async () => {
        test("Success", async () => {

            const manager: Tradable.Manager<Stock, SKU, OrderItem, Order, TradeTransaction, BalanceTransaction, Payout, User, Account> = new Tradable.Manager(Stock, SKU, OrderItem, Order, TradeTransaction, BalanceTransaction, Payout, User, Account)
            manager.delegate = new StripePaymentDelegate()
            manager.tradeDelegate = new TradeDelegate()

            const order: Order = new Order()
            const date: Date = new Date()
            const orderItem: OrderItem = new OrderItem()

            orderItem.productReference = product.documentReference
            orderItem.order = order.id
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
            await order.save()


            const paymentOptions: Tradable.PaymentOptions = {
                vendorType: "stripe",
                refundFeeRate: 0
            }

            const result = await manager.checkout(order.documentReference, paymentOptions) as Tradable.CheckoutResult<TradeTransaction>

            const shopTradeTransaction = (await shop.tradeTransactions.get(TradeTransaction))[0]
            const userTradeTransaction = (await user.tradeTransactions.get(TradeTransaction))[0]
            const _product: Product = new Product(product.id)
            const _sku = new SKU(sku.id)
            const stocksDataSource = _sku.stocks.query(Stock).where("isAvailabled", "==", false).dataSource()
            const promiseResult = await Promise.all([_sku.fetch(), stocksDataSource.get()])
            const stocks: Stock[] = promiseResult[1]
            const _item = (await user.items.get(Item))[0]

            // Shop Trade Transaction
            expect(shopTradeTransaction.type).toEqual(Tradable.TradeTransactionType.order)
            expect(shopTradeTransaction.selledBy).toEqual(shop.id)
            expect(shopTradeTransaction.purchasedBy).toEqual(user.id)
            expect(shopTradeTransaction.order).toEqual(order.id)
            expect(shopTradeTransaction.product).toEqual(product.documentReference)
            expect(shopTradeTransaction.sku).toEqual(sku.id)

            // User Trade Transaction
            expect(userTradeTransaction.type).toEqual(Tradable.TradeTransactionType.order)
            expect(userTradeTransaction.selledBy).toEqual(shop.id)
            expect(userTradeTransaction.purchasedBy).toEqual(user.id)
            expect(userTradeTransaction.order).toEqual(order.id)
            expect(userTradeTransaction.product).toEqual(product.documentReference)
            expect(userTradeTransaction.sku).toEqual(sku.id)

            // SKU
            expect(_sku.inventory.type).toEqual(Tradable.StockType.finite)
            expect(_sku.inventory.quantity).toEqual(5)
            expect(stocks.length).toEqual(1)

            // Item
            expect(_item.order).toEqual(order.id)
            expect(_item.selledBy).toEqual(shop.id)
            expect(_item.product).toEqual(product.documentReference)
            expect(_item.sku).toEqual(sku.id)

            const account = new Account(user.id)
            const systemBalanceTransaction = await BalanceTransaction.get(result.balanceTransaction!.id) as BalanceTransaction
            const accountBalanceTransaction = await account.balanceTransactions.doc(result.balanceTransaction!.id, BalanceTransaction).fetch() as BalanceTransaction

            // System Balance Transaction
            expect(systemBalanceTransaction.type).toEqual(Tradable.BalanceTransactionType.payment)
            expect(systemBalanceTransaction.currency).toEqual(order.currency)
            expect(systemBalanceTransaction.amount).toEqual(order.amount)
            expect(systemBalanceTransaction.from).toEqual(order.purchasedBy)
            expect(systemBalanceTransaction.to).toEqual(BalanceManager.platform)
            expect(systemBalanceTransaction.transfer).toBeUndefined()
            expect(systemBalanceTransaction.payout).toBeUndefined()
            expect(systemBalanceTransaction.transactionResults[0]['stripe']).toEqual(result.paymentResult)

            // Account Trade Transaction
            expect(accountBalanceTransaction.type).toEqual(Tradable.BalanceTransactionType.payment)
            expect(accountBalanceTransaction.currency).toEqual(order.currency)
            expect(accountBalanceTransaction.amount).toEqual(order.amount)
            expect(accountBalanceTransaction.from).toEqual(order.purchasedBy)
            expect(accountBalanceTransaction.to).toEqual(BalanceManager.platform)
            expect(accountBalanceTransaction.transfer).toBeUndefined()
            expect(accountBalanceTransaction.payout).toBeUndefined()
            expect(accountBalanceTransaction.transactionResults[0]['stripe']).toEqual(result.paymentResult)

        }, 15000)

        test("Out of stock", async () => {

            const manager: Tradable.Manager<Stock, SKU, OrderItem, Order, TradeTransaction, BalanceTransaction, Payout, User, Account> = new Tradable.Manager(Stock, SKU, OrderItem, Order, TradeTransaction, BalanceTransaction, Payout, User, Account)
            manager.delegate = new StripePaymentDelegate()
            manager.tradeDelegate = new TradeDelegate()

            const order: Order = new Order()
            const date: Date = new Date()
            const orderItem: OrderItem = new OrderItem()

            orderItem.productReference = product.documentReference
            orderItem.order = order.id
            orderItem.selledBy = shop.id
            orderItem.purchasedBy = user.id
            orderItem.skuReference = sku.documentReference
            orderItem.currency = sku.currency
            orderItem.amount = sku.amount
            orderItem.quantity = 5

            order.amount = sku.amount
            order.currency = sku.currency
            order.selledBy = shop.id
            order.purchasedBy = user.id
            order.shippingTo = { address: "address" }
            order.expirationDate = admin.firestore.Timestamp.fromDate(new Date(date.setDate(date.getDate() + 14)))
            order.items.push(orderItem)
            await order.save()

            const paymentOptions: Tradable.PaymentOptions = {
                vendorType: "stripe",
                refundFeeRate: 0
            }
            try {
                const result = await manager.checkout(order.documentReference, paymentOptions) as Tradable.CheckoutResult<TradeTransaction>
                console.log(result)
            } catch (error) {
                expect(error).not.toBeUndefined()
                const _product: Product = new Product(product.id)
                const _sku = await new SKU(sku.id).fetch()

                // SKU
                expect(_sku.inventory.type).toEqual(Tradable.StockType.finite)
                expect(_sku.inventory.quantity).toEqual(5)

            }
        }, 15000)

        test("Invalid Order Status", async () => {

            const manager: Tradable.Manager<Stock, SKU, OrderItem, Order, TradeTransaction, BalanceTransaction, Payout, User, Account> = new Tradable.Manager(Stock, SKU, OrderItem, Order, TradeTransaction, BalanceTransaction, Payout, User, Account)
            manager.delegate = new StripePaymentDelegate()
            manager.tradeDelegate = new TradeDelegate()

            const order: Order = new Order()
            const date: Date = new Date()
            const orderItem: OrderItem = new OrderItem()

            orderItem.productReference = product.documentReference
            orderItem.order = order.id
            orderItem.selledBy = shop.id
            orderItem.purchasedBy = user.id
            orderItem.skuReference = sku.id
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
            order.paymentStatus = Tradable.OrderPaymentStatus.paid
            await order.save()

            const paymentOptions: Tradable.PaymentOptions = {
                vendorType: "stripe",
                refundFeeRate: 0
            }
            try {
                const result = await manager.checkout(order.documentReference, paymentOptions) as Tradable.CheckoutResult<TradeTransaction>
            } catch (error) {
                expect(error).not.toBeUndefined()
                const _product: Product = new Product(product.id)
                const _sku = await new SKU(sku.id).fetch()
                // SKU
                expect(_sku.inventory.type).toEqual(Tradable.StockType.finite)
                expect(_sku.inventory.quantity).toEqual(5)

            }
        }, 15000)

        test("Invalid Delegate", async () => {

            const manager: Tradable.Manager<Stock, SKU, OrderItem, Order, TradeTransaction, BalanceTransaction, Payout, User, Account> = new Tradable.Manager(Stock, SKU, OrderItem, Order, TradeTransaction, BalanceTransaction, Payout, User, Account)

            const order: Order = new Order()
            const date: Date = new Date()
            const orderItem: OrderItem = new OrderItem()

            orderItem.productReference = product.documentReference
            orderItem.order = order.id
            orderItem.selledBy = shop.id
            orderItem.purchasedBy = user.id
            orderItem.skuReference = sku.id
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
            await order.save()

            const paymentOptions: Tradable.PaymentOptions = {
                vendorType: "stripe",
                refundFeeRate: 0
            }
            try {
                const result = await manager.checkout(order.documentReference, paymentOptions) as Tradable.CheckoutResult<TradeTransaction>
            } catch (error) {
                expect(error).not.toBeUndefined()
                const _product: Product = new Product(product.id)
                const _sku = await new SKU(sku.id).fetch()
                // SKU
                expect(_sku.inventory.type).toEqual(Tradable.StockType.finite)
                expect(_sku.inventory.quantity).toEqual(5)

            }
        }, 15000)

        test("Invalid Stripe charge", async () => {

            const manager: Tradable.Manager<Stock, SKU, OrderItem, Order, TradeTransaction, BalanceTransaction, Payout, User, Account> = new Tradable.Manager(Stock, SKU, OrderItem, Order, TradeTransaction, BalanceTransaction, Payout, User, Account)
            manager.delegate = new StripeInvalidPaymentDelegate()
            manager.tradeDelegate = new TradeDelegate()

            const order: Order = new Order()
            const date: Date = new Date()
            const orderItem: OrderItem = new OrderItem()

            orderItem.productReference = product.documentReference
            orderItem.order = order.id
            orderItem.selledBy = shop.id
            orderItem.purchasedBy = user.id
            orderItem.skuReference = sku.id
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
            order.paymentStatus = Tradable.OrderPaymentStatus.paid
            await order.save()

            const paymentOptions: Tradable.PaymentOptions = {
                vendorType: "stripe",
                refundFeeRate: 0
            }
            try {
                const result = await manager.checkout(order.documentReference, paymentOptions) as Tradable.CheckoutResult<TradeTransaction>
            } catch (error) {
                expect(error).not.toBeUndefined()
                const _product: Product = new Product(product.id)
                const _sku = await new SKU(sku.id).fetch()

                // SKU
                expect(_sku.inventory.type).toEqual(Tradable.StockType.finite)
                expect(_sku.inventory.quantity).toEqual(5)

            }
        }, 15000)
    })

    /*
    describe("transfer", async () => {
        test("Success", async () => {

            const manager: Tradable.Manager<SKUShard, SKU, Product, OrderItem, Order, TradeTransaction, BalanceTransaction, User, Account> = new Tradable.Manager(SKUShard, SKU, Product, OrderItem, Order, TradeTransaction, BalanceTransaction, User, Account)
            manager.delegate = new StripePaymentDelegate()

            const order: Order = new Order()
            const date: Date = new Date()
            const orderItem: OrderItem = new OrderItem()

            orderItem.productReference = product.id
            orderItem.order = order.id
            orderItem.selledBy = shop.id
            orderItem.purchasedBy = user.id
            orderItem.skuReference = sku.id
            orderItem.currency = sku.currency
            orderItem.amount = sku.amount
            orderItem.quantity = 1

            order.amount = sku.amount
            order.currency = sku.currency
            order.selledBy = shop.id
            order.purchasedBy = user.id
            order.shippingTo = { address: "address" }
            order.expirationDate = new Date(date.setDate(date.getDate() + 14))
            order.items.push(orderItem)
            await order.save()


            const paymentOptions: Tradable.PaymentOptions = {
                vendorType: "stripe",
                refundFeeRate: 0
            }

            const transferOptions: Tradable.TransferOptions = {
                vendorType: "stripe",
                transferRate: 0.5 
            }

            const result = await manager.checkout(order, [orderItem], paymentOptions) as Tradable.CheckoutResult
            // const itemID = (result.tradeTransactions[0].data() as any)["items"][0]
            const _order = await Order.get(order.id) as Order
            const transferResult = await manager.transfer(_order, transferOptions) as Tradable.TransferResult

            const account = new Account(user.id)
            const systemBalanceTransaction = await BalanceTransaction.get(transferResult.balanceTransaction!.id) as BalanceTransaction
            const accountBalanceTransaction = await account.balanceTransactions.doc(transferResult.balanceTransaction!.id, BalanceTransaction) as BalanceTransaction

            // System Balance Transaction
            expect(systemBalanceTransaction.type).toEqual(Tradable.BalanceTransactionType.paymentRefund)
            expect(systemBalanceTransaction.currency).toEqual(order.currency)
            expect(systemBalanceTransaction.amount).toEqual(order.amount)
            expect(systemBalanceTransaction.from).toEqual(BalanceManager.platform)
            expect(systemBalanceTransaction.to).toEqual(order.purchasedBy)
            expect(systemBalanceTransaction.transfer).toBeUndefined()
            expect(systemBalanceTransaction.payout).toBeUndefined()
            expect(systemBalanceTransaction.transactionResults[0]['stripe']).toEqual(transferResult.transferResult)

            // Account Trade Transaction
            expect(accountBalanceTransaction.type).toEqual(Tradable.BalanceTransactionType.paymentRefund)
            expect(accountBalanceTransaction.currency).toEqual(order.currency)
            expect(accountBalanceTransaction.amount).toEqual(order.amount)
            expect(accountBalanceTransaction.from).toEqual(BalanceManager.platform)
            expect(accountBalanceTransaction.to).toEqual(order.purchasedBy)
            expect(accountBalanceTransaction.transfer).toBeUndefined()
            expect(accountBalanceTransaction.payout).toBeUndefined()
            expect(accountBalanceTransaction.transactionResults[0]['stripe']).toEqual(transferResult.transferResult)

        }, 15000)
    })
    */

    afterAll(async () => {
        await Promise.all([account.delete(), shop.delete(), user.delete(), product.delete(), sku.delete()])
    })
})
