import { Table, Column, Model, HasMany, PrimaryKey, AutoIncrement, Sequelize } from "sequelize-typescript";
import { Source } from "./Source";
import { Picture } from "./Picture";

@Table
export class Ad extends Model<Ad> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @Column
    title: string;

    @HasMany(() => Picture)
    pictures: Picture[];

    @Column
    locationName: string;

    @Column
    location_lat: number;

    @Column
    location_lng: number;

    @HasMany(() => Source)
    sources: Source[];
}