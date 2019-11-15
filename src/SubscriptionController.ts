import { firestore, DocumentReference, Transaction, Documentable } from '@1amageek/ballcap-admin'
import { StockManager } from './StockManager'
import { BalanceManager } from './BalanceManager'
import { OrderManager } from './OrderManager'
import { PayoutManager } from './PayoutManager'

import {
	PlanProtocol,
	SubscriptionItemProtocol,
	SubscriptionProtocol,
	Subscribable
} from "./index"

export class SubscriptionController
    <
    Plan extends PlanProtocol,
    SubscriptionItem extends SubscriptionItemProtocol,
	Subscription extends SubscriptionProtocol<SubscriptionItem>,
	Subscriber extends Subscribable<Subscription, SubscriptionItem>
    > {

    private _Plan: Documentable<Plan>
    private _Subscription: Documentable<Subscription>
    private _Subscriber: Documentable<Subscriber>

    // public stockManager: StockManager<Order, OrderItem, User, InventoryStock, SKU, TradeTransaction>

    // public balanceManager: BalanceManager<BalanceTransaction, Payout, Account>

    // public orderManager: OrderManager<Order, OrderItem, User, TradeTransaction>

    // public payoutManager: PayoutManager<BalanceTransaction, Payout, Account>

    // public delegate?: PaymentDelegate

    // public tradeDelegate?: TradeDelegate

    constructor(
		plan: Documentable<Plan>,
		subscription: Documentable<Subscription>,
		subscriber: Documentable<Subscriber>
    ) {
        this._Plan = plan
        this._Subscription = subscription
        this._Subscriber = subscriber
	}

	public async subscribe(plans: Plan[]) {
		const subscription: Subscription = this._Subscription.init()
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