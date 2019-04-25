import { Doc, Field } from '@1amageek/ballcap-admin'
import * as tradable from '../../src/index'
import { } from "reflect-metadata"

export class OrderItem extends Doc implements tradable.OrderItemProtocol {
    @Field order: string = ''
    @Field purchasedBy: string = ''
    @Field selledBy!: string
    @Field createdBy!: string
    @Field type: tradable.OrderItemType = tradable.OrderItemType.sku
    @Field product?: FirebaseFirestore.DocumentReference
    @Field sku?: string
    @Field quantity: number = 0
    @Field currency: tradable.Currency = tradable.Currency.USD
    @Field amount: number = 0
    @Field status: tradable.OrderItemStatus = tradable.OrderItemStatus.none
}