export class AdPrototype {
    Ad: {
        title: string,
        locationName: string,
    };

    Source: {
        name: string,
        url: string,
        uniqueId: string
    };

    Entry: {
        price: number
    };

    Pictures: Array<string>;

    constructor(
        adTitle: string,
        locationName: string,
        sourceName: string,
        sourceUrl: string,
        sourceUniqueId: string,
        price: number,
        pictureUrls: Array<string>
    ) {
        this.Ad = {
            title: adTitle,
            locationName: locationName
        };
        this.Source = {
            name: sourceName,
            url: sourceUrl,
            uniqueId: sourceUniqueId
        };
        this.Entry = {
            price: price
        };
        this.Pictures = pictureUrls;
    }
}