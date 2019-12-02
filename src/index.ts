import { DocumentType, Collection, Timestamp, DocumentReference, Transaction, QuerySnapshot, ModelType } from '@1amageek/ballcap-admin'
import { ShardType, ShardCharacters, DafaultShardCharacters, randomShard, Balance, TradeTransactionType, BalanceTransactionType, AccountOrDestination, TransactionResult, SubscriptionResult, Inventory, OrderItemType, OrderItemStatus, OrderPaymentStatus, OrderTransferStatus, Interval, Tier, TiersMode, PayoutStatus, TransferStatus, StockType, StockValue } from './commonType'
import { Manager, ReserveResult, CheckoutResult, CheckoutChangeResult, CheckoutCancelResult, TransferResult, TransferCancelResult } from './Manager'
import { SubscriptionController } from './SubscriptionController'
import { Currency } from './Currency'
export { Currency, Manager, ReserveResult, CheckoutResult, CheckoutChangeResult, CheckoutCancelResult, TransferResult, TransferCancelResult, SubscriptionController }


export { ShardType, ShardCharacters, DafaultShardCharacters, randomShard, Balance, TradeTransactionType, BalanceTransactionType, AccountOrDestination, TransactionResult, SubscriptionResult, Inventory, OrderItemType, OrderItemStatus, OrderPaymentStatus, OrderTransferStatus, Interval, Tier, TiersMode, PayoutStatus, TransferStatus, StockType, StockValue }

/// UserProtocol is a protocol that the user must retain to make it tradeable.
export interface UserProtocol
	<
	Order extends OrderProtocol<OrderItem>,
	OrderItem extends OrderItemProtocol,
	TradeTransaction extends TradeTransactionProtocol
	> extends DocumentType {
	isAvailable: boolean
	country: string
	orders: Collection<Order>
	receivedOrders: Collection<Order>
	tradeTransactions: Collection<TradeTransaction>
}

export interface Tradable<
	Order extends OrderProtocol<OrderItem>,
	OrderItem extends OrderItemProtocol,
	TradeTransaction extends TradeTransactionProtocol,
	Subscription extends SubscriptionProtocol<SubscriptionItem>,
	SubscriptionItem extends SubscriptionItemProtocol>
	extends Orderable<Order, OrderItem, TradeTransaction>, OrderAcceptable<Order, OrderItem, TradeTransaction>, Subscribable<Subscription, SubscriptionItem> {
}

export interface Orderable
	<
	Order extends OrderProtocol<OrderItem>,
	OrderItem extends OrderItemProtocol,
	TradeTransaction extends TradeTransactionProtocol
	>
	extends DocumentType {
	orders: Collection<Order>
	tradeTransactions: Collection<TradeTransaction>
}

export interface OrderAcceptable
	<
	Order extends OrderProtocol<OrderItem>,
	OrderItem extends OrderItemProtocol,
	TradeTransaction extends TradeTransactionProtocol
	>
	extends DocumentType {
	receivedOrders: Collection<Order>
	tradeTransactions: Collection<TradeTransaction>
}

export interface Subscribable<Subscription extends SubscriptionProtocol<SubscriptionItem>, SubscriptionItem extends SubscriptionItemProtocol> extends DocumentType {
	subscriptions: Collection<Subscription>
}

export interface Publishable<Subscriber extends Subscribable<Subscription, SubscriptionItem>, Subscription extends SubscriptionProtocol<SubscriptionItem>, SubscriptionItem extends SubscriptionItemProtocol> extends DocumentType {
	subscribers: Collection<Subscriber>
}
/// AccountProtocol must have the same ID as UserProtocol.
/// AccountPtotocol holds information that can not be accessed except for principals with a protocol with a high security level.
export interface AccountProtocol<Transaction extends BalanceTransactionProtocol, Payout extends PayoutProtocol> extends DocumentType {
	country: string
	isRejected: boolean
	isSigned: boolean
	balance: Balance
	balanceTransactions: Collection<Transaction>
	payoutRequests: Collection<Payout>
	accountInformation: { [key: string]: any }
}

export interface TradeTransactionProtocol extends DocumentType {
	// Properties to improve scale performance
	shard: ShardType
	type: TradeTransactionType
	selledBy: string
	purchasedBy: string
	orderReference: DocumentReference
	productReference?: DocumentReference
	skuRefernece: DocumentReference
	stockReference?: DocumentReference
	itemReference: DocumentReference
}

