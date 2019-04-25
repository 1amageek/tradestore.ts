import { Doc, Field } from '@1amageek/ballcap-admin'
import * as tradable from '../../src/index'
import {} from "reflect-metadata"

export class BalanceTransaction extends Doc implements tradable.BalanceTransactionProtocol {
    @Field type: tradable.BalanceTransactionType = tradable.BalanceTransactionType.payment
    @Field currency: tradable.Currency = tradable.Currency.USD
    @Field amount: number = 0
    @Field from: tradable.AccountOrDestination = ""
    @Field to: tradable.AccountOrDestination = ""
    @Field order?: string | undefined
    @Field transfer?: string | undefined
    @Field payout?: string | undefined
    @Field transactionResults: tradable.TransactionResult[] = []
}
