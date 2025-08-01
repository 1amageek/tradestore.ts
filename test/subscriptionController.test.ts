process.env.NODE_ENV = 'test'
import { initialize } from '@1amageek/ballcap-admin'
import * as admin from 'firebase-admin'
import * as Tradable from '../src/index'
import * as Config from './config'
// tslint:disable-next-line:no-implicit-dependencies
import Stripe from 'stripe'

import { User } from './models/user'
import { Product } from './models/product'
import { Plan } from './models/plan'
import { Subscription, SubscriptionItem } from './models/subscription'

import { SubscriptionController } from '../src/SubscriptionController'
import { StripePaymentDelegate } from './stripePaymentDelegate'

export const stripe = new Stripe(Config.STRIPE_API_KEY, {
	apiVersion: '2025-06-30.basil'
})
const secret = require("./secret.json")
const app = admin.initializeApp({
	credential: admin.credential.cert(secret)
})
initialize(app)

describe("SubscriptionController", () => {

	const user: User = new User()
	const product: Product = new Product()
	const plan0: Plan = new Plan(product.plans.collectionReference.doc())
	plan0.amount = 1000
	plan0.interval = Tradable.Interval.month
	plan0.intervalCount = 1
	plan0.productReference = product.documentReference
	const plan1: Plan = new Plan(product.plans.collectionReference.doc())
	plan1.amount = 1500
	plan1.interval = Tradable.Interval.month
	plan1.intervalCount = 1
	plan1.productReference = product.documentReference

	const controller: SubscriptionController<Plan, SubscriptionItem, Subscription, User> = new SubscriptionController(Subscription.self(), SubscriptionItem.model())
	controller.delegate = new StripePaymentDelegate()

	beforeAll(async () => {

		const productCreateOptions: Stripe.ProductCreateParams = {
			id: product.id,
			name: product.id
		}
		product.metadata = await stripe.products.create(productCreateOptions)
		const plan0CreateOptions: Stripe.PriceCreateParams = {
			unit_amount: plan0.amount,
			currency: Tradable.Currency.JPY,
			product: product.id,
			recurring: {
				interval: plan0.interval as Stripe.PriceCreateParams.Recurring.Interval,
				interval_count: plan0.intervalCount
			}
		}
		plan0.metadata = await stripe.prices.create(plan0CreateOptions)
		const plan1CreateOptions: Stripe.PriceCreateParams = {
			unit_amount: plan1.amount,
			currency: Tradable.Currency.JPY,
			product: product.id,
			recurring: {
				interval: plan1.interval as Stripe.PriceCreateParams.Recurring.Interval,
				interval_count: plan1.intervalCount
			}
		}
		plan1.metadata = await stripe.prices.create(plan1CreateOptions)
		await Promise.all([product.save(), plan0.save(), plan1.save(), user.save()])

	}, 10000)

	describe("Order Stress test", () => {
		test("Success", async () => {

			const subscriptionOptions: Tradable.SubscriptionOptions = {
				vendorType: "stripe",
				customer: Config.STRIPE_CUS_TOKEN
			}
			try {
				await controller.subscribe(user, [plan0, plan1], subscriptionOptions, async (subscription, option, transaction) => {
					const result: Stripe.Subscription = await controller.delegate!.subscribe(subscription, option)
					subscription.result = result
					console.info(result)
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