/// Transaction is the history that changed Balance. Tranasaction is made from the ID of the event.
export interface BalanceTransactionProtocol extends DocumentType {
	// Properties to improve scale performance
	shard: ShardType
	type: BalanceTransactionType
	currency: Currency
	amount: number
	from: AccountOrDestination
	to: AccountOrDestination
	orderReference?: DocumentReference
	transferReference?: DocumentReference
	payoutReference?: DocumentReference
	transactionResults: TransactionResult[]
}

export interface StockProtocol extends DocumentType {
	isAvailable: boolean
	orderReference?: DocumentReference
	itemReference?: DocumentReference
}

// SKU
export interface SKUProtocol<Stock extends StockProtocol> extends DocumentType {
	selledBy: string
	createdBy: string
	productReference?: DocumentReference
	currency: Currency
	amount: number
	inventory: Inventory
	isAvailable: boolean

	/// Maximum number of fetches to acquire at one time
	numberOfFetch: number
	stocks: Collection<Stock>
}

// Discount
export type Discount = {
	start: Timestamp
	end: Timestamp
	subscriptionReference?: DocumentReference
}

// Order
export interface OrderItemProtocol extends ModelType {
	purchasedBy: string
	selledBy: string
	createdBy: string
	type: OrderItemType
	productReference?: DocumentReference
	skuReference?: DocumentReference
	quantity: number
	currency: Currency
	amount: number
	status: OrderItemStatus
}

export interface OrderProtocol<OrderItem extends OrderItemProtocol> extends DocumentType {
	// Properties to improve scale performance
	shard: ShardType
	parentID?: string
	purchasedBy: string
	selledBy: string
	shippingTo: { [key: string]: string }
	transferredTo: DocumentReference[]
	paidAt?: Timestamp
	cancelableDate?: Timestamp
	expirationDate?: Timestamp
	currency: Currency
	amount: number
	items: OrderItem[]
	paymentStatus: OrderPaymentStatus
	transferStatus: OrderTransferStatus
	transactionResults: TransactionResult[]
	isCancelled: boolean
}

export interface ItemProtocol {
	selledBy: string
	purchasedBy: string
	orderReference: DocumentReference
	productReference?: DocumentReference
	skuReference: DocumentReference
	stockReference?: DocumentReference
	isCancelled: boolean
}

// Subscription
export interface PlanProtocol<Subscription extends SubscriptionProtocol<SubscriptionItem>, SubscriptionItem extends SubscriptionItemProtocol> extends Subscribable<Subscription, SubscriptionItem> {
	publishedBy: string
	createdBy: string
	productReference?: DocumentReference
	currency: Currency
	amount: number
	interval: Interval
	intervalCount: number
	tiers?: Tier[]
	tiersMode?: TiersMode
	trialPeriodDays?: Timestamp
	isAvailable: boolean
}

export enum SubscriptionStatus {
	incomplete = 'incomplete',
	incompleteExpired = 'incomplete_expired',
	trialing = 'trialing',
	active = 'active',
	pastDue = 'past_due',
	canceled = 'canceled',
	unpaid = 'unpaid'
}

export type Period = {
	start: Timestamp
	end: Timestamp
}

export interface SubscriptionItemProtocol extends ModelType {
	subscribedBy: string
	publishedBy: string
	createdBy: string
	productReference?: DocumentReference
	planReference: DocumentReference
	quantity: number
	taxRates: number
	amount: number
	currency: Currency
}

export interface SubscriptionProtocol<SubscriptionItem extends SubscriptionItemProtocol> extends DocumentType {

	// Properties to improve scale performance
	shard: ShardType

	subscribedBy: string
	publishedBy: string
	createdBy: string
	items: SubscriptionItem[]
	status: SubscriptionStatus
	interval: Interval
	intervalCount: number

	// The timestamp that started the subscription
	startAt: Timestamp

	// Unsubscribed timestamp
	canceledAt?: Timestamp

	// You can use this attribute to determine whether a subscription that has a status of active is scheduled to be canceled at the end of the current period .
	cancelAtPeriodEnd: boolean

	// If the subscription has ended, the date the subscription ended.
	endedAt?: Timestamp

	// Trial period
	trial?: Period
}

// Payout
export interface PayoutProtocol extends DocumentType {
	account: string
	currency: Currency
	amount: number
	status: PayoutStatus
	transactionResults: TransactionResult[]
	isCancelled: boolean
}

