import { Doc, Field, DocumentReference } from '@1amageek/ballcap-admin'
import { OrderItemProtocol, OrderItemType, Currency, OrderItemStatus } from '../../src/index'
import { } from "reflect-metadata"

export class OrderItem extends Doc implements OrderItemProtocol {
    @Field purchasedBy: string = ''
    @Field selledBy!: string
    @Field createdBy!: string
    @Field type: OrderItemType = OrderItemType.sku
    @Field productReference?: DocumentReference
    @Field skuReference?: DocumentReference
    @Field quantity: number = 0
    @Field currency: Currency = Currency.USD
    @Field amount: number = 0
    @Field status: OrderItemStatus = OrderItemStatus.none
}