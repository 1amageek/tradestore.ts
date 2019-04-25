import { Doc, Field, Collection } from '@1amageek/ballcap-admin'
import * as tradable from '../../src/index'
import { } from "reflect-metadata";


export class Item extends Doc implements tradable.ItemProtocol {
    @Field purchasedBy!: string 
    @Field order: string = ''
    @Field selledBy: string = ''
    @Field product?: FirebaseFirestore.DocumentReference
    @Field sku: string = ''
    @Field isCancelled: boolean = false
    @Field inventoryStock?: string
}