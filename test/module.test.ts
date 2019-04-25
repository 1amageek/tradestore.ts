import * as admin from 'firebase-admin'
// tslint:disable-next-line:no-implicit-dependencies
// import * as Stripe from 'stripe'
// import * as Config from './config'
// import { Documentable, initialize, firestore } from '@1amageek/ballcap-admin' 
// import { TradeTransactionProtocol } from '../src';

// import * as ballcap from '@1amageek/ballcap-admin'

// export const stripe = new Stripe(Config.STRIPE_API_KEY)
const secret = require("./secret.json")
const app = admin.initializeApp({
    credential: admin.credential.cert(secret)
})
// ballcap.initialize(app.firestore())

// ballcap.initialize(app.firestore())

// // import { User } from './models/user'
// // import { Product } from './models/product'
// // import { InventoryStock } from './models/inventoryStock'
// // import { SKU } from './models/sku'
// // import { Order } from './models/order'
// // import { OrderItem } from './models/orderItem'
// // import { Account } from './models/account'
// // import { BalanceManager } from '../src/BalanceManager';
// // import { BalanceTransaction } from './models/BalanceTransaction';
// // import { Payout } from './models/payout';
// import { TradeTransaction } from './models/TradeTransaction';

// export class Manager<T extends TradeTransactionProtocol> {

// 	_transaction: Documentable<T>

//     constructor(
//         transaction: Documentable<T>
//     ) {
//         this._transaction = transaction
// 	}
	
// 	go() {
// 		const transaction: T = this._transaction.init()
// 		return transaction
// 	}
// }

// class Moc extends ballcap.Doc {
	
// }

describe("Manager", () => {
	describe("go", () => {		
        test("Success", async (done) => {

			// const moc: Moc = new Moc()

			// await moc.save()

			await app.firestore().doc("a/a").set({
				"g": "a"
			})

			// const manager: Manager<TradeTransaction> = new Manager(TradeTransaction.self())
			// const transaction: TradeTransaction = manager.go()

			// console.log(transaction)

			// const t: TradeTransaction = new TradeTransaction()

			// console.log(t)

			// await transaction.fetch(undefined)
			// await transaction.save()

			// const moc: Moc = new Moc()

			// await moc.documentReference.set({foo: "bar"})

			// const b = await t.documentReference.get()
			// console.log(b)
			// const snapshot = await transaction.documentReference.get()
			// console.log(snapshot)
			done()
		}, 10000)
	})
})