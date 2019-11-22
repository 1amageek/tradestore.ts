import { Doc, Field, Collection, SubCollection } from '@1amageek/ballcap-admin'
import { PlanProtocol, Currency, TiersMode, Tier, Interval } from '../../src'
import { Subscription, SubscriptionItem } from './subscription'
import { } from "reflect-metadata";

export class Plan extends Doc implements PlanProtocol<Subscription, SubscriptionItem> {
	@Field publishedBy!: string
	@Field createdBy!: string
	@Field productReference?: FirebaseFirestore.DocumentReference
	@Field currency: Currency = Currency.JPY
	@Field amount: number = 0
	@Field interval: Interval = Interval.month
	@Field intervalCount: number = 1
	@Field tiers?: Tier[]
	@Field tiersMode?: TiersMode
	@Field trialPeriodDays?: FirebaseFirestore.Timestamp
	@Field isAvailable: boolean = true
	@Field metadata?: any
	@SubCollection subscriptions: Collection<Subscription> = new Collection()
}