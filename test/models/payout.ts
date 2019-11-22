import { Doc, Field } from '@1amageek/ballcap-admin'
import { PayoutProtocol, Currency, PayoutStatus, TransactionResult } from '../../src/index'
import { } from "reflect-metadata"


export class Payout extends Doc implements PayoutProtocol {
    @Field currency: Currency = Currency.JPY
    @Field amount: number = 0
    @Field account: string = ""
    @Field status: PayoutStatus = PayoutStatus.none
    @Field transactionResults: TransactionResult[] = []
    @Field isCancelled: boolean = false
}
