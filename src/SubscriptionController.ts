import { firestore, Transaction, Documentable, Modelable } from '@1amageek/ballcap-admin'
// import { StockManager } from './StockManager'
// import { BalanceManager } from './BalanceManager'
// import { OrderManager } from './OrderManager'
// import { PayoutManager } from './PayoutManager'

import {
    SubscriptionOptions,
    PlanProtocol,
    SubscriptionItemProtocol,
    SubscriptionProtocol,
    Subscribable,
    Publishable,
    PaymentDelegate,
    TradestoreErrorCode,
    TradestoreError
} from "./index"

export class SubscriptionController
    <
    Plan extends PlanProtocol<Subscription, SubscriptionItem>,
    SubscriptionItem extends SubscriptionItemProtocol,
    Subscription extends SubscriptionProtocol<SubscriptionItem>,
    Subscriber extends Subscribable<Subscription, SubscriptionItem>,
    Publisher extends Publishable<Subscriber, Subscription, SubscriptionItem>
    > {


    private _Subscription: Documentable<Subscription>
    private _SubscriptionItem: Modelable<SubscriptionItem>

    public delegate?: PaymentDelegate

    constructor(
        subscription: Documentable<Subscription>,
        subscriptionItem: Modelable<SubscriptionItem>,
    ) {
        this._Subscription = subscription
        this._SubscriptionItem = subscriptionItem
    }

    public async subscribe(subscriber: Subscriber, plans: Plan[], option: Partial<SubscriptionOptions>, block: (subscription: Subscription, option: any, transaction: Transaction) => Promise<Subscription>) {

        const delegate: PaymentDelegate | undefined = this.delegate
        if (!delegate) {
            throw new TradestoreError(TradestoreErrorCode.invalidArgument, `[SubscriptionController] Invalid subscribe. Manager required delegate. Plans: [${plans.map(plan => plan.id)}]`)
        }

        const intervals: string[] = plans.reduce<string[]>((prev, current) => {
            if (!prev.includes(current.interval)) {
                prev.push(current.interval)
            }
            return prev
        }, [])

        if (intervals.length === 0) {
            throw new TradestoreError(TradestoreErrorCode.invalidArgument, `[SubscriptionController] Invalid plans. interval fields must match across all plans on this subscription. Plans: [${plans.map(plan => plan.id)}]`)
        }

        if (intervals.length > 1) {
            throw new TradestoreError(TradestoreErrorCode.invalidArgument, `[SubscriptionController] Invalid plans. interval fields must match across all plans on this subscription. Plans: [${plans.map(plan => plan.id)}]`)
        }

        const intervalCounts: number[] = plans.reduce<number[]>((prev, current) => {
            if (!prev.includes(current.intervalCount)) {
                prev.push(current.intervalCount)
            }
            return prev
        }, [])

        if (intervalCounts.length === 0) {
            throw new TradestoreError(TradestoreErrorCode.invalidArgument, `[SubscriptionController] Invalid plans. interval fields must match across all plans on this subscription. Plans: [${plans.map(plan => plan.id)}]`)
        }

        if (intervalCounts.length > 1) {
            throw new TradestoreError(TradestoreErrorCode.invalidArgument, `[SubscriptionController] Invalid plans. interval fields must match across all plans on this subscription. Plans: [${plans.map(plan => plan.id)}]`)
        }

        const publisherIDs: string[] = plans.reduce<string[]>((prev, current) => {
            if (!prev.includes(current.publishedBy)) {
                prev.push(current.publishedBy)
            }
            return prev
        }, [])

        if (publisherIDs.length === 0) {
            throw new TradestoreError(TradestoreErrorCode.invalidArgument, `[SubscriptionController] Invalid subscribe. There are no publishers to subscribe to. Plans: [${plans.map(plan => plan.id)}]`)
        }

        if (publisherIDs.length > 1) {
            throw new TradestoreError(TradestoreErrorCode.invalidArgument, `[SubscriptionController] Invalid subscribe. You can subscribe to plans from the same publisher at the same time. Plans: [${plans.map(plan => plan.id)}]`)
        }

        const publishedBy: string = publisherIDs[0]
        const subscription: Subscription = this._Subscription.init()
        subscription.subscribedBy = subscriber.id
        subscription.publishedBy = publishedBy
        subscription.createdBy = subscriber.id
        plans.forEach(plan => {
            const subscriptionItem: SubscriptionItem = (subscription.items.find(item => item.planReference.path === plan.documentReference.path) || this._SubscriptionItem.init()) as SubscriptionItem
            subscriptionItem.subscribedBy = subscriber.id
            subscriptionItem.publishedBy = plan.publishedBy
            subscriptionItem.createdBy = subscriber.id
            subscriptionItem.planReference = plan.documentReference
            subscriptionItem.productReference = plan.productReference
            subscriptionItem.quantity += 1
            subscription.items.push(subscriptionItem)
        })

        try {
            return await firestore.runTransaction(async (transaction) => {
                const subscriptionResult = await block(subscription, option, transaction)
                transaction.set(subscriber.subscriptions.collectionReference.doc(subscriptionResult.id), subscriptionResult.data())
                plans.forEach(plan => {
                    transaction.set(plan.subscriptions.collectionReference.doc(subscriptionResult.id), subscriptionResult.data())
                })
                return subscriptionResult
            })
        } catch (error) {
            throw error
        }
    }
}