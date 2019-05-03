import { firestore, DocumentReference, Transaction, Documentable } from '@1amageek/ballcap-admin'
import { StockManager } from './StockManager'
import { BalanceManager } from './BalanceManager'
import { OrderManager } from './OrderManager'
import { PayoutManager } from './PayoutManager'

import {
    SKUProtocol,
    OrderItemProtocol,
    OrderProtocol,
    TradeTransactionProtocol,
    BalanceTransactionProtocol,
    AccountProtocol,
    TradestoreErrorCode,
    TradestoreError,
    UserProtocol,
    PaymentDelegate,
    TradeDelegate,
    StockProtocol,
    PayoutProtocol
} from "./index"

export type ReserveResult = {
    authorizeResult?: any
}

export type ReserveCancelResult = {
    authorizeCancelResult?: any
}

export type TradeResult<T extends TradeTransactionProtocol> = {
    tradeTransactions: T[][]
}

export type CaptureResult = {
    balanceTransaction?: BalanceTransactionProtocol
    paymentResult?: any
    refundResult?: any
}

export type CheckoutResult<T extends TradeTransactionProtocol> = {
    balanceTransaction?: BalanceTransactionProtocol
    tradeTransactions: T[][]
    paymentResult?: any
    refundResult?: any
}

export type CheckoutChangeResult<T extends TradeTransactionProtocol> = {
    balanceTransaction?: BalanceTransactionProtocol
    tradeTransactions: T[][]
    refundResult: any
}

export type CheckoutCancelResult<T extends TradeTransactionProtocol> = {
    balanceTransaction?: BalanceTransactionProtocol
    tradeTransactions: T[]
    refundResult: any
}

export type TransferResult = {
    balanceTransaction?: BalanceTransactionProtocol
    transferResult?: any
    transferCancelResult?: any
}

export type TransferCancelResult = {
    balanceTransaction?: BalanceTransactionProtocol
    transferCancelResult?: any
}

export type PayoutResult = {
    balanceTransaction?: BalanceTransactionProtocol
    payoutResult?: any
}

export class Manager
    <
    InventoryStock extends StockProtocol,
    SKU extends SKUProtocol<InventoryStock>,
    OrderItem extends OrderItemProtocol,
    Order extends OrderProtocol<OrderItem>,
    TradeTransaction extends TradeTransactionProtocol,
    BalanceTransaction extends BalanceTransactionProtocol,
    Payout extends PayoutProtocol,
    User extends UserProtocol<Order, OrderItem, TradeTransaction>,
    Account extends AccountProtocol<BalanceTransaction, Payout>
    > {

    private _InventoryStock: Documentable<InventoryStock>
    private _SKU: Documentable<SKU>
    private _Order: Documentable<Order>
    private _TradeTransaction: Documentable<TradeTransaction>
    private _BalanceTransaction: Documentable<BalanceTransaction>
    private _User: Documentable<User>
    private _Account: Documentable<Account>

    public stockManager: StockManager<Order, OrderItem, User, InventoryStock, SKU, TradeTransaction>

    public balanceManager: BalanceManager<BalanceTransaction, Payout, Account>

    public orderManager: OrderManager<Order, OrderItem, User, TradeTransaction>

    public payoutManager: PayoutManager<BalanceTransaction, Payout, Account>

    public delegate?: PaymentDelegate

    public tradeDelegate?: TradeDelegate

    constructor(
        inventoryStock: Documentable<InventoryStock>,
        sku: Documentable<SKU>,
        order: Documentable<Order>,
        tradeTransaction: Documentable<TradeTransaction>,
        balanceTransaction: Documentable<BalanceTransaction>,
        user: Documentable<User>,
        account: Documentable<Account>
    ) {
        this._InventoryStock = inventoryStock
        this._SKU = sku
        this._Order = order
        this._TradeTransaction = tradeTransaction
        this._BalanceTransaction = balanceTransaction
        this._User = user
        this._Account = account

        this.stockManager = new StockManager(this._User, this._InventoryStock, this._SKU, this._TradeTransaction)
        this.balanceManager = new BalanceManager(this._BalanceTransaction, this._Account)
        this.orderManager = new OrderManager(this._User)
        this.payoutManager = new PayoutManager(this._Account)
    }

    public async runTransaction(documentReference: DocumentReference, option: any, block: (order: Order, option: any, transaction: Transaction) => Promise<any>) {

        const delegate: PaymentDelegate | undefined = this.delegate
        if (!delegate) {
            throw new TradestoreError(TradestoreErrorCode.invalidArgument, `[Manager] Invalid order ${documentReference.path}, Manager required delegate.`)
        }
        const tradeDelegate: TradeDelegate | undefined = this.tradeDelegate
        if (!tradeDelegate) {
            throw new TradestoreError(TradestoreErrorCode.invalidArgument, `[Manager] Invalid order ${documentReference.path}, Manager required trade delegate.`)
        }
        this.stockManager.delegate = tradeDelegate
        try {
            return await firestore.runTransaction(async (transaction) => {
                const orderSnapshot = await transaction.get(documentReference)
                const order: Order = this._Order.fromSnapshot(orderSnapshot)
                return await block(order, option, transaction)
            })
        } catch (error) {
            throw error
        }
    }
}