export interface TransferProtocol extends DocumentType {
	// Properties to improve scale performance
	shard: ShardType
	account: string
	currency: Currency
	amount: number
	status: TransferStatus
	transactionResults: TransactionResult[]
	isCancelled: boolean
}

export type ShppingInformation = {
	address: {
		line1: string
		line2?: string
		city?: string
		state?: string
		postal_code?: string
		country?: string
	}
	name: string
	carrier?: string
	phone?: string
	tracking_number?: string
}

export type PaymentOptions = {
	source?: string
	customer?: string
	shipping?: ShppingInformation
	vendorType: string
	numberOfShards?: number
	refundFeeRate: number   // 0 ~ 1
	reason?: RefundReason
	metadata?: any
}

export type SubscriptionOptions = {
	customer: string,
	vendorType: string
	metadata?: any
}

export enum RefundReason {
	duplicate = 'duplicate',
	fraudulent = 'fraudulent',
	requestedByCustomer = 'requested_by_customer'
}

export type TransferOptions = {
	vendorType: string
	transferRate: number // 0 ~ 1
}

export type PayoutOptions = {
	vendorType: string
}

export interface TradeDelegate {

	reserve<OrderItem extends OrderItemProtocol, Order extends OrderProtocol<OrderItem>>(order: Order, orderItem: OrderItem, transaction: Transaction): void

	createItem<T extends OrderItemProtocol, U extends OrderProtocol<T>>(order: U, orderItem: T, stockReference: DocumentReference | undefined, transaction: Transaction): DocumentReference

	getItems<T extends OrderItemProtocol, U extends OrderProtocol<T>>(order: U, orderItem: T, transaction: Transaction): Promise<QuerySnapshot>

	cancelItem<T extends OrderItemProtocol, U extends OrderProtocol<T>>(order: U, orderItem: T, itemReference: DocumentReference, transaction: Transaction): void
}

export interface PaymentDelegate {

	authorize<U extends OrderItemProtocol, T extends OrderProtocol<U>>(currency: Currency, amount: number, order: T, options: PaymentOptions): Promise<any>

	authorizeCancel<U extends OrderItemProtocol, T extends OrderProtocol<U>>(currency: Currency, amount: number, order: T, options: PaymentOptions): Promise<any>

	charge<U extends OrderItemProtocol, T extends OrderProtocol<U>>(currency: Currency, amount: number, order: T, options: PaymentOptions): Promise<any>

	refund<U extends OrderItemProtocol, T extends OrderProtocol<U>>(currency: Currency, amount: number, order: T, options: PaymentOptions, reason?: string): Promise<any>

	partRefund<U extends OrderItemProtocol, T extends OrderProtocol<U>>(currency: Currency, amount: number, order: T, orderItem: U, options: PaymentOptions, reason?: string): Promise<any>

	subscribe<U extends SubscriptionItemProtocol, T extends SubscriptionProtocol<U>>(subscription: T, options: SubscriptionOptions): Promise<any>

	transfer<OrderItem extends OrderItemProtocol, Order extends OrderProtocol<OrderItem>,
		BalanceTransaction extends BalanceTransactionProtocol,
		Payout extends PayoutProtocol,
		Account extends AccountProtocol<BalanceTransaction, Payout>>(currency: Currency, amount: number, order: Order, toAccount: Account, options: TransferOptions): Promise<any>

	transferCancel<U extends OrderItemProtocol, T extends OrderProtocol<U>>(currency: Currency, amount: number, order: T, options: TransferOptions, reason?: string): Promise<any>

	payout(currency: Currency, amount: number, accountID: string, options: PayoutOptions): Promise<any>

	payoutCancel(currency: Currency, amount: number, accountID: string, options: PayoutOptions): Promise<any>

}

export enum TradestoreErrorCode {
	invalidArgument = 'invalidArgument',
	lessMinimumAmount = 'lessMinimumAmount',
	invalidCurrency = 'invalidCurrency',
	invalidAmount = 'invalidAmount',
	invalidShard = 'invalidShard',
	outOfStock = 'outOfStock',
	invalidStatus = 'invalidStatus',
	internal = 'internal'
}

export class TradestoreError extends Error {
	constructor(public code: TradestoreErrorCode, message: string) {
		super(message);
		Object.setPrototypeOf(this, TradestoreError.prototype);
	}
}
