/* eslint-disable @typescript-eslint/no-unused-vars */
import dotenv from "dotenv";
import { Logger } from "./Logger";
import { SimpleImageWriter } from "./SimpleImageWriter";
import { Kache } from "./Kache";
import { SunMoonBuilder } from "./SunMoonBuilder";

async function run() {
    dotenv.config();  // Load var from .env into the environment

    const logger: Logger = new Logger("sunmoon-builder", "verbose");
    //const cache: Kache = new Kache(logger, "sunmoon-cache.json"); 
    const simpleImageWriter: SimpleImageWriter = new SimpleImageWriter(logger, "images");
    const sunmoonBuilder: SunMoonBuilder = new SunMoonBuilder(logger, null, simpleImageWriter);

    const IPGEOLOACATION_API_KEY: string | undefined = process.env.IPGEOLOACATION_API_KEY;

    if (IPGEOLOACATION_API_KEY === undefined) {
        logger.error("No url specified in env IPGEOLOACATION_API_KEYL");
        process.exit(1);
    }
   
    let success = true;
    success = success && await sunmoonBuilder.CreateImages("Onset, MA", "OnsetSunMoon.jpg", "42.4", "-71.6", IPGEOLOACATION_API_KEY);

    // Sunrise before 6AM, sunset after 6PM
    //success = success && await sunmoonBuilder.CreateImages("Onset, MA", "OnsetSunMoon-June.jpg", "42.4", "-71.6", IPGEOLOACATION_API_KEY, "2021-06-21");

    // Sunrise after 6AM and sunset before 6PM, Moon sets in the morning, rises in the afteroon
    //success = success && await sunmoonBuilder.CreateImages("Onset, MA", "OnsetSunMoon-dec.jpg", "42.4", "-71.6", IPGEOLOACATION_API_KEY, "2021-12-21");

    // Sunset before 6PM, twilight after 6PM
    //success = success && await sunmoonBuilder.CreateImages("Onset, MA", "OnsetSunMoon-sep.jpg", "42.4", "-71.6", IPGEOLOACATION_API_KEY, "2021-09-01");

    // Sunrise after 6AM, twilight before 6AM, Moon rises and falls in the same day
    //success = success && await sunmoonBuilder.CreateImages("Onset, MA", "OnsetSunMoon-mar.jpg", "42.4", "-71.6", IPGEOLOACATION_API_KEY, "2021-03-08");

    logger.info(`test.ts: Done: ${success ? "successfully" : "failed"}`); 

    return success ? 0 : 1;
}

run();