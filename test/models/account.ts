import { Doc, Field, SubCollection, Collection } from '@1amageek/ballcap-admin'
import * as tradable from '../../src/index'
import { BalanceTransaction } from './BalanceTransaction'
import { Payout } from './payout';


export class Account extends Doc implements tradable.AccountProtocol<BalanceTransaction, Payout> {
    
    @Field stripeID?: string
    @Field country: string = ""
    @Field isRejected: boolean = false
    @Field isSigned: boolean = false
    @Field commissionRate: number = 10
    @Field revenue: { [currency: string]: number } = {}
    @Field sales: { [currency: string]: number } = {}
    @Field balance: tradable.Balance = { available: {}, pending: {}}
    @Field accountInformation: { [key: string]: any } = {}

    @SubCollection balanceTransactions: Collection<BalanceTransaction> = new Collection()
    @SubCollection payoutRequests: Collection<Payout> = new Collection()
}
