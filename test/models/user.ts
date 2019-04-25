import { Doc, Field, Collection } from '@1amageek/ballcap-admin'
import * as tradable from '../../src'
import { Order } from './order'
import { OrderItem } from './orderItem'
import { TradeTransaction } from './tradeTransaction'
import { Item } from './item'
import { } from "reflect-metadata";


export class User extends Doc implements tradable.UserProtocol<Order, OrderItem, TradeTransaction> {
    @Field orders: Collection<Order> = new Collection()
    @Field receivedOrders: Collection<Order> = new Collection()
    @Field items: Collection<Item> = new Collection()
    @Field tradeTransactions: Collection<TradeTransaction> = new Collection()
    @Field isAvailabled: boolean = false
    @Field country: string = "JP"
}