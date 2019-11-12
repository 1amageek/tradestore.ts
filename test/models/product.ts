import { Doc, Field, Collection, SubCollection } from '@1amageek/ballcap-admin'
import { SKU } from './sku'
import { } from "reflect-metadata";

export class Product extends Doc {
    @Field name?: string | undefined;
    @Field caption?: string | undefined;
    @Field selledBy: string = ''
    @Field createdBy: string = ''
    @Field isAvailable: boolean = false
    @Field isPrivated: boolean = false

    @SubCollection SKUs: Collection<SKU> = new Collection()
}