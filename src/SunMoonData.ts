import axios from "axios";
import moment from "moment-timezone";  // https://momentjs.com/timezone/docs/ &  https://momentjs.com/docs/
import { LoggerInterface } from "./Logger";
import { KacheInterface } from "./Kache";

// Data from: https://api.ipgeolocation.io/astronomy?apiKey=API_KEY&lat=42.68&long=-71.47
// Ref: https://ipgeolocation.io/documentation/astronomy-api.html
// {
//     "location": {
//         "latitude": 42.68,
//         "longitude": -71.47
//     },
//     "date": "2021-09-10",
//     "current_time": "08:19:20.199",
//     "sunrise": "06:20",
//     "sunset": "19:04",
//     "sun_status": "-",
//     "solar_noon": "12:42",
//     "day_length": "12:44",
//     "sun_altitude": 20.82457215769772,
//     "sun_distance": 150677414.69466397,
//     "sun_azimuth": 103.33444717743589,
//     "moonrise": "10:22",
//     "moonset": "21:11",
//     "moon_status": "-",
//     "moon_altitude": -21.091342264319017,
//     "moon_distance": 368766.67475332634,
//     "moon_azimuth": 84.55392111689355,
//     "moon_parallactic_angle": -49.51802499156944
// }
export interface SunMoonJson {
    current_time: string;
    date: string;
    sunrise: string;
    sunset: string; 
    solor_noon: string;           
    moonrise: string;
    moonset: string;
    firstLight?: string;
    lastLight?: string;
    lunarAgeDays: number;
    lunarIllumination: string;
    lunarWaxWane: string;
    lunarPhase: string;
    lunarPhase2: string;
}

const MOON_PERIOD_DAYS = 29.53058770576;   // Earth days for one moon cycle
const UNIX_EPOCH = 2440587.5;              // UNIX Epoch in Julian days
const LUNAR_REFERENCE = 2451550.1;
const MSEC_PER_DAY = 24 * 60 * 60 * 1000;
const MIN_PER_DAY = 24 * 60;

export class SunMoonData {
    private logger: LoggerInterface;
    private cache: KacheInterface;

    constructor(logger: LoggerInterface, cache: KacheInterface) {
        this.logger = logger;
        this.cache = cache;
    }    

    /**
     * Get the sun and moon data from cache or a REST GET to api.ipgeolocation.io
     * @param lat lattitude (e.g.: 41.65)
     * @param lon longitude (e.g.: -71.45)
     * @param apiKey Key for https://api.ipgeolocation.io
     * @param timeZone Show for this timeZone
     * @param dateStr Optional.  Used instead of today to find the data, mostly used for testing.  Format is: YYYY-MM-DD
     * @returns SunMoonJson - sun rise/set, moon rise/set, moon illuminaiton, phase, etc.
     */
    public async getSunMoonData(lat: string, lon: string, apiKey: string, timeZone: string, dateStr = ""): Promise<SunMoonJson | null> { 
        let rawJson: SunMoonJson | null = null;
        let dateParam: string;
        let date: Date;
        const now: moment.Moment = moment();


        if (dateStr === "") {
            date = new Date();
            dateParam = now.tz(timeZone).format("YYYY-MM-DD");
        } else {
            dateParam = dateStr;
            date = new Date(dateStr);
        }

        const key = `lat:${lat}-lon:${lon}-date:${dateParam}`;

        const sunMoonJson: SunMoonJson | null = this.cache.get(key) as SunMoonJson;
        if (sunMoonJson !== null) {
            return sunMoonJson;
        }

        const url = `https://api.ipgeolocation.io/astronomy?apiKey=${apiKey}&lat=${lat}&long=${lon}&date=${dateParam}`;

        try {
            const response = await axios.get(url, {headers: {"Content-Encoding": "gzip"}, timeout: 5000});
            rawJson = response.data;

            if (rawJson !== null) {
                rawJson.lunarAgeDays      = this.getMoonAgeDays(date);
                rawJson.lunarIllumination = this.getMoonIllumination(rawJson.lunarAgeDays);
                rawJson.lunarWaxWane      = this.getWaxWane(rawJson.lunarAgeDays);
                rawJson.lunarPhase        = this.getPhaseStr(rawJson.lunarAgeDays);

                const midnightTonight = moment().tz(timeZone).endOf("day");

                this.cache.set(key, rawJson, midnightTonight.valueOf());
            }
        } catch(e) {
            this.logger.error(`SunMoonData: Error getting data: ${e}`);
            this.logger.error(`SunMoon URL: ${url}`);
            rawJson = null;
        }

        return rawJson;
    }

