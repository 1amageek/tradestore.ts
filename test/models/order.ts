import { Doc, Field, Timestamp, File, DocumentReference } from '@1amageek/ballcap-admin'
import { OrderProtocol, ShardType, randomShard, DafaultShardCharacters, Currency, OrderPaymentStatus, OrderTransferStatus, TransactionResult, DeliveryStatus } from '../../src/index'
import { OrderItem } from './orderItem'
import { } from "reflect-metadata"

export class Order extends Doc implements OrderProtocol<OrderItem> {
    @Field shard: ShardType = randomShard(DafaultShardCharacters)
    @Field title?: string
    @Field assets: File[] = []
    @Field cancelableDate?: Timestamp
    @Field parentID?: string
    @Field purchasedBy!: string
    @Field selledBy!: string
    @Field shippingTo!: { [key: string]: string }
    @Field transferredTo: DocumentReference[] = []
    @Field paidAt?: Timestamp
    @Field expirationDate?: Timestamp
    @Field currency: Currency = Currency.JPY
    @Field amount: number = 0
    @Field items: OrderItem[] = []
    @Field deliveryStatus: DeliveryStatus = DeliveryStatus.none
    @Field paymentStatus: OrderPaymentStatus = OrderPaymentStatus.none
    @Field transferStatus: OrderTransferStatus = OrderTransferStatus.none
    @Field transactionResults: TransactionResult[] = []
    @Field isCancelled: boolean = false
}