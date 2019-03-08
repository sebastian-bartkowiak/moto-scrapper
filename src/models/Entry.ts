import { Table, Column, Model, PrimaryKey, AutoIncrement, BelongsTo, ForeignKey } from "sequelize-typescript";
import { Source } from "./Source";

@Table
export class Entry extends Model<Entry> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @Column
    price: number;

    @Column
    firstSeen: Date;

    @Column
    lastSeen: Date;

    @ForeignKey(() => Source)
    @Column
    sourceId: number;

    @BelongsTo(() => Source)
    source: Source;
}