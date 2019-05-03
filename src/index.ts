import { DocumentType, DataRepresentable, Collection, File, Timestamp, DocumentReference, Transaction, QuerySnapshot } from '@1amageek/ballcap-admin'
import { Manager, ReserveResult, CheckoutResult, CheckoutChangeResult, CheckoutCancelResult, TransferResult, TransferCancelResult } from './Manager'
import { Currency } from './Currency'
export { Currency, Manager, ReserveResult, CheckoutResult, CheckoutChangeResult, CheckoutCancelResult, TransferResult, TransferCancelResult }


/// UserProtocol is a protocol that the user must retain to make it tradeable.
export interface UserProtocol
    <
    Order extends OrderProtocol<OrderItem>,
    OrderItem extends OrderItemProtocol,
    TradeTransaction extends TradeTransactionProtocol
    > extends DocumentType {
    isAvailabled: boolean
    country: string
    orders: Collection<Order>
    receivedOrders: Collection<Order>
    tradeTransactions: Collection<TradeTransaction>
}

export type Balance = {

    pending: { [currency: string]: number }

    /// It is the amount that the user can withdraw.
    available: { [currency: string]: number }
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

export enum TradeTransactionType {
    unknown = 'unknown',
    order = 'order',
    orderChange = 'order_change',
    orderCancel = 'order_cancel',
    storage = 'storage',
    retrieval = 'retrieval'
}

export interface TradeTransactionProtocol extends DocumentType {
    type: TradeTransactionType
    selledBy: string
    purchasedBy: string
    orderReference: DocumentReference
    productReference?: DocumentReference
    skuRefernece: DocumentReference
    stockReference?: DocumentReference
    itemReference: DocumentReference
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

/// Transaction is the history that changed Balance. Tranasaction is made from the ID of the event.
export interface BalanceTransactionProtocol extends DocumentType {
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

export interface StockProtocol extends DocumentType {
    isAvailabled: boolean
    order?: string
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
    isAvailabled: boolean

    /// Maximum number of fetches to acquire at one time
    numberOfFetch: number
    stocks: Collection<Stock>
}

// Order

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

export interface OrderItemProtocol extends DataRepresentable {
    name?: string
    thumbnailImage?: File
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
    orderReference: DocumentReference
    selledBy: string
    purchasedBy: string
    productReference?: DocumentReference
    skuReference: DocumentReference
    stockReference?: DocumentReference
    isCancelled: boolean
}

export enum PayoutStatus {

    none = 'none',

    requested = 'requested',

    rejected = 'rejected',

    completed = 'completed',

    cancelled = 'cancelled'
}

export interface PayoutProtocol extends DocumentType {
    account: string
    currency: Currency
    amount: number
    status: PayoutStatus
    transactionResults: TransactionResult[]
    isCancelled: boolean
}

export enum TransferStatus {

    none = 'none',

    requested = 'requested',

    rejected = 'rejected',

    completed = 'completed',

    cancelled = 'cancelled'
}

export interface TransferProtocol extends DocumentType {
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

    pay<U extends OrderItemProtocol, T extends OrderProtocol<U>>(currency: Currency, amount: number, order: T, options: PaymentOptions): Promise<any>

    refund<U extends OrderItemProtocol, T extends OrderProtocol<U>>(currency: Currency, amount: number, order: T, options: PaymentOptions, reason?: string): Promise<any>

    partRefund<U extends OrderItemProtocol, T extends OrderProtocol<U>>(currency: Currency, amount: number, order: T, orderItem: U, options: PaymentOptions, reason?: string): Promise<any>

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

export class TradestoreError implements Error {
    name: string
    message: string
    stack?: string
    info: { [key: string]: any }

    constructor(code: TradestoreErrorCode, message: string, stack?: string) {
        this.name = 'tradable.error'
        this.info = {
            code: code,
        }
        this.message = message
        // this.stack = stack || new Error().stack
    }
}
