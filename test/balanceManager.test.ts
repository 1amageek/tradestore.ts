process.env.NODE_ENV = 'test'
import { initialize, firestore } from '@1amageek/ballcap-admin'
import * as admin from 'firebase-admin'
import * as Tradable from '../src/index'
import * as Config from './config'
// tslint:disable-next-line:no-implicit-dependencies
import * as Stripe from 'stripe'

import { User } from './models/user'
import { Product } from './models/product'
import { InventoryStock } from './models/inventoryStock'
import { SKU } from './models/sku'
import { Order } from './models/order'
import { OrderItem } from './models/orderItem'
import { Account } from './models/account'
import { BalanceManager } from '../src/BalanceManager';
import { BalanceTransaction } from './models/BalanceTransaction';
import { Payout } from './models/payout';


export const stripe = new Stripe(Config.STRIPE_API_KEY)
const secret = require("./secret.json")
const app = admin.initializeApp({
    credential: admin.credential.cert(secret)
})
initialize(app.firestore())

describe("BalanceManager", () => {

    const shop: User = new User()
    const user: User = new User()
    const product: Product = new Product()
    const sku: SKU = new SKU()
    const account: Account = new Account(shop.id)
    const order: Order = new Order()
    const date: Date = new Date()
    const orderItem: OrderItem = new OrderItem()

 
    const balanceManager: BalanceManager<BalanceTransaction, Payout, Account> = new BalanceManager(BalanceTransaction.self(), Account.self())

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
            quantity: 1
        }

        for (let i = 0; i < sku.inventory.quantity!; i++) {
            const shard: InventoryStock = new InventoryStock(`${i}`)
            sku.inventoryStocks.push(shard)
        }

        orderItem.order = order.id
        orderItem.selledBy = shop.id
        orderItem.purchasedBy = user.id
        orderItem.sku = sku.id
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
        await Promise.all([order.save(), sku.save(), product.save(), shop.save(), user.save()])
    })

    describe("payment", () => {
        test("Success", async () => {
            const result = await firestore.runTransaction(async (transaction) => {
                return new Promise(async (resolve, reject) => {
                    const result = await balanceManager.charge(user.id, order.id, order.currency, order.amount, {"result": "result"}, transaction)
                    resolve(result)
                })
            }) as BalanceTransaction

            const account = new Account(user.id)
            const systemBalanceTransaction = await BalanceTransaction.get(result.id) as BalanceTransaction
            const accountBalanceTransaction = await account.balanceTransactions.doc(result.id, BalanceTransaction).fetch() as BalanceTransaction

            // System Balance Transaction
            expect(systemBalanceTransaction.type).toEqual(Tradable.BalanceTransactionType.payment)
            expect(systemBalanceTransaction.currency).toEqual(order.currency)
            expect(systemBalanceTransaction.amount).toEqual(order.amount)
            expect(systemBalanceTransaction.from).toEqual(order.purchasedBy)
            expect(systemBalanceTransaction.to).toEqual(BalanceManager.platform)
            expect(systemBalanceTransaction.transfer).toBeNull()
            expect(systemBalanceTransaction.payout).toBeNull()
            expect(systemBalanceTransaction.transactionResults[0]).toEqual({"result": "result"})

            // Account Trade Transaction
            expect(accountBalanceTransaction.type).toEqual(Tradable.BalanceTransactionType.payment)
            expect(accountBalanceTransaction.currency).toEqual(order.currency)
            expect(accountBalanceTransaction.amount).toEqual(order.amount)
            expect(accountBalanceTransaction.from).toEqual(order.purchasedBy)
            expect(accountBalanceTransaction.to).toEqual(BalanceManager.platform)
            expect(accountBalanceTransaction.transfer).toBeNull()
            expect(accountBalanceTransaction.payout).toBeNull()
            expect(accountBalanceTransaction.transactionResults[0]).toEqual({"result": "result"})

        }, 15000)
    })

    describe("refund", () => {
        test("Success", async () => {
            const result = await firestore.runTransaction(async (transaction) => {
                return new Promise(async (resolve, reject) => {
                    const result = await balanceManager.refund(user.id, order.id, order.currency, order.amount, {"result": "result"}, transaction)
                    resolve(result)
                })
            }) as BalanceTransaction

            const account = new Account(user.id)
            const systemBalanceTransaction = await BalanceTransaction.get(result.id) as BalanceTransaction
            const accountBalanceTransaction = await account.balanceTransactions.doc(result.id, BalanceTransaction).fetch() as BalanceTransaction

            // System Balance Transaction
            expect(systemBalanceTransaction.type).toEqual(Tradable.BalanceTransactionType.paymentRefund)
            expect(systemBalanceTransaction.currency).toEqual(order.currency)
            expect(systemBalanceTransaction.amount).toEqual(order.amount)
            expect(systemBalanceTransaction.from).toEqual(BalanceManager.platform)
            expect(systemBalanceTransaction.to).toEqual(order.purchasedBy)
            expect(systemBalanceTransaction.transfer).toBeNull()
            expect(systemBalanceTransaction.payout).toBeNull()
            expect(systemBalanceTransaction.transactionResults[0]).toEqual({"result": "result"})


            // Account Trade Transaction
            expect(accountBalanceTransaction.type).toEqual(Tradable.BalanceTransactionType.paymentRefund)
            expect(accountBalanceTransaction.currency).toEqual(order.currency)
            expect(accountBalanceTransaction.amount).toEqual(order.amount)
            expect(accountBalanceTransaction.from).toEqual(BalanceManager.platform)
            expect(accountBalanceTransaction.to).toEqual(order.purchasedBy)
            expect(accountBalanceTransaction.transfer).toBeNull()
            expect(accountBalanceTransaction.payout).toBeNull()
            expect(accountBalanceTransaction.transactionResults[0]).toEqual({"result": "result"})

        }, 15000)
    })

    describe("transfer platfomr -> user", () => {
        test("Success", async () => {
            const result = await firestore.runTransaction(async (transaction) => {
                return new Promise(async (resolve, reject) => {
                    const result = await balanceManager.transfer(BalanceManager.platform, order.selledBy, order.id, order.currency, order.amount, {"result": "result"}, transaction)
                    resolve(result)
                })
            }) as BalanceTransaction

            const account = new Account(order.selledBy)
            await account.fetch()
            const systemBalanceTransaction = await BalanceTransaction.get(result.id) as BalanceTransaction
            const accountBalanceTransaction = await account.balanceTransactions.doc(result.id, BalanceTransaction).fetch() as BalanceTransaction

            expect(account.balance.available[order.currency]).toEqual(order.amount)

            // System Balance Transaction
            expect(systemBalanceTransaction.type).toEqual(Tradable.BalanceTransactionType.transfer)
            expect(systemBalanceTransaction.currency).toEqual(order.currency)
            expect(systemBalanceTransaction.amount).toEqual(order.amount)
            expect(systemBalanceTransaction.from).toEqual(BalanceManager.platform)
            expect(systemBalanceTransaction.to).toEqual(order.selledBy)
            expect(systemBalanceTransaction.transfer).toBeNull()
            expect(systemBalanceTransaction.payout).toBeNull()
            expect(systemBalanceTransaction.transactionResults[0]).toEqual({"result": "result"})


            // Account Trade Transaction
            expect(accountBalanceTransaction.type).toEqual(Tradable.BalanceTransactionType.transfer)
            expect(accountBalanceTransaction.currency).toEqual(order.currency)
            expect(accountBalanceTransaction.amount).toEqual(order.amount)
            expect(accountBalanceTransaction.from).toEqual(BalanceManager.platform)
            expect(accountBalanceTransaction.to).toEqual(order.selledBy)
            expect(accountBalanceTransaction.transfer).toBeNull()
            expect(accountBalanceTransaction.payout).toBeNull()
            expect(accountBalanceTransaction.transactionResults[0]).toEqual({"result": "result"})

        }, 15000)
    })

    describe("transferRefund user -> platform", () => {
        test("Success", async () => {
            const result = await firestore.runTransaction(async (transaction) => {
                return new Promise(async (resolve, reject) => {
                    const result = await balanceManager.transferRefund(order.selledBy, BalanceManager.platform, order.id, order.currency, order.amount, {"result": "result"}, transaction)
                    resolve(result)
                })
            }) as BalanceTransaction

            const account = new Account(order.selledBy)
            await account.fetch()
            const systemBalanceTransaction = await BalanceTransaction.get(result.id) as BalanceTransaction
            const accountBalanceTransaction = await account.balanceTransactions.doc(result.id, BalanceTransaction).fetch() as BalanceTransaction

            expect(account.balance.available[order.currency]).toEqual(0)

            // System Balance Transaction
            expect(systemBalanceTransaction.type).toEqual(Tradable.BalanceTransactionType.transferRefund)
            expect(systemBalanceTransaction.currency).toEqual(order.currency)
            expect(systemBalanceTransaction.amount).toEqual(order.amount)
            expect(systemBalanceTransaction.from).toEqual(order.selledBy)
            expect(systemBalanceTransaction.to).toEqual(BalanceManager.platform)
            expect(systemBalanceTransaction.transfer).toBeNull()
            expect(systemBalanceTransaction.payout).toBeNull()
            expect(systemBalanceTransaction.transactionResults[0]).toEqual({"result": "result"})


            // Account Trade Transaction
            expect(accountBalanceTransaction.type).toEqual(Tradable.BalanceTransactionType.transferRefund)
            expect(accountBalanceTransaction.currency).toEqual(order.currency)
            expect(accountBalanceTransaction.amount).toEqual(order.amount)
            expect(accountBalanceTransaction.from).toEqual(order.selledBy)
            expect(accountBalanceTransaction.to).toEqual(BalanceManager.platform)
            expect(accountBalanceTransaction.transfer).toBeNull()
            expect(accountBalanceTransaction.payout).toBeNull()
            expect(accountBalanceTransaction.transactionResults[0]).toEqual({"result": "result"})

        }, 15000)
    })

    describe("transfer user -> platform", () => {
        test("Success", async () => {
            const result = await firestore.runTransaction(async (transaction) => {
                return new Promise(async (resolve, reject) => {
                    const result = await balanceManager.transfer(order.selledBy, BalanceManager.platform, order.id, order.currency, order.amount, {"result": "result"}, transaction)
                    resolve(result)
                })
            }) as BalanceTransaction

            const account = new Account(order.selledBy)
            await account.fetch()
            const systemBalanceTransaction = await BalanceTransaction.get(result.id) as BalanceTransaction
            const accountBalanceTransaction = await account.balanceTransactions.doc(result.id, BalanceTransaction).fetch() as BalanceTransaction

            expect(account.balance.available[order.currency]).toEqual(-order.amount)

            // System Balance Transaction
            expect(systemBalanceTransaction.type).toEqual(Tradable.BalanceTransactionType.transfer)
            expect(systemBalanceTransaction.currency).toEqual(order.currency)
            expect(systemBalanceTransaction.amount).toEqual(order.amount)
            expect(systemBalanceTransaction.from).toEqual(order.selledBy)
            expect(systemBalanceTransaction.to).toEqual(BalanceManager.platform)
            expect(systemBalanceTransaction.transfer).toBeNull()
            expect(systemBalanceTransaction.payout).toBeNull()
            expect(systemBalanceTransaction.transactionResults[0]).toEqual({"result": "result"})


            // Account Trade Transaction
            expect(accountBalanceTransaction.type).toEqual(Tradable.BalanceTransactionType.transfer)
            expect(accountBalanceTransaction.currency).toEqual(order.currency)
            expect(accountBalanceTransaction.amount).toEqual(order.amount)
            expect(accountBalanceTransaction.from).toEqual(order.selledBy)
            expect(accountBalanceTransaction.to).toEqual(BalanceManager.platform)
            expect(accountBalanceTransaction.transfer).toBeNull()
            expect(accountBalanceTransaction.payout).toBeNull()
            expect(accountBalanceTransaction.transactionResults[0]).toEqual({"result": "result"})

        }, 15000)
    })

    describe("transferRefund platfrom -> user", () => {
        test("Success", async () => {
            const result = await firestore.runTransaction(async (transaction) => {
                return new Promise(async (resolve, reject) => {
                    const result = await balanceManager.transferRefund(BalanceManager.platform, order.selledBy, order.id, order.currency, order.amount, {"result": "result"}, transaction)
                    resolve(result)
                })
            }) as BalanceTransaction

            const account = new Account(order.selledBy)
            await account.fetch()
            const systemBalanceTransaction = await BalanceTransaction.get(result.id) as BalanceTransaction
            const accountBalanceTransaction = await account.balanceTransactions.doc(result.id, BalanceTransaction).fetch() as BalanceTransaction

            expect(account.balance.available[order.currency]).toEqual(0)

            // System Balance Transaction
            expect(systemBalanceTransaction.type).toEqual(Tradable.BalanceTransactionType.transferRefund)
            expect(systemBalanceTransaction.currency).toEqual(order.currency)
            expect(systemBalanceTransaction.amount).toEqual(order.amount)
            expect(systemBalanceTransaction.from).toEqual(BalanceManager.platform)
            expect(systemBalanceTransaction.to).toEqual(order.selledBy)
            expect(systemBalanceTransaction.transfer).toBeNull()
            expect(systemBalanceTransaction.payout).toBeNull()
            expect(systemBalanceTransaction.transactionResults[0]).toEqual({"result": "result"})


            // Account Trade Transaction
            expect(accountBalanceTransaction.type).toEqual(Tradable.BalanceTransactionType.transferRefund)
            expect(accountBalanceTransaction.currency).toEqual(order.currency)
            expect(accountBalanceTransaction.amount).toEqual(order.amount)
            expect(accountBalanceTransaction.from).toEqual(BalanceManager.platform)
            expect(accountBalanceTransaction.to).toEqual(order.selledBy)
            expect(accountBalanceTransaction.transfer).toBeNull()
            expect(accountBalanceTransaction.payout).toBeNull()
            expect(accountBalanceTransaction.transactionResults[0]).toEqual({"result": "result"})

        }, 15000)
    })

    describe("transfer user -> user", () => {
        test("Success", async () => {
            const result = await firestore.runTransaction(async (transaction) => {
                return new Promise(async (resolve, reject) => {
                    const result = await balanceManager.transfer(order.purchasedBy, order.selledBy, order.id, order.currency, order.amount, {"result": "result"}, transaction)
                    resolve(result)
                })
            }) as BalanceTransaction

            const from = new Account(order.purchasedBy)
            const to = new Account(order.selledBy)
            await Promise.all([from.fetch(), to.fetch()])
            const systemBalanceTransaction = await BalanceTransaction.get(result.id) as BalanceTransaction
            const fromBalanceTransaction = await from.balanceTransactions.doc(result.id, BalanceTransaction).fetch() as BalanceTransaction
            const toBalanceTransaction = await to.balanceTransactions.doc(result.id, BalanceTransaction).fetch() as BalanceTransaction

            expect(from.balance.available[order.currency]).toEqual(-order.amount)
            expect(to.balance.available[order.currency]).toEqual(order.amount)

            // System Balance Transaction
            expect(systemBalanceTransaction.type).toEqual(Tradable.BalanceTransactionType.transfer)
            expect(systemBalanceTransaction.currency).toEqual(order.currency)
            expect(systemBalanceTransaction.amount).toEqual(order.amount)
            expect(systemBalanceTransaction.from).toEqual(order.purchasedBy)
            expect(systemBalanceTransaction.to).toEqual(order.selledBy)
            expect(systemBalanceTransaction.transfer).toBeNull()
            expect(systemBalanceTransaction.payout).toBeNull()
            expect(systemBalanceTransaction.transactionResults[0]).toEqual({"result": "result"})


            // Account Trade Transaction
            expect(fromBalanceTransaction.type).toEqual(Tradable.BalanceTransactionType.transfer)
            expect(fromBalanceTransaction.currency).toEqual(order.currency)
            expect(fromBalanceTransaction.amount).toEqual(order.amount)
            expect(fromBalanceTransaction.from).toEqual(order.purchasedBy)
            expect(fromBalanceTransaction.to).toEqual(order.selledBy)
            expect(fromBalanceTransaction.transfer).toBeNull()
            expect(fromBalanceTransaction.payout).toBeNull()
            expect(fromBalanceTransaction.transactionResults[0]).toEqual({"result": "result"})

            expect(toBalanceTransaction.type).toEqual(Tradable.BalanceTransactionType.transfer)
            expect(toBalanceTransaction.currency).toEqual(order.currency)
            expect(toBalanceTransaction.amount).toEqual(order.amount)
            expect(toBalanceTransaction.from).toEqual(order.purchasedBy)
            expect(toBalanceTransaction.to).toEqual(order.selledBy)
            expect(toBalanceTransaction.transfer).toBeNull()
            expect(toBalanceTransaction.payout).toBeNull()
            expect(toBalanceTransaction.transactionResults[0]).toEqual({"result": "result"})

        }, 15000)
    })

    describe("transferRefund user -> user", () => {
        test("Success", async () => {
            const result = await firestore.runTransaction(async (transaction) => {
                return new Promise(async (resolve, reject) => {
                    const result = await balanceManager.transferRefund(order.selledBy, order.purchasedBy, order.id, order.currency, order.amount, {"result": "result"}, transaction)
                    resolve(result)
                })
            }) as BalanceTransaction

            const from = new Account(order.selledBy)
            const to = new Account(order.purchasedBy)
            await Promise.all([from.fetch(), to.fetch()])
            const systemBalanceTransaction = await BalanceTransaction.get(result.id) as BalanceTransaction
            const fromBalanceTransaction = await from.balanceTransactions.doc(result.id, BalanceTransaction).fetch() as BalanceTransaction
            const toBalanceTransaction = await to.balanceTransactions.doc(result.id, BalanceTransaction).fetch() as BalanceTransaction

            expect(from.balance.available[order.currency]).toEqual(0)
            expect(to.balance.available[order.currency]).toEqual(0)

            // System Balance Transaction
            expect(systemBalanceTransaction.type).toEqual(Tradable.BalanceTransactionType.transferRefund)
            expect(systemBalanceTransaction.currency).toEqual(order.currency)
            expect(systemBalanceTransaction.amount).toEqual(order.amount)
            expect(systemBalanceTransaction.from).toEqual(order.selledBy)
            expect(systemBalanceTransaction.to).toEqual(order.purchasedBy)
            expect(systemBalanceTransaction.transfer).toBeNull()
            expect(systemBalanceTransaction.payout).toBeNull()
            expect(systemBalanceTransaction.transactionResults[0]).toEqual({"result": "result"})


            // Account Trade Transaction
            expect(fromBalanceTransaction.type).toEqual(Tradable.BalanceTransactionType.transferRefund)
            expect(fromBalanceTransaction.currency).toEqual(order.currency)
            expect(fromBalanceTransaction.amount).toEqual(order.amount)
            expect(fromBalanceTransaction.from).toEqual(order.selledBy)
            expect(fromBalanceTransaction.to).toEqual(order.purchasedBy)
            expect(fromBalanceTransaction.transfer).toBeNull()
            expect(fromBalanceTransaction.payout).toBeNull()
            expect(fromBalanceTransaction.transactionResults[0]).toEqual({"result": "result"})

            expect(toBalanceTransaction.type).toEqual(Tradable.BalanceTransactionType.transferRefund)
            expect(toBalanceTransaction.currency).toEqual(order.currency)
            expect(toBalanceTransaction.amount).toEqual(order.amount)
            expect(toBalanceTransaction.from).toEqual(order.selledBy)
            expect(toBalanceTransaction.to).toEqual(order.purchasedBy)
            expect(toBalanceTransaction.transfer).toBeNull()
            expect(toBalanceTransaction.payout).toBeNull()
            expect(toBalanceTransaction.transactionResults[0]).toEqual({"result": "result"})

        }, 15000)
    })

    describe("payout", () => {
        test("Success", async () => {
            const result = await firestore.runTransaction(async (transaction) => {
                return new Promise(async (resolve, reject) => {
                    const result = await balanceManager.payout(order.selledBy, order.currency, order.amount, {"result": "result"}, transaction)
                    resolve(result)
                })
            }) as BalanceTransaction

            const account = new Account(order.selledBy)
            await account.fetch()
            const systemBalanceTransaction = await BalanceTransaction.get(result.id) as BalanceTransaction
            const accountBalanceTransaction = await account.balanceTransactions.doc(result.id, BalanceTransaction).fetch() as BalanceTransaction

            expect(account.balance.available[order.currency]).toEqual(-order.amount)

            // System Balance Transaction
            expect(systemBalanceTransaction.type).toEqual(Tradable.BalanceTransactionType.payout)
            expect(systemBalanceTransaction.currency).toEqual(order.currency)
            expect(systemBalanceTransaction.amount).toEqual(order.amount)
            expect(systemBalanceTransaction.from).toEqual(order.selledBy)
            expect(systemBalanceTransaction.to).toEqual(BalanceManager.bankAccount)
            expect(systemBalanceTransaction.transfer).toBeNull()
            expect(systemBalanceTransaction.payout).toBeNull()
            expect(systemBalanceTransaction.transactionResults[0]).toEqual({"result": "result"})


            // Account Trade Transaction
            expect(accountBalanceTransaction.type).toEqual(Tradable.BalanceTransactionType.payout)
            expect(accountBalanceTransaction.currency).toEqual(order.currency)
            expect(accountBalanceTransaction.amount).toEqual(order.amount)
            expect(accountBalanceTransaction.from).toEqual(order.selledBy)
            expect(accountBalanceTransaction.to).toEqual(BalanceManager.bankAccount)
            expect(accountBalanceTransaction.transfer).toBeNull()
            expect(accountBalanceTransaction.payout).toBeNull()
            expect(accountBalanceTransaction.transactionResults[0]).toEqual({"result": "result"})

        }, 15000)
    })

    describe("payoutCancel", () => {
        test("Success", async () => {
            const result = await firestore.runTransaction(async (transaction) => {
                return new Promise(async (resolve, reject) => {
                    const result = await balanceManager.payoutCancel(order.selledBy, order.currency, order.amount, {"result": "result"}, transaction)
                    resolve(result)
                })
            }) as BalanceTransaction

            const account = new Account(order.selledBy)
            await account.fetch()
            const systemBalanceTransaction = await BalanceTransaction.get(result.id) as BalanceTransaction
            const accountBalanceTransaction = await account.balanceTransactions.doc(result.id, BalanceTransaction).fetch() as BalanceTransaction

            expect(account.balance.available[order.currency]).toEqual(0)

            // System Balance Transaction
            expect(systemBalanceTransaction.type).toEqual(Tradable.BalanceTransactionType.payoutCancel)
            expect(systemBalanceTransaction.currency).toEqual(order.currency)
            expect(systemBalanceTransaction.amount).toEqual(order.amount)
            expect(systemBalanceTransaction.from).toEqual(BalanceManager.bankAccount)
            expect(systemBalanceTransaction.to).toEqual(order.selledBy)
            expect(systemBalanceTransaction.transfer).toBeNull()
            expect(systemBalanceTransaction.payout).toBeNull()
            expect(systemBalanceTransaction.transactionResults[0]).toEqual({"result": "result"})


            // Account Trade Transaction
            expect(accountBalanceTransaction.type).toEqual(Tradable.BalanceTransactionType.payoutCancel)
            expect(accountBalanceTransaction.currency).toEqual(order.currency)
            expect(accountBalanceTransaction.amount).toEqual(order.amount)
            expect(accountBalanceTransaction.from).toEqual(BalanceManager.bankAccount)
            expect(accountBalanceTransaction.to).toEqual(order.selledBy)
            expect(accountBalanceTransaction.transfer).toBeNull()
            expect(accountBalanceTransaction.payout).toBeNull()
            expect(accountBalanceTransaction.transactionResults[0]).toEqual({"result": "result"})

        }, 15000)
    })

    afterAll(async () => {
        await Promise.all([account.delete(), shop.delete(), user.delete(), product.delete(), sku.delete()])
    })
})
