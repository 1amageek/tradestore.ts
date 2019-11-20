import { Doc, Field, DocumentReference } from '@1amageek/ballcap-admin'
import {BalanceTransactionProtocol, ShardType, randomShard, DafaultShardCharacters, BalanceTransactionType, Currency, AccountOrDestination, TransactionResult } from '../../src/index'
import {} from "reflect-metadata"

export class BalanceTransaction extends Doc implements BalanceTransactionProtocol {
    @Field shard: ShardType = randomShard(DafaultShardCharacters)
    @Field type: BalanceTransactionType = BalanceTransactionType.payment
    @Field currency: Currency = Currency.USD
    @Field amount: number = 0
    @Field from: AccountOrDestination = ""
    @Field to: AccountOrDestination = ""
    @Field orderReference?: DocumentReference
    @Field transferReference?: DocumentReference
    @Field payoutReference?: DocumentReference
    @Field transactionResults: TransactionResult[] = []
}
