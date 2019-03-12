import express from "express";
import * as request_callback from "request";
import cheerio from "cheerio";
import { Secrets } from "./secrets";
import { Sequelize } from "sequelize-typescript";
import { Ad } from "./models/Ad";
import { Source } from "./models/Source";
import { Picture } from "./models/Picture";
import { Entry } from "./models/Entry";
import { AdPrototype } from "./AdPrototype";

const app = express();

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

const sequelize =  new Sequelize({
    database: "motoscrapper",
    dialect: "mysql",
    username: "motoscrapper",
    password: Secrets.DATABASE_PASS,
    host: "10.100.10.40",
    logging: false,
    modelPaths: [__dirname + "/models"]
});

sequelize.sync().then(() => {
    app.listen(8080, () => {
        console.log(`Example app listening on port 8080!`);
    });
});

const request = async function (options: request_callback.Options): Promise<string> {
    return new Promise((resolve, reject) => {
        request_callback.default(options, (error: any, response: any, body: any) => {
            if (error) {
                return reject(error);
            }
            return resolve(body);
        });
    });
};

const pagesArray = function (pagesCount: number): Array<number> {
    const ret = [];
    for (let i = 1; i <= pagesCount; i++) {
        ret.push(i);
    }
    return ret;
};
// -v- OLX -v-
function queryOLX(pageNumber: number = 0): Promise<string> {
    const OLX_QUERY_URL: string = "https://www.olx.pl/ajax/search/list/";
    const OLX_QUERY_HEADERS = {
        "User-Agent":   "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36",
        "Cookie":       "PHPSESSID=bm4kgu7cgl7khntgafrs80r9i1; dfp_segment_test=42; dfp_segment_test_v3=68; last_locations=13983-0-0-Pozna%C5%84-Wielkopolskie-poznan; lister_lifecycle=1530193557; mobile_default=desktop; my_city_2=13983_0_75_Pozna%C5%84_0_Wielkopolskie_poznan; search_id_md5=f51a61720dde54ceb1f3af321d1ec170"
    };
    return request({
        uri: OLX_QUERY_URL,
        method: "POST",
        form: {
            "view":                                 "",
            "min_id":                               "",
            "q":                                    "",
            "search[city_id]":                      13983,
            "search[region_id]":                    0,
            "search[district_id]":                  "",
            "search[dist]":                         200,
            "search[filter_float_price:to]":        12000,
            "search[filter_float_enginesize:from]": 400,
            "search[filter_enum_condition][]":      "notdamaged",
            "search[category_id]":                  81,
            "search[order]":                        "filter_float_price:asc",
            "page":                                 pageNumber
        },
        headers: OLX_QUERY_HEADERS
    });
}

async function getOLXads(pageNumber: number = 0): Promise<Array<AdPrototype>> {
    return new Promise(async (resolve, reject) => {
        try {
            const $ = cheerio.load(await queryOLX(pageNumber));
            const ret: Array<AdPrototype> = [];
            $("td.offer").each(async (i, e) => {
                const entry = $(e);
                const thisPic = entry.find("img").attr("src");
                ret.push(new AdPrototype(
                    entry.find("td.title-cell strong").text(),
                    entry.find("td.bottom-cell i[data-icon=\"location-filled\"]").parent().text().trim(),
                    "OLX",
                    entry.find("a.link").attr("href"),
                    "OLX_" + entry.find("table").attr("data-id"),
                    parseFloat(entry.find("p.price").text().replace("zł", "").replace(/ /g, "")),
                    (typeof thisPic !== "undefined" ? [thisPic.replace(";s=261x203", "")] : [])
                ));
            });
            resolve(ret);
        }
        catch (error) {
            reject(error);
        }
    });
}

async function getOLXPages(): Promise<Array<number>> {
    const html = await queryOLX();
    const $ = cheerio.load(html);
    const totalPages = parseInt($("a[data-cy=\"page-link-last\"]").text());
    return pagesArray(totalPages);
}

