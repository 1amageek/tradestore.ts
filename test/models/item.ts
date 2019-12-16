import { Doc, Field, DocumentReference } from '@1amageek/ballcap-admin'
import { ItemProtocol } from '../../src/index'
import { } from "reflect-metadata"

export class Item extends Doc implements ItemProtocol {
	@Field purchasedBy!: string
	@Field orderReference?: DocumentReference
	@Field subscriptionReference?: DocumentReference
	@Field selledBy: string = ''
	@Field productReference?: DocumentReference
	@Field skuReference?: DocumentReference
	@Field planReference?: DocumentReference
	@Field isCancelled: boolean = false
	@Field stockReference?: DocumentReference
}
