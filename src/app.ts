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
    host: "localhost",
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
    const ret = [];
    for (let i = 1; i <= totalPages; i++) {
        ret.push(i);
    }
    return ret;
}

async function getAllOLXAds(): Promise<Array<AdPrototype>> {
    const pagesArray = await getOLXPages();
    if (pagesArray.length) {
        const single_results = await Promise.all(pagesArray.map((pageNo) => getOLXads(pageNo)));
        let merged_results: Array<AdPrototype> = [];
        for (const i in single_results) {
            merged_results = merged_results.concat(single_results[i]);
        }
        merged_results = merged_results.filter((obj, pos, arr) => arr.map(innerObj => innerObj.Source.uniqueId).indexOf(obj.Source.uniqueId) === pos);
        return merged_results;
    }
    else {
        console.warn("No pages to scrap found on OLX!");
        throw new Error("OLX ERROR!");
    }
}

async function saveAds(ads: Array<Array<AdPrototype>>): Promise<{new: number, changed: number, unchanged: number}> {
    let merged_ads: Array<AdPrototype> = [];
    for (const i in ads) {
        merged_ads = merged_ads.concat(ads[i]);
    }
    const promises: Array<Promise<{new: number, changed: number, unchanged: number}>> = [];
    const now = new Date();
    for (const i in merged_ads) {
        promises.push(new Promise(async(resolve, reject) => {
            const thisAdPrototype = merged_ads[i];
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
        unchanged: 0
    };
    const results = await Promise.all(promises);
    for (let i = 0; i < results.length; i++) {
        total.new +=        results[i].new;
        total.changed +=    results[i].changed;
        total.unchanged +=  results[i].unchanged;
    }
    return total;
}

app.get("/", async (req, res) => {
    try {
        const ret = await getAllOLXAds();
        const result = await saveAds([ret]);
        res.send(result);
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