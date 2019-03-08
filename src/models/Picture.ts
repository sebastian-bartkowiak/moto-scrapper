import { Table, Column, Model, BelongsTo, PrimaryKey, AutoIncrement, ForeignKey } from "sequelize-typescript";
import { Ad } from "./Ad";

@Table
export class Picture extends Model<Picture> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @Column
    url: string;

    @ForeignKey(() => Ad)
    @Column
    adId: number;

    @BelongsTo(() => Ad)
    ad: Ad;
}