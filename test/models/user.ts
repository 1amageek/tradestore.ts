import { Doc, Field, Collection, SubCollection } from '@1amageek/ballcap-admin'
import * as tradable from '../../src'
import { Order } from './order'
import { OrderItem } from './orderItem'
import { TradeTransaction } from './tradeTransaction'
import { Item } from './item'
import { } from "reflect-metadata";


export class User extends Doc implements tradable.UserProtocol<Order, OrderItem, TradeTransaction> {

    @Field isAvailable: boolean = false
    @Field country: string = "JP"

    @SubCollection orders: Collection<Order> = new Collection()
    @SubCollection receivedOrders: Collection<Order> = new Collection()
    @SubCollection items: Collection<Item> = new Collection()
    @SubCollection tradeTransactions: Collection<TradeTransaction> = new Collection()
}