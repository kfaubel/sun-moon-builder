import axios from "axios";
import { LoggerInterface } from "./Logger";

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
}

export class SunMoonData {
    private logger: LoggerInterface;

    constructor(logger: LoggerInterface) {
        this.logger = logger;
    }    

    // Date is optional and used mostly for testing.  Format is: YYYY-MM-DD
    public async getSunMoonData(lat: string, lon: string, apiKey: string, dateStr = ""): Promise<SunMoonJson | null> { 
        let rawJson: SunMoonJson | null = null;

        const dateParam = (dateStr !=="") ? `&date=${dateStr}` : "";

        const url = `https://api.ipgeolocation.io/astronomy?apiKey=${apiKey}&lat=${lat}&long=${lon}${dateParam}`;
        this.logger.info(`URL: ${url}`);

        try {
            const response = await axios.get(url, {headers: {"Content-Encoding": "gzip"}});
            rawJson = response.data;
        } catch(e) {
            this.logger.error(`SunMoonData: Error getting data: ${e}`);
            rawJson = null;
        }

        return rawJson;
    }
}