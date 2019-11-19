import { Doc, Model, Field, FieldValue, Timestamp, DocumentReference } from '@1amageek/ballcap-admin'
import { SubscriptionProtocol, SubscriptionItemProtocol, SubscriptionItemBillingThresholds, SubscriptionBillingThresholds, SubscriptionCollectionMethod, Period, InvoiceCustomerBalanceSettings, Interval, SubscriptionStatus, TransactionResult } from '../../src'
import { } from "reflect-metadata";

export class SubscriptionItem extends Model implements SubscriptionItemProtocol {
	@Field subscribedBy!: string	
	@Field publishedBy!: string
	@Field createdBy!: string
	@Field productReference?: DocumentReference
	@Field planReference!: DocumentReference
	@Field billingThresholds?: SubscriptionItemBillingThresholds
	@Field prorate?: boolean
	@Field prorationDate?: number
	@Field quantity: number = 0
	@Field taxRates: number = 0
}

export class Subscription extends Doc implements SubscriptionProtocol<SubscriptionItem> {
	@Field subscribedBy!: string	
	@Field publishedBy!: string
	@Field createdBy!: string
	@Field applicationFeePercent: number = 0
	@Field billingCycleAnchor: Timestamp | FieldValue = FieldValue.serverTimestamp()
	@Field billingThresholds?: SubscriptionBillingThresholds
	@Field cancelAtPeriodEnd: boolean = false
	@Field canceledAt?: Timestamp
	@Field collectionMethod: SubscriptionCollectionMethod = SubscriptionCollectionMethod.chargeAutomatically
	@Field currentPeriod?: Period
	@Field daysUntilDue?: number
	@Field defaultPaymentMethod?: string
	@Field defaultSource?: string
	@Field defaultTaxRates?: number
	@Field discountReference?: DocumentReference
	@Field startDate?: Timestamp
	@Field endedAt?: Timestamp
	@Field invoiceCustomerBalanceSettings: InvoiceCustomerBalanceSettings = { consumeAppliedBalanceOnVoid: true }
	@Field items: SubscriptionItem[] = []
	@Field latestInvoice?: string
	@Field pendingInvoiceItemInterval?: Interval
	@Field status: SubscriptionStatus = SubscriptionStatus.incomplete
	@Field trial?: Period
	@Field transactionResults: TransactionResult[] = []
}