async function getAllOLXAds(): Promise<{ads: Array<AdPrototype>, time: number}> {
    const OLXstartTimestamp = new Date().getTime();
    const pagesArray = await getOLXPages();
    if (pagesArray.length) {
        const single_results = await Promise.all(pagesArray.map((pageNo) => getOLXads(pageNo)));
        let merged_results: Array<AdPrototype> = [];
        for (const i in single_results) {
            merged_results = merged_results.concat(single_results[i]);
        }
        const no_before_merge = merged_results.length;
        merged_results = merged_results.filter((obj, pos, arr) => arr.map(innerObj => innerObj.Source.uniqueId).indexOf(obj.Source.uniqueId) === pos);
        if (merged_results.length != no_before_merge) {
            console.warn("Removed " + (no_before_merge - merged_results.length) + " duplicates scrapped from OLX!");
        }
        return {ads: merged_results, time: (new Date().getTime() - OLXstartTimestamp)};
    }
    else {
        console.warn("No pages to scrap found on OLX!");
        throw new Error("OLX ERROR!");
    }
}
// -v- OTOMOTO -v-
function queryOTOMOTO(pageNumber: number = 1): Promise<string> {
    const OTOMOTO_QUERY_URL: string = "https://www.otomoto.pl/motocykle-i-quady/poznan/";
    const OTOMOTO_QUERY_HEADERS = {
        "User-Agent":   "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36",
        "Cookie":       "PHPSESSID=q6ftqpkahsj512l9vprtje2c83; mobile_default=desktop; rtbhouse-split=3; ldTd=true; laquesis_ff=; xtvrn=$remove$; __gfp_64b=-TURNEDOFF; cookieBarSeen=true; layerappsSeen=1; ak_bmsc=65A61B078F53DCCA4FBB14DABE52E808685E6495396C00005E3E865C74ED8B49~plos/ZyypbkGgHiyKyGQiTGkld+qCgTuJBmfik8Xz+5UizKrNcwl/ZTJoTFJYZ6SeqnQ+011hxr5Joco4h5CK3pjWqmVQYvkj/CX3pJcrkM3qUcxYr/aRK+ZcAtIr70/JxN46xKYJ3W/5uQG7TadLp66SZ4yHL1zwTLiDMsrbb70EHAsEt7zVUwGbdGpOBqXCkHCXVTgS5mfmIIAYnqd47htGYl4e966j2XmRgb3Kaits=; laquesis=cars-11021@b#cars-9383@a#cars-9384@a#cars-9982@a; lqstatus=1552302863|1696c63a37ax2b07bca1|cars-9383#cars-9384|; last_locations=13983-0-0-Pozna%C5%84-Wielkopolskie-poznan; my_city_2=13983_0_200_Pozna%C5%84_0_Wielkopolskie_poznan; bm_sv=9680DA20343C03AABC814518DA7AD38C~kAq+xll1obone9GJ3KfWjYBXIArCf7etxhe3m3ozxK/3NMV7W+JgNa5amdMH4oQ2MqtdL3P+IIF6hcirQhE4jsKhaPwk1E6R9zfwvvyLjJg7yvKNITj2RbfbE3KYxCe97ibN+lq3Uh/ZpTo++7YFGJgXZ4/CUxZxEwGN9xplu4s=; onap=16957b4b385x30c85c88-3-1696c63a37ax2b07bca1-6-1552303654"
    };
    const queryString = <any>{
        "search[filter_float_price:to]": 12000,
        "search[filter_float_engine_capacity:from]": 400,
        "search[filter_enum_damaged]": 0,
        "search[order]": "filter_float_price:asc",
        "search[dist]": 200,
        "search[country]": ""
    };
    if (pageNumber > 1) {
        queryString.page = pageNumber;
    }
    return request({
        uri: OTOMOTO_QUERY_URL,
        method: "GET",
        qs: queryString,
        headers: OTOMOTO_QUERY_HEADERS
    });
}

