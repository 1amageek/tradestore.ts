import { Doc, Field, Collection, SubCollection } from '@1amageek/ballcap-admin'
import { SubscriptionProtocol, SubscriptionItemProtocol, SubscriptionItemBillingThresholds, SubscriptionBillingThresholds, SubscriptionCollectionMethod, Period, InvoiceCustomerBalanceSettings, Interval, SubscriptionStatus } from '../../src'
import { Order } from './order'
import { OrderItem } from './orderItem'
import { TradeTransaction } from './tradeTransaction'
import { Item } from './item'
import { } from "reflect-metadata";

export class SubscriptionItem extends Doc implements SubscriptionItemProtocol {
	@Field purchasedBy!: string	
	@Field selledBy!: string
	@Field createdBy!: string
	@Field productReference?: FirebaseFirestore.DocumentReference
	@Field planReference!: FirebaseFirestore.DocumentReference
	@Field billingThresholds?: SubscriptionItemBillingThresholds
	@Field prorate?: boolean
	@Field prorationDate?: number
	@Field quantity: number = 0
	@Field taxRates: number = 0
}

export class Subscription extends Doc implements SubscriptionProtocol<SubscriptionItem> {
	@Field purchasedBy!: string	
	@Field selledBy!: string
	@Field applicationFeePercent: number
	@Field billingCycleAnchor: FirebaseFirestore.Timestamp
	@Field billingThresholds: SubscriptionBillingThresholds
	@Field cancelAtPeriodEnd: boolean
	@Field canceledAt?: FirebaseFirestore.Timestamp
	@Field collectionMethod: SubscriptionCollectionMethod
	@Field currentPeriod?: Period
	@Field daysUntilDue?: number
	@Field defaultPaymentMethod?: string
	@Field defaultSource?: string
	@Field defaultTaxRates?: number
	@Field discountReference?: FirebaseFirestore.DocumentReference
	@Field startDate?: FirebaseFirestore.Timestamp
	@Field endedAt?: FirebaseFirestore.Timestamp
	@Field invoiceCustomerBalanceSettings: InvoiceCustomerBalanceSettings
	@Field items: SubscriptionItem[]
	@Field latestInvoice?: string
	@Field pendingInvoiceItemInterval?: Interval
	@Field status: SubscriptionStatus = SubscriptionStatus.incomplete
	@Field trial?: Period
}