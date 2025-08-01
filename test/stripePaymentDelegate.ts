import * as tradable from '../src/index'
// tslint:disable-next-line:no-implicit-dependencies
import Stripe from 'stripe'
import * as Config from './config'

export const stripe = new Stripe(Config.STRIPE_API_KEY, {
	apiVersion: '2025-06-30.basil'
})

export class StripePaymentDelegate implements tradable.PaymentDelegate {

	async authorize<U extends tradable.OrderItemProtocol, T extends tradable.OrderProtocol<U>>(currency: tradable.Currency, amount: number, order: T, options: tradable.PaymentOptions) {
		const idempotency_key = order.id
		const data: Stripe.ChargeCreateParams = {
			amount: order.amount,
			currency: order.currency,
			capture: false,
			description: `Charge for user/${order.purchasedBy}`
		}

		if (options) {
			if (options.customer) {
				data.customer = options.customer
			}
			if (options.source) {
				data.source = options.source
			}
		}
		data.customer = Config.STRIPE_CUS_TOKEN
		data.source = Config.STRIPE_CORD_TOKEN

		try {
			const charge = await stripe.charges.create(data, {
				idempotencyKey: idempotency_key
			})
			return charge
		} catch (error) {
			console.log(error)
			throw error
		}
	}

	async authorizeCancel<U extends tradable.OrderItemProtocol, T extends tradable.OrderProtocol<U>>(currency: tradable.Currency, amount: number, order: T, options: tradable.PaymentOptions) {
		return {}
	}

	async charge<U extends tradable.OrderItemProtocol, T extends tradable.OrderProtocol<U>>(currency: tradable.Currency, amount: number, order: T, options: tradable.PaymentOptions) {
		const idempotency_key = order.id
		const data: Stripe.ChargeCreateParams = {
			amount: order.amount,
			currency: order.currency,
			description: `Charge for user/${order.purchasedBy}`
		}

		if (options) {
			if (options.customer) {
				data.customer = options.customer
			}
			if (options.source) {
				data.source = options.source
			}
		}
		data.customer = Config.STRIPE_CUS_TOKEN
		data.source = Config.STRIPE_CORD_TOKEN

		try {
			const charge = await stripe.charges.create(data, {
				idempotencyKey: idempotency_key
			})
			return charge
		} catch (error) {
			console.log(error)
			throw error
		}
	}

	async refund<U extends tradable.OrderItemProtocol, T extends tradable.OrderProtocol<U>>(currency: tradable.Currency, amount: number, order: T, options: tradable.PaymentOptions, reason?: string | undefined) {
		const transactionResults = order.transactionResults
		const transactionResult = transactionResults[transactionResults.length - 1]
		const stripeCharge = transactionResult["stripe"] as Stripe.Charge
		const charegeID = stripeCharge.id
		const idempotency_key = `refund:${order.id}`

		let data: Stripe.RefundCreateParams = {}
		data.amount = amount
		if (reason) {
			data.reason = reason as Stripe.RefundCreateParams.Reason
		}

		try {
			return await stripe.refunds.create({
				charge: charegeID,
				...data
			}, {
				idempotencyKey: idempotency_key
			})
		} catch (error) {
			throw error
		}
	}

	async partRefund<U extends tradable.OrderItemProtocol, T extends tradable.OrderProtocol<U>>(currency: tradable.Currency, amount: number, order: T, orderItem: U, options: tradable.PaymentOptions, reason?: string | undefined) {
		const transactionResults = order.transactionResults
		const transactionResult = transactionResults[transactionResults.length - 1]

		const stripeCharge = transactionResult["stripe"] as Stripe.Charge
		const charegeID = stripeCharge.id
		const idempotency_key = `refund:${orderItem}`

		let data: Stripe.RefundCreateParams = {}
		data.amount = amount
		if (reason) {
			data.reason = reason as Stripe.RefundCreateParams.Reason
		}

		try {
			return await stripe.refunds.create({
				charge: charegeID,
				...data
			}, {
				idempotencyKey: idempotency_key
			})
		} catch (error) {
			throw error
		}
	}
	async transfer<OrderItem extends tradable.OrderItemProtocol,
		Order extends tradable.OrderProtocol<OrderItem>,
		BalanceTransaction extends tradable.BalanceTransactionProtocol,
		Payout extends tradable.PayoutProtocol,
		Account extends tradable.AccountProtocol<BalanceTransaction, Payout>>
		(currency: tradable.Currency, amount: number, order: Order, toAccount: Account, options: tradable.TransferOptions) {
		const idempotency_key = order.id
		const destination = toAccount.accountInformation['stripe']['id']
		const data: Stripe.TransferCreateParams = {
			amount: order.amount,
			currency: order.currency,
			transfer_group: order.id,
			destination: destination
		}

		try {
			const transfer = await stripe.transfers.create(data, {
				idempotencyKey: idempotency_key
			})
			return transfer
		} catch (error) {
			console.log(error)
			throw error
		}
	}

	async transferCancel<U extends tradable.OrderItemProtocol, T extends tradable.OrderProtocol<U>>(currency: tradable.Currency, amount: number, order: T, options: tradable.TransferOptions, reason?: string | undefined) {
		throw new Error("Method not implemented.");
	}

	async payout(currency: tradable.Currency, amount: number, accountID: string, options: tradable.PayoutOptions) {
		throw new Error("Method not implemented.");
	}

	async payoutCancel(currency: tradable.Currency, amount: number, accountID: string, options: tradable.PayoutOptions) {
		throw new Error("Method not implemented.");
	}

	async subscribe<U extends tradable.SubscriptionItemProtocol, T extends tradable.SubscriptionProtocol<U>>(subscription: T, options: tradable.SubscriptionOptions): Promise<any> {
		if (!options.customer) {
			throw new Error("")
		}
		const customer: string = options.customer

		const data: Stripe.SubscriptionCreateParams = {
			customer: customer,
			trial_from_plan: true
		}

		data.items = subscription.items.map(item => {
			return {
				price: item.planReference.id,
				quantity: item.quantity
			}
		})

		if (options.metadata) {
			data.metadata = options.metadata
		}
		return await stripe.subscriptions.create(data)
	}


	// async payment<U extends tradable.OrderItemProtocol, T extends tradable.OrderProtocol<U>>(currency: tradable.Currency, amount: number, order: T, options: tradable.PaymentOptions): Promise<any> {

	//     const idempotency_key = order.id
	//     const data: Stripe.charges.IChargeCreationOptions = {
	//         amount: order.amount,
	//         currency: order.currency,
	//         description: `Charge for user/${order.purchasedBy}`
	//     }

	//     if (options) {
	//         if (options.customer) {
	//             data.customer = options.customer
	//         }
	//         if (options.source) {
	//             data.source = options.source
	//         }
	//     }

	//     try {
	//         const charge = await stripe.charges.create(data, {
	//             idempotency_key: idempotency_key
	//         })
	//         return charge
	//     } catch (error) {
	//         throw error
	//     }
	// }

	// async refund<U extends tradable.OrderItemProtocol, T extends tradable.OrderProtocol<U>>(currency: tradable.Currency, amount: number, order: T, options: tradable.PaymentOptions, reason?: string): Promise<any> {

	//     const charegeID = ""
	//     const idempotency_key = `refund:${order.id}`

	//     let data: Stripe.refunds.IRefundCreationOptions = {}

	//     if (reason) {
	//         data.reason = reason
	//     }

	//     try {
	//         const result = await stripe.charges.refund(charegeID, data, {
	//             idempotency_key: idempotency_key
	//         })
	//         return result
	//     } catch (error) {
	//         throw error
	//     }
	// }

	// async transfer<U extends tradable.OrderItemProtocol, T extends tradable.OrderProtocol<U>>(currency: tradable.Currency, amount: number, order: T, options: tradable.TransferOptions): Promise<any> {

	//     const charegeID = order.paymentInformation[options.vendorType]['id']
	//     const idempotency_key = `refund:${order.id}`

	//     let data: Stripe.refunds.IRefundCreationOptions = {
	//         amount: amount
	//     }

	//     if (options.reason) {
	//         data.reason = options.reason
	//     }

	//     try {
	//         const result = await stripe.charges.refund(charegeID, data, {
	//             idempotency_key: idempotency_key
	//         })
	//         return result
	//     } catch (error) {
	//         throw error
	//     }
	// }

	// async transferCancel<U extends tradable.OrderItemProtocol, T extends tradable.OrderProtocol<U>>(currency: tradable.Currency, amount: number, order: T, options?: tradable.TransferOptions): Promise<any> {
	//     try {
	//         return {}
	//     } catch (error) {
	//         throw error
	//     }
	// }

	// async payout(currency: tradable.Currency, amount: number, accountID: string, options: tradable.PayoutOptions) {

	// }

	// async payoutCancel(currency: tradable.Currency, amount: number, accountID: string, options: tradable.PayoutOptions) {

	// }


}
