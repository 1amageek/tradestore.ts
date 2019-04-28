import { Doc, Field, Timestamp, File } from '@1amageek/ballcap-admin'
import * as tradable from '../../src/index'
import { OrderItem } from './orderItem'
import { } from "reflect-metadata"

export class Order extends Doc implements tradable.OrderProtocol<OrderItem> {
    @Field title?: string
    @Field assets: File[] = []
    @Field cancelableDate?: Timestamp
    @Field parentID?: string
    @Field purchasedBy!: string
    @Field selledBy!: string
    @Field shippingTo!: { [key: string]: string }
    @Field transferredTo!: { [key: string]: true }
    @Field paidAt?: Timestamp
    @Field expirationDate?: Timestamp
    @Field currency: tradable.Currency = tradable.Currency.JPY
    @Field amount: number = 0
    @Field items: OrderItem[] = []
    @Field paymentStatus: tradable.OrderPaymentStatus = tradable.OrderPaymentStatus.none
    @Field transferStatus: tradable.OrderTransferStatus = tradable.OrderTransferStatus.none
    @Field transactionResults: tradable.TransactionResult[] = []
    @Field isCancelled: boolean = false
}