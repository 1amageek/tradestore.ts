import { Doc, Field, Collection, SubCollection } from '@1amageek/ballcap-admin'
import { Tradable, Publishable } from '../../src'
import { Order } from './order'
import { OrderItem } from './orderItem'
import { TradeTransaction } from './tradeTransaction'
import { Item } from './item'
import { } from "reflect-metadata";
import { Subscription, SubscriptionItem } from './subscription'


export class User extends Doc implements Tradable<Order, OrderItem, TradeTransaction, Subscription, SubscriptionItem>, Publishable<User, Subscription, SubscriptionItem> {
    
    @Field isAvailable: boolean = false
    @Field country: string = "JP"

    @SubCollection orders: Collection<Order> = new Collection()
    @SubCollection receivedOrders: Collection<Order> = new Collection()
    @SubCollection items: Collection<Item> = new Collection()
    @SubCollection tradeTransactions: Collection<TradeTransaction> = new Collection()
    @SubCollection subscriptions: Collection<Subscription> = new Collection()
    @SubCollection subscribers: Collection<User> = new Collection()
}