async function getOTOMOTOads(pageNumber: number = 1): Promise<Array<AdPrototype>> {
    return new Promise(async (resolve, reject) => {
        try {
            const $ = cheerio.load(await queryOTOMOTO(pageNumber));
            const ret: Array<AdPrototype> = [];
            $("article").each(async (i, e) => {
                const entry = $(e);
                const thisPic = entry.find(".offer-item__photo-link img").attr("data-src");
                ret.push(new AdPrototype(
                    entry.find(".offer-title").text().trim() + " " + entry.find(".offer-item__subtitle").text().trim(),
                    entry.find(".offer-item__location").text().trim().replace(/\s+/, " "),
                    "OTOMOTO",
                    entry.find("a.offer-title__link").attr("href"),
                    "OTOMOTO_" + entry.find("a.offer-title__link").attr("data-ad-id"),
                    parseFloat(entry.find(".offer-price__number").contents().not(entry.find(".offer-price__number").children()).text().trim().replace(/\s/, "")),
                    (typeof thisPic !== "undefined" ? [thisPic.replace(/;s=\d+x\d+/, "")] : [])
                ));
            });
            resolve(ret);
        }
        catch (error) {
            reject(error);
        }
    });
}

async function getOTOMOTOPages(): Promise<Array<number>> {
    const html = await queryOTOMOTO();
    const $ = cheerio.load(html);
    const totalPages = parseInt($("ul.om-pager.rel").find("li").last().prev().find("span").text());
    return pagesArray(totalPages);
}

async function getAllOTOMOTOAds(): Promise<{ads: Array<AdPrototype>, time: number}> {
    const OTOMOTOstartTimestamp = new Date().getTime();
    const pagesArray = await getOTOMOTOPages();
    if (pagesArray.length) {
        const single_results = await Promise.all(pagesArray.map((pageNo) => getOTOMOTOads(pageNo)));
        let merged_results: Array<AdPrototype> = [];
        for (const i in single_results) {
            merged_results = merged_results.concat(single_results[i]);
        }
        const no_before_merge = merged_results.length;
        merged_results = merged_results.filter((obj, pos, arr) => arr.map(innerObj => innerObj.Source.uniqueId).indexOf(obj.Source.uniqueId) === pos);
        if (merged_results.length != no_before_merge) {
            console.warn("Removed " + (no_before_merge - merged_results.length) + " duplicates scrapped from OTOMOTO!");
        }
        return {ads: merged_results, time: (new Date().getTime() - OTOMOTOstartTimestamp)};
    }
    else {
        console.warn("No pages to scrap found on OTOMOTO!");
        throw new Error("OTOMOTO ERROR!");
    }
}

// -v- ALLEGRO -v-
async function queryALLEGRO(pageNumber: number = 1): Promise<any> {
    const ALLEGRO_QUERY_URL: string = "https://allegro.pl/kategoria/motoryzacja-motocykle-i-quady-5557";
    const ALLEGRO_QUERY_HEADERS = {
        "User-Agent":   "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36",
        "Cookie":       "PHPSESSID=q6ftqpkahsj512l9vprtje2c83; mobile_default=desktop; rtbhouse-split=3; ldTd=true; laquesis_ff=; xtvrn=$remove$; __gfp_64b=-TURNEDOFF; cookieBarSeen=true; layerappsSeen=1; ak_bmsc=65A61B078F53DCCA4FBB14DABE52E808685E6495396C00005E3E865C74ED8B49~plos/ZyypbkGgHiyKyGQiTGkld+qCgTuJBmfik8Xz+5UizKrNcwl/ZTJoTFJYZ6SeqnQ+011hxr5Joco4h5CK3pjWqmVQYvkj/CX3pJcrkM3qUcxYr/aRK+ZcAtIr70/JxN46xKYJ3W/5uQG7TadLp66SZ4yHL1zwTLiDMsrbb70EHAsEt7zVUwGbdGpOBqXCkHCXVTgS5mfmIIAYnqd47htGYl4e966j2XmRgb3Kaits=; laquesis=cars-11021@b#cars-9383@a#cars-9384@a#cars-9982@a; lqstatus=1552302863|1696c63a37ax2b07bca1|cars-9383#cars-9384|; last_locations=13983-0-0-Pozna%C5%84-Wielkopolskie-poznan; my_city_2=13983_0_200_Pozna%C5%84_0_Wielkopolskie_poznan; bm_sv=9680DA20343C03AABC814518DA7AD38C~kAq+xll1obone9GJ3KfWjYBXIArCf7etxhe3m3ozxK/3NMV7W+JgNa5amdMH4oQ2MqtdL3P+IIF6hcirQhE4jsKhaPwk1E6R9zfwvvyLjJg7yvKNITj2RbfbE3KYxCe97ibN+lq3Uh/ZpTo++7YFGJgXZ4/CUxZxEwGN9xplu4s=; onap=16957b4b385x30c85c88-3-1696c63a37ax2b07bca1-6-1552303654",
        "Accept":       "application/vnd.opbox-web.v2+json"
    };
    const queryString = <any>{
        "price_to": 12000,
        "uszkodzony": "Nie",
        "order": "p",
        "pojemnosc-silnika-od": 400,
        "state": 15
    };
    if (pageNumber > 1) {
        queryString.p = pageNumber;
    }
    return JSON.parse(await request({
        uri: ALLEGRO_QUERY_URL,
        method: "GET",
        qs: queryString,
        headers: ALLEGRO_QUERY_HEADERS
    }));
}

async function getALLEGROads(pageNumber: number = 1): Promise<Array<AdPrototype>> {
    return new Promise(async (resolve, reject) => {
        try {
            const data = await queryALLEGRO(pageNumber);
            const ret: Array<AdPrototype> = [];
            let entries_to_process: Array<any> = [];
            entries_to_process = entries_to_process.concat(data.dataSources["listing-api-v3:allegro.listing:3.0"].data.items.promoted);
            entries_to_process = entries_to_process.concat(data.dataSources["listing-api-v3:allegro.listing:3.0"].data.items.regular);
            entries_to_process.forEach((item) => {
                const thisPic: Array<string> = [];
                item.images.forEach((img_url: {url: string}) => {
                    thisPic.push(img_url.url);
                });
                ret.push(new AdPrototype(
                    item.name,
                    item.location.city,
                    "ALLEGRO",
                    item.url,
                    "ALLEGRO_" + item.id,
                    parseFloat(item.sellingMode.advertisement.price.amount),
                    thisPic
                ));
            });
            resolve(ret);
        }
        catch (error) {
            reject(error);
        }
    });
}

async function getALLEGROPages(): Promise<Array<number>> {
    const data = await queryALLEGRO();
    const totalPages = Math.ceil(data.dataSources["listing-api-v3:allegro.listing:3.0"].metadata.Pageable.totalCount / data.dataSources["listing-api-v3:allegro.listing:3.0"].metadata.Pageable.pageSize);
    return pagesArray(totalPages);
}

async function getAllALLEGROAds(): Promise<{ads: Array<AdPrototype>, time: number}> {
    const ALLEGROstartTimestamp = new Date().getTime();
    const pagesArray = await getALLEGROPages();
    if (pagesArray.length) {
        const single_results = await Promise.all(pagesArray.map((pageNo) => getALLEGROads(pageNo)));
        let merged_results: Array<AdPrototype> = [];
        for (const i in single_results) {
            merged_results = merged_results.concat(single_results[i]);
        }
        const no_before_merge = merged_results.length;
        merged_results = merged_results.filter((obj, pos, arr) => arr.map(innerObj => innerObj.Source.uniqueId).indexOf(obj.Source.uniqueId) === pos);
        if (merged_results.length != no_before_merge) {
            console.warn("Removed " + (no_before_merge - merged_results.length) + " duplicates scrapped from ALLEGRO!");
        }
        return {ads: merged_results, time: (new Date().getTime() - ALLEGROstartTimestamp)};
    }
    else {
        console.warn("No pages to scrap found on ALLEGRO!");
        throw new Error("ALLEGRO ERROR!");
    }
}

async function saveAds(ads: Array<AdPrototype>): Promise<{new: number, changed: number, unchanged: number, time: number}> {
    const DBstartTimestamp = new Date().getTime();
    const promises: Array<Promise<{new: number, changed: number, unchanged: number}>> = [];
    const now = new Date();
    for (const i in ads) {
        promises.push(new Promise(async(resolve, reject) => {
            const thisAdPrototype = ads[i];
            const prevSource = await Source.findOne({
                where: {
                    uniqueId: thisAdPrototype.Source.uniqueId
                }
            });
            if (!prevSource) {
                // new entry
                const thisAd = await new Ad({
                    title:          thisAdPrototype.Ad.title,
                    locationName:   thisAdPrototype.Ad.locationName
                }).save();
                const thisSource = await new Source({
                    name:           thisAdPrototype.Source.name,
                    url:            thisAdPrototype.Source.url,
                    uniqueId:       thisAdPrototype.Source.uniqueId,
                    adId:           thisAd.id,
                    firstSeen:      now,
                    lastSeen:       now
                }).save();
                for (const i in thisAdPrototype.Pictures) {
                    await new Picture({
                        url:            thisAdPrototype.Pictures[i],
                        adId:           thisAd.id
                    }).save();
                }
                await new Entry({
                    price:          thisAdPrototype.Entry.price,
                    sourceId:       thisSource.id,
                    firstSeen:      now,
                    lastSeen:       now
                }).save();
                resolve({
                    new:        1,
                    changed:    0,
                    unchanged:  0
                });
            }
            else {
                // old entry
                prevSource.lastSeen = now;
                prevSource.save();
                const prevEntry = await Entry.findOne({
                    where: {
                        sourceId:   prevSource.id
                    },
                    order: [["lastSeen", "DESC"]]
                });
                if (!prevEntry || prevEntry.price != thisAdPrototype.Entry.price) {
                    // price changed
                    await new Entry({
                        price:          thisAdPrototype.Entry.price,
                        sourceId:       prevSource.id,
                        firstSeen:      now,
                        lastSeen:       now
                    }).save();
                    resolve({
                        new:        0,
                        changed:    1,
                        unchanged:  0
                    });
                }
                else {
                    // price same
                    prevEntry.lastSeen = now;
                    prevEntry.save();
                    resolve({
                        new:        0,
                        changed:    0,
                        unchanged:  1
                    });
                }
            }
        }));
    }
    const total = {
        new: 0,
        changed: 0,
        unchanged: 0,
        time: -1
    };
    const results = await Promise.all(promises);
    for (let i = 0; i < results.length; i++) {
        total.new +=        results[i].new;
        total.changed +=    results[i].changed;
        total.unchanged +=  results[i].unchanged;
    }
    total.time = new Date().getTime() - DBstartTimestamp;
    return total;
}

async function getAllAds(): Promise<{ads: Array<AdPrototype>, time: {OLX: number, OTOMOTO: number, ALLEGRO: number}}> {
    const scrapped_ads = await Promise.all([
        getAllOLXAds(),
        getAllOTOMOTOAds(),
        getAllALLEGROAds()
    ]);
    return {
        ads: scrapped_ads[0].ads.concat(scrapped_ads[1].ads.concat(scrapped_ads[2].ads)),
        time: {
            OLX:        scrapped_ads[0].time,
            OTOMOTO:    scrapped_ads[1].time,
            ALLEGRO:    scrapped_ads[2].time
        }
    };
}

app.get("/scrap", async (req, res) => {
    try {
        const ads = await getAllAds();
        const result = await saveAds(ads.ads);
        res.send({DB: result, time: ads.time });
    }
    catch (error) {
        console.error(error);
        res.send(error);
    }
});

app.get("/ads", async (req, res) => {
    const ads = await Ad.findAll({
        include: [{
            model: Picture,
            attributes: ["url"]
        }, {
            model: Source,
            include: [{
                model: Entry,
                where: {
                    lastSeen : {
                        $col: "sources.lastSeen"
                    }
                },
                attributes: ["price"]
            }],
            attributes: ["url", "lastSeen"]
        }],
        attributes: {
            exclude: ["location_lat", "location_lng"]
        }
    });
    res.send(ads);
});

export default app;