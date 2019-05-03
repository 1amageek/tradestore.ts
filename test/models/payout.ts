import { Doc, Field } from '@1amageek/ballcap-admin'
import * as tradable from '../../src/index'
import { } from "reflect-metadata"


export class Payout extends Doc implements tradable.PayoutProtocol {
    @Field currency: tradable.Currency = tradable.Currency.JPY
    @Field amount: number = 0
    @Field account: string = ""
    @Field status: tradable.PayoutStatus = tradable.PayoutStatus.none
    @Field transactionResults: tradable.TransactionResult[] = []
    @Field isCancelled: boolean = false
}
