import { Doc, Model, Field, FieldValue, Timestamp, DocumentReference } from '@1amageek/ballcap-admin'
import { ShardType, DafaultShardCharacters, randomShard, SubscriptionProtocol, SubscriptionItemProtocol, Period, Interval, SubscriptionStatus, SubscriptionResult, Currency } from '../../src'
import { } from "reflect-metadata";

export class SubscriptionItem extends Model implements SubscriptionItemProtocol {
	@Field subscribedBy!: string	
	@Field publishedBy!: string
	@Field createdBy!: string
	@Field productReference?: DocumentReference
	@Field planReference!: DocumentReference
	@Field quantity: number = 0
	@Field taxRates: number = 0
	@Field amount: number = 0
	@Field currency: Currency = Currency.JPY
}

export class Subscription extends Doc implements SubscriptionProtocol<SubscriptionItem> {
	@Field shard: ShardType = randomShard(DafaultShardCharacters)
	@Field subscribedBy!: string
	@Field publishedBy!: string
	@Field createdBy!: string
	@Field interval: Interval = Interval.month
	@Field intervalCount: number = 1
	@Field startAt: Timestamp = FieldValue.serverTimestamp()
	@Field canceledAt?: Timestamp 
	@Field cancelAtPeriodEnd: boolean = false
	@Field endedAt?: Timestamp
	@Field items: SubscriptionItem[] = []
	@Field status: SubscriptionStatus = SubscriptionStatus.incomplete
	@Field trial?: Period
	@Field result?: SubscriptionResult
}