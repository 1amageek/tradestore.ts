process.env.NODE_ENV = 'test'
import { initialize, Timestamp } from '@1amageek/ballcap-admin'
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
	const plan0: Plan = new Plan(product.plans.collectionReference.doc())
	plan0.interval = Tradable.Interval.month
	plan0.intervalCount = 1
	plan0.productReference = product.documentReference
	const plan1: Plan = new Plan(product.plans.collectionReference.doc())
	plan0.interval = Tradable.Interval.month
	plan1.intervalCount = 1
	plan1.productReference = product.documentReference

	const controller: SubscriptionController<Plan, SubscriptionItem, Subscription, User, User> = new SubscriptionController(Subscription.self(), SubscriptionItem.model())
	controller.delegate = new StripePaymentDelegate()

	beforeAll(async () => {

		const productCreateOptions: Stripe.products.IProductCreationOptions = {
			id: product.id,
			name: product.id,
			type: "service"
		}
		product.metadata = await stripe.products.create(productCreateOptions)
		const plan0CreateOptions: Stripe.plans.IPlanCreationOptions = {
			id: plan0.id,
			amount: 1000,
			currency: Tradable.Currency.JPY,
			interval: plan0.interval,
			interval_count: plan0.intervalCount,
			product: product.id,
		}
		plan0.metadata = await stripe.plans.create(plan0CreateOptions)
		const plan1CreateOptions: Stripe.plans.IPlanCreationOptions = {
			id: plan1.id,
			amount: 1500,
			currency: Tradable.Currency.JPY,
			interval: plan1.interval,
			interval_count: plan1.intervalCount,
			product: product.id,
		}
		plan0.metadata = await stripe.plans.create(plan1CreateOptions)
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
					const result: Stripe.subscriptions.ISubscription = await controller.delegate!.subscribe(subscription, option)
					subscription.result = result
					subscription.applicationFeePercent = result.application_fee_percent || undefined
					subscription.billingCycleAnchor = Timestamp.fromMillis(result.billing_cycle_anchor)
					subscription.billing = result.billing as Tradable.SubscriptionBilling
					subscription.billingThresholds = result.billing_thresholds ? { 
						amountGte: result.billing_thresholds.amount_gte, 
						resetBillingCycleAnchor: result.billing_thresholds.reset_billing_cycle_anchor 
					} : undefined
					subscription.canceledAt = result.cancel_at ? Timestamp.fromMillis(result.cancel_at) : undefined
					subscription.cancelAtPeriodEnd = result.cancel_at_period_end
					subscription.collectionMethod = result.collection_method as Tradable.SubscriptionBilling
					subscription.currentPeriod = {
						start: Timestamp.fromMillis(result.current_period_start),
						end: Timestamp.fromMillis(result.current_period_end)
					}
					subscription.daysUntilDue = result.days_until_due || undefined
					subscription.defaultPaymentMethod = result.default_payment_method || undefined
					subscription.defaultSource = result.default_source || undefined
					subscription.endedAt = result.ended_at ? Timestamp.fromMillis(result.ended_at) : undefined
					subscription.trial = result.trial_start && result.trial_end ? {
						start: Timestamp.fromMillis(result.trial_start),
						end: Timestamp.fromMillis(result.trial_end)
					} : undefined
					subscription.startDate = Timestamp.fromMillis(result.start)

					console.info(result.items)

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
