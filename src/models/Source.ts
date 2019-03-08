import { Table, Column, Model, HasMany, BelongsTo, PrimaryKey, AutoIncrement, ForeignKey, Unique } from "sequelize-typescript";
import { Ad } from "./Ad";
import { Entry } from "./Entry";

@Table
export class Source extends Model<Source> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @Column
    name: string;

    @Column
    url: string;

    @Unique
    @Column
    uniqueId: string;

    @Column
    firstSeen: Date;

    @Column
    lastSeen: Date;

    @ForeignKey(() => Ad)
    @Column
    adId: number;

    @BelongsTo(() => Ad)
    ad: Ad;

    @HasMany(() => Entry)
    entries: Entry[];
}