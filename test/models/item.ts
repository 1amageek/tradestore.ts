import { Doc, Field, DocumentReference } from '@1amageek/ballcap-admin'
import * as tradable from '../../src/index'
import { } from "reflect-metadata";


export class Item extends Doc implements tradable.ItemProtocol {
    @Field purchasedBy!: string 
    @Field order: string = ''
    @Field selledBy: string = ''
    @Field productReference?: DocumentReference
    @Field skuReference!: DocumentReference
    @Field isCancelled: boolean = false
    @Field stockReference?: DocumentReference
}