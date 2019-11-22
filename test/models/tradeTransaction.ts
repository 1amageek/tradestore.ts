import { Doc, Field, DocumentReference } from '@1amageek/ballcap-admin'
import { TradeTransactionProtocol, TradeTransactionType, randomShard, ShardType, DafaultShardCharacters } from '../../src/index'
import { } from "reflect-metadata"

export class TradeTransaction extends Doc implements TradeTransactionProtocol {
    @Field shard: ShardType = randomShard(DafaultShardCharacters)
    @Field type: TradeTransactionType = TradeTransactionType.unknown
    @Field selledBy: string = ''
    @Field purchasedBy: string = ''
    @Field orderReference!: DocumentReference
    @Field productReference?: DocumentReference
    @Field skuRefernece!: DocumentReference
    @Field stockReference?: DocumentReference
    @Field itemReference!: DocumentReference
}
