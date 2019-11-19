process.env.NODE_ENV = 'test'
import { initialize } from '@1amageek/ballcap-admin'
import * as admin from 'firebase-admin'
import * as Tradable from '../src/index'
import * as Config from './config'
// tslint:disable-next-line:no-implicit-dependencies
import * as Stripe from 'stripe'

import { User } from './models/user'
import { Product } from './models/product'
import { Plan } from './models/Plan'
import { Subscription, SubscriptionItem } from './models/subscription'

import { SubscriptionController } from '../src/SubscriptionController'
import { StripePaymentDelegate } from './stripePaymentDelegate'

export const stripe = new Stripe(Config.STRIPE_API_KEY)
const secret = require("./secret.json")
const app = admin.initializeApp({
	credential: admin.credential.cert(secret)
})
initialize(app.firestore())

describe("SubscriptionController", () => {

	const user: User = new User()
	const product: Product = new Product()
	const plan: Plan = new Plan(product.plans.collectionReference.doc())

	const controller: SubscriptionController<Plan, SubscriptionItem, Subscription, User, User> = new SubscriptionController(Subscription.self(), SubscriptionItem.model())
	controller.delegate = new StripePaymentDelegate()

	beforeAll(async () => {

		const productCreateOptions: Stripe.products.IProductCreationOptions = {
			id: product.id,
			name: product.id,
			type: "service"
		}
		product.metadata = await stripe.products.create(productCreateOptions)
		const planCreateOptions: Stripe.plans.IPlanCreationOptions = {
			id: plan.id,
			amount: 1000,
			currency: Tradable.Currency.JPY,
			interval: "month",
			interval_count: 1,
			product: product.id,

		}
		plan.metadata = await stripe.plans.create(planCreateOptions)
		await Promise.all([product.save(), plan.save(), user.save()])
		
	}, 10000)

	describe("Order Stress test", () => {
		test("Success", async () => {

			const subscriptionOptions: Tradable.SubscriptionOptions = {
				vendorType: "stripe",
				customer: Config.STRIPE_CUS_TOKEN
			}
			try {
				await controller.subscribe(user, [plan], subscriptionOptions, async (subscription, option, transaction) => {
					const subscribeResult = await controller.delegate!.subscribe(subscription, option)
					subscription.transactionResults.push({ [option.vendorType]: subscribeResult })
					return subscription
				})
			} catch (error) {
				console.log(error)
			}

		}, 15000)
	})

	afterAll(async () => {
		// await Promise.all([user.delete(), product.delete(), plan.delete()])
		app.delete()
	})
})
