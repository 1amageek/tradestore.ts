

export type ShardType =
	"a" | "b" | "c" | "d" | "e" |
	"f" | "g" | "h" | "i" | "j" |
	"k" | "l" | "m" | "n" | "o" |
	"p" | "q" | "r" | "s" | "t" |
	"u" | "v" | "w" | "x" | "y" |
	"z"

export const ShardCharacters: ShardType[] = [
	"a", "b", "c", "d", "e",
	"f", "g", "h", "i", "j",
	"k", "l", "m", "n", "o",
	"p", "q", "r", "s", "t",
	"u", "v", "w", "x", "y",
	"z"
]

export const DafaultShardCharacters: ShardType[] = ShardCharacters.slice(0, 10)

export const randomShard = (seed: ShardType[]): ShardType => {
	return seed[Math.floor(Math.random() * Math.floor(seed.length))]
}

export type Balance = {
	pending: { [currency: string]: number }
	/// It is the amount that the user can withdraw.
	available: { [currency: string]: number }
}

export enum TradeTransactionType {
	unknown = 'unknown',
	order = 'order',
	orderChange = 'order_change',
	orderCancel = 'order_cancel',
	storage = 'storage',
	retrieval = 'retrieval'
}

export enum BalanceTransactionType {
	unknown = 'unknown',
	payment = 'payment',
	paymentRefund = 'payment_refund',
	transfer = 'transfer',
	transferRefund = 'transfer_refund',
	payout = 'payout',
	payoutCancel = 'payout_cancel'
}

export type TransactionResult = {
	[key: string]: any
}

export type AccountOrDestination = string | "platform" | "bank_account"

export enum StockType {
	bucket = 'bucket',
	finite = 'finite',
	infinite = 'infinite'
}

/// StockValue is used when StockType is Bucket.
export enum StockValue {
	inStock = 'in_stock',
	limited = 'limited',
	outOfStock = 'out_of_stock'
}

export type Inventory = {
	type: StockType
	quantity?: number
	value?: StockValue
}

export enum OrderItemType {
	sku = 'sku',
	tax = 'tax',
	shipping = 'shipping',
	discount = 'discount'
}

export enum OrderItemStatus {
	none = 'none',
	ordered = 'ordered',
	changed = 'changed',
	cancelled = 'cancelled'
}

export enum OrderTransferStatus {
	none = 'none',
	rejected = 'rejected',
	transferred = 'transferred',
	cancelled = 'cancelled',
	transferFailure = 'failure',
	cancelFailure = 'cancel_failure'
}

export enum OrderPaymentStatus {
	none = 'none',
	rejected = 'rejected',
	authorized = 'authorized',
	paid = 'paid',
	cancelled = 'cancelled',
	paymentFailure = 'failure',
	cancelFailure = 'cancel_failure'
}

export enum Interval {
	day = 'day',
	week = 'week',
	month = 'month',
	year = 'year'
}

export enum TiersMode {
	graduated = 'graduated',
	volume = 'volume'
}

export type Tier = {
	upTo: number
	flatAmount?: number
	unitAmount?: number
}

export type SubscriptionResult = {
	[key: string]: any
}

export enum SubscriptionBilling {
	chargeAutomatically = 'charge_automatically',
	sendInvoice = 'send_invoice'
}

export enum PayoutStatus {
	none = 'none',
	requested = 'requested',
	rejected = 'rejected',
	completed = 'completed',
	cancelled = 'cancelled'
}

export enum TransferStatus {
	none = 'none',
	requested = 'requested',
	rejected = 'rejected',
	completed = 'completed',
	cancelled = 'cancelled'
}
