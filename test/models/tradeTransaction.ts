import { Doc, Field, DocumentReference } from '@1amageek/ballcap-admin'
import * as tradable from '../../src/index'
import { } from "reflect-metadata"

export class TradeTransaction extends Doc implements tradable.TradeTransactionProtocol {
    @Field type: tradable.TradeTransactionType = tradable.TradeTransactionType.unknown
    @Field selledBy: string = ''
    @Field purchasedBy: string = ''
    @Field order: string = ''
    @Field productReference?: DocumentReference
    @Field skuRefernece!: DocumentReference
    @Field stockReference?: DocumentReference
    @Field itemReference!: DocumentReference
}