    /**
     * Gets the age of the moon cycle.  New moon is 0.  Full moon is ~14.
     * - Ref: https://stackoverflow.com/questions/11759992/calculating-jdayjulian-day-in-javascript
     * @param date A Javascript Date object
     * @returns the moon cycle age in days (0.0 - 29.0) 
     */
    private getMoonAgeDays(date:  Date): number {
        const julianDate = date.getTime() / MSEC_PER_DAY - date.getTimezoneOffset() / MIN_PER_DAY + UNIX_EPOCH;
        let ageDays = (julianDate - LUNAR_REFERENCE) % MOON_PERIOD_DAYS;
        if (ageDays < 0) ageDays ++; 

        return ageDays;
    }

    /**
     * Get the percentage into the moon cycle
     *   - For days 0 - 14.5, the percentage increases
     *   - For days 14.5 - 29, the percentage decreases
     * @param ageDays age in the cycle 0-29
     * @returns The percentage (e.g.: 17%)
     */
    private getMoonAgePercent(ageDays: number): string {
        const cycleMidpoint = (MOON_PERIOD_DAYS/2);
        let agePercent: number;

        if (ageDays < cycleMidpoint) {
            // How close are we to the midpoint
            agePercent = ageDays/cycleMidpoint * 100;
        } else {
            // In this rage, the age takes us further from the midpoint (full moon)
            agePercent = (MOON_PERIOD_DAYS - ageDays)/MOON_PERIOD_DAYS * 100;
        }
        
        return (`${agePercent.toFixed(0)}%`);
    }
    
    /**
     * Get the illumination percent of the moon
     *   - Illumination is proportional to the cos function.
     *   - The ageDays/MOON_PERIOS_DAYS ranges from 0-1 over one full cycle.  Multiple by 360 degrees
     *   - Cosine ranges from 1 -> 0 -> -1 -> 0 -> 1
     *   - we need to scale by 50 and add 50 to give us a range of 0 - 100 - 0
     * @param ageDays age in the cycle 0-29
     * @returns 
     */
    private getMoonIllumination(ageDays: number): string {
        const illumination = (50 + (50 * Math.cos((ageDays/MOON_PERIOD_DAYS * 360 + 180) * Math.PI/180)));
        
        return (`${illumination.toFixed(0)}%`);
    }

    /**
     * Simple function to return if the moon is waxing or waning
     * @param ageDays age in the cycle 0-29
     * @returns "waxing" or "waning"
     */
    private getWaxWane(ageDays: number): string {
        if (ageDays < MOON_PERIOD_DAYS/2)
            return "waxing";
        else
            return "waning";
    }

    /**
     * Simple function to return the name of the phase of the moon (e.g.: New Moon, Waxing Cresent, ...)
     * @param ageDays age in the cycle 0-29
     * @returns Two word name of the phase of the moon
     */
    private getPhaseStr(ageDays: number): string {
        const phaseLength = MOON_PERIOD_DAYS/16; // 8 phases but new is 0-1.8 and 27.7-29.5 days, so split into 16 parts
        if (ageDays < phaseLength)           return "New Moon";
        else if (ageDays < phaseLength * 3)  return "Waxing Crescent";
        else if (ageDays < phaseLength * 5)  return "First Quarter";
        else if (ageDays < phaseLength * 7)  return "Waxing Gibbous";
        else if (ageDays < phaseLength * 9)  return "Full Moon";
        else if (ageDays < phaseLength * 11) return "Waning Gibbus";
        else if (ageDays < phaseLength * 13) return "Last Quarter";
        else if (ageDays < phaseLength * 15) return "Waning Crescent";
        else                                 return "New Moon";
    }  
}