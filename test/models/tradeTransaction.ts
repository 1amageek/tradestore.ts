import { Doc, Field } from '@1amageek/ballcap-admin'
import * as tradable from '../../src/index'
import { } from "reflect-metadata"

export class TradeTransaction extends Doc implements tradable.TradeTransactionProtocol {
    @Field type: tradable.TradeTransactionType = tradable.TradeTransactionType.unknown
    @Field selledBy: string = ''
    @Field purchasedBy: string = ''
    @Field order: string = ''
    @Field product?: FirebaseFirestore.DocumentReference
    @Field sku: string = ''
    @Field inventoryStock?: string
    @Field item!: FirebaseFirestore.DocumentReference
